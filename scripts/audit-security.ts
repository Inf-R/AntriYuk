import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

interface TableRlsCheckResult {
  table: string;
  rlsEnabledInSchema: boolean;
  anonSelectBlockedLive: boolean;
  anonWriteBlockedLive: boolean;
  anonError: string | null;
  passed: boolean;
}

interface AnonRpcCheckResult {
  rpcName: string;
  revokedFromAnonInSchema: boolean;
  anonCallRejectedLive: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  passed: boolean;
}

interface ClientCodeCheckResult {
  noServiceRoleInClient: boolean;
  noRawConsoleLogInScreensOrHooks: boolean;
  passed: boolean;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }

  return parsed;
}

function createUnauthenticatedAnonClient(
  supabaseUrl: string,
  anonKey: string
): SupabaseClient<Database> {
  const memoryStorage = new Map<string, string>();
  return createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value);
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key);
        },
      },
    },
  });
}

function collectFilesRecursively(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const results: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function runSecurityAudit(): Promise<void> {
  console.log(
    '[Audit Keamanan] Memulai pemeriksaan seluruh tabel di schema public (wajib RLS) dan penolakan seluruh RPC untuk pemanggil tanpa login (anon)...'
  );

  const rootDir = process.cwd();
  const appEnv = parseEnvFile(path.resolve(rootDir, '.env'));

  const supabaseUrl =
    appEnv['EXPO_PUBLIC_SUPABASE_URL'] ??
    process.env['EXPO_PUBLIC_SUPABASE_URL'] ??
    '';
  const supabaseAnonKey =
    appEnv['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ??
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ??
    '';

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('project-ref-anda')
  ) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY di .env wajib terisi untuk menjalankan audit keamanan.'
    );
  }

  // 1. Baca seluruh file migrasi SQL untuk menemukan semua tabel di schema public
  const migrationsDir = path.resolve(rootDir, 'supabase', 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const combinedSql = migrationFiles
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))
    .join('\n');

  const discoveredTables = new Set<string>();
  const createTableRegex =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi;
  let tableMatch: RegExpExecArray | null = null;
  while ((tableMatch = createTableRegex.exec(combinedSql)) !== null) {
    if (tableMatch[1]) {
      discoveredTables.add(tableMatch[1].toLowerCase());
    }
  }

  const expectedTables: (keyof Database['public']['Tables'])[] = [
    'profiles',
    'businesses',
    'queue_sessions',
    'tickets',
    'push_tokens',
  ];
  for (const t of expectedTables) {
    discoveredTables.add(t);
  }

  const unauthClient = createUnauthenticatedAnonClient(
    supabaseUrl,
    supabaseAnonKey
  );
  const dummyUuid = '00000000-0000-0000-0000-000000000000';

  // 2. Periksa setiap tabel di schema public: tabel tanpa RLS dianggap gagal!
  const tableResults: TableRlsCheckResult[] = [];
  for (const tableName of Array.from(discoveredTables)) {
    const rlsRegex = new RegExp(
      `alter\\s+table\\s+public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security`,
      'i'
    );
    const rlsEnabledInSchema = rlsRegex.test(combinedSql);

    // Uji coba SELECT tanpa login (anon) pada tabel
    const { data: selectData, error: selectErr } = await unauthClient
      .from(tableName as keyof Database['public']['Tables'])
      .select('*')
      .limit(1);

    const anonSelectBlockedLive =
      selectErr !== null || (Array.isArray(selectData) && selectData.length === 0);

    // Uji coba INSERT & DELETE tanpa login (anon) pada tabel
    const { error: insertErr } = await unauthClient
      .from(tableName as keyof Database['public']['Tables'])
      .insert({ id: dummyUuid } as never);

    const { error: deleteErr } = await unauthClient
      .from(tableName as keyof Database['public']['Tables'])
      .delete()
      .eq('id', dummyUuid);

    const anonWriteBlockedLive = insertErr !== null && deleteErr !== null;
    const passed =
      rlsEnabledInSchema && anonSelectBlockedLive && anonWriteBlockedLive;

    tableResults.push({
      table: `public.${tableName}`,
      rlsEnabledInSchema,
      anonSelectBlockedLive,
      anonWriteBlockedLive,
      anonError: selectErr?.message ?? insertErr?.message ?? null,
      passed,
    });
  }

  // 3. Periksa bahwa pemanggil tanpa login (anon) TIDAK BISA memanggil satu pun RPC di schema public
  const hasSchemaLevelFunctionRevoke =
    /revoke\s+execute\s+on\s+all\s+functions\s+in\s+schema\s+public\s+from\s+public\s*,\s*anon/i.test(
      combinedSql
    );

  const rpcCalls: {
    name: keyof Database['public']['Functions'];
    invoke: () => Promise<{ error: { code?: string; message: string } | null }>;
  }[] = [
    {
      name: 'open_queue',
      invoke: async () =>
        await unauthClient.rpc('open_queue', { p_business_id: dummyUuid }),
    },
    {
      name: 'close_queue',
      invoke: async () =>
        await unauthClient.rpc('close_queue', { p_business_id: dummyUuid }),
    },
    {
      name: 'take_ticket',
      invoke: async () =>
        await unauthClient.rpc('take_ticket', { p_business_id: dummyUuid }),
    },
    {
      name: 'cancel_ticket',
      invoke: async () =>
        await unauthClient.rpc('cancel_ticket', { p_ticket_id: dummyUuid }),
    },
    {
      name: 'defer_ticket',
      invoke: async () =>
        await unauthClient.rpc('defer_ticket', { p_ticket_id: dummyUuid }),
    },
    {
      name: 'call_next',
      invoke: async () =>
        await unauthClient.rpc('call_next', {
          p_business_id: dummyUuid,
          p_previous: 'done',
        }),
    },
    {
      name: 'mark_no_show',
      invoke: async () =>
        await unauthClient.rpc('mark_no_show', { p_ticket_id: dummyUuid }),
    },
    {
      name: 'finish_ticket',
      invoke: async () =>
        await unauthClient.rpc('finish_ticket', { p_ticket_id: dummyUuid }),
    },
    {
      name: 'my_position',
      invoke: async () =>
        await unauthClient.rpc('my_position', { p_ticket_id: dummyUuid }),
    },
    {
      name: 'owner_queue',
      invoke: async () =>
        await unauthClient.rpc('owner_queue', { p_business_id: dummyUuid }),
    },
    {
      name: 'owner_summary',
      invoke: async () =>
        await unauthClient.rpc('owner_summary', {
          p_business_id: dummyUuid,
          p_date: '2026-11-11',
        }),
    },
    {
      name: 'register_push_token',
      invoke: async () =>
        await unauthClient.rpc('register_push_token', {
          p_token: 'ExponentPushToken[audit-test-token]',
        }),
    },
    {
      name: 'unregister_push_token',
      invoke: async () =>
        await unauthClient.rpc('unregister_push_token', {
          p_token: 'ExponentPushToken[audit-test-token]',
        }),
    },
    {
      name: 'delete_my_account',
      invoke: async () => await unauthClient.rpc('delete_my_account'),
    },
  ];

  const rpcResults: AnonRpcCheckResult[] = [];
  for (const rpc of rpcCalls) {
    const grantToAnonRegex = new RegExp(
      `grant\\s+execute\\s+on\\s+function\\s+public\\.${rpc.name}\\b[^;]*to\\s+[^;]*\\banon\\b`,
      'i'
    );
    const revokedFromAnonInSchema =
      hasSchemaLevelFunctionRevoke && !grantToAnonRegex.test(combinedSql);

    const { error } = await rpc.invoke();
    const anonCallRejectedLive = error !== null;
    const passed = revokedFromAnonInSchema && anonCallRejectedLive;

    rpcResults.push({
      rpcName: `public.${rpc.name}`,
      revokedFromAnonInSchema,
      anonCallRejectedLive,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      passed,
    });
  }

  // 4. Periksa kode klien (app/ dan src/) dari service_role dan console.log mentah
  const clientFiles = [
    ...collectFilesRecursively(path.resolve(rootDir, 'app')),
    ...collectFilesRecursively(path.resolve(rootDir, 'src')),
  ];

  let serviceRoleViolations = 0;
  let rawConsoleLogViolations = 0;

  for (const filePath of clientFiles) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');

    if (
      !normalizedPath.endsWith('src/lib/logger.ts') &&
      /SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(content)
    ) {
      serviceRoleViolations += 1;
    }

    if (
      !normalizedPath.endsWith('src/lib/logger.ts') &&
      /\bconsole\.(log|info|debug|warn|error)\s*\(/.test(content)
    ) {
      rawConsoleLogViolations += 1;
    }
  }

  const clientCodeCheck: ClientCodeCheckResult = {
    noServiceRoleInClient: serviceRoleViolations === 0,
    noRawConsoleLogInScreensOrHooks: rawConsoleLogViolations === 0,
    passed: serviceRoleViolations === 0 && rawConsoleLogViolations === 0,
  };

  for (const t of tableResults) {
    console.log(
      `[Audit Tabel] ${t.table}: ${
        t.passed ? 'LULUS' : 'GAGAL'
      } (RLS=${t.rlsEnabledInSchema}, AnonSelectBlocked=${
        t.anonSelectBlockedLive
      }, AnonWriteBlocked=${t.anonWriteBlockedLive})`
    );
  }

  for (const r of rpcResults) {
    console.log(
      `[Audit RPC Anon] ${r.rpcName}: ${
        r.passed ? 'LULUS (Ditolak)' : 'GAGAL (Bocor)'
      } — [${r.errorCode ?? 'ERROR'}] ${r.errorMessage ?? 'Ditolak'}`
    );
  }

  console.log(
    `[Audit Kode Klien] Tanpa service_role=${clientCodeCheck.noServiceRoleInClient}, Tanpa console.log mentah=${clientCodeCheck.noRawConsoleLogInScreensOrHooks}`
  );

  const allPassed =
    tableResults.every((t) => t.passed) &&
    rpcResults.every((r) => r.passed) &&
    clientCodeCheck.passed;

  console.log(
    `[Audit Keamanan] Status akhir: ${
      allPassed
        ? 'SEMUA LULUS (5/5 tabel ber-RLS, 14/14 RPC ditolak untuk anon)'
        : 'ADA TEMUAN GAGAL'
    }`
  );

  if (!allPassed) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err: unknown) => {
  const message =
    err instanceof Error
      ? err.message
      : 'Terjadi kesalahan saat menjalankan audit keamanan.';
  console.error(`[Audit Keamanan Gagal] ${message}`);
  process.exit(1);
});
