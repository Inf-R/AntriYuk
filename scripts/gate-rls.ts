import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

interface GateTestStepResult {
  step: number;
  name: string;
  actor: 'owner & customer_a' | 'customer_b' | 'customer_a' | 'unauthenticated';
  expected: string;
  actual: string;
  errorCode: string | null;
  passed: boolean;
}

interface GateRlsReport {
  gate: 'RLS & Privilege Verification (Anon Key Only)';
  executedAt: string;
  usedClientKeyType: 'anon';
  allPassed: boolean;
  steps: GateTestStepResult[];
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

function createIsolatedAnonClient(
  supabaseUrl: string,
  anonKey: string
): SupabaseClient<Database> {
  const memoryStorage = new Map<string, string>();
  return createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: true,
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

async function runGateRls(): Promise<void> {
  console.log('[Gate RLS] Memulai pengujian kelayakan RLS menggunakan anon key...');

  const rootDir = process.cwd();
  const appEnv = parseEnvFile(path.resolve(rootDir, '.env'));
  const scriptEnv = parseEnvFile(path.resolve(rootDir, '.env.scripts'));

  const supabaseUrl =
    appEnv['EXPO_PUBLIC_SUPABASE_URL'] ?? process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
  const supabaseAnonKey =
    appEnv['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('project-ref-anda')) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY di file .env harus terisi.'
    );
  }

  const ownerEmail = scriptEnv['SEED_OWNER_EMAIL'] ?? 'pemilik.dev@antriyuk.test';
  const customerAEmail = scriptEnv['SEED_CUSTOMER_EMAIL'] ?? 'pelanggan.dev@antriyuk.test';
  const customerBEmail = scriptEnv['SEED_CUSTOMER_2_EMAIL'] ?? 'pelanggan2.dev@antriyuk.test';
  const password = scriptEnv['SEED_DEFAULT_PASSWORD'] ?? 'PasswordDev123!';

  const ownerClient = createIsolatedAnonClient(supabaseUrl, supabaseAnonKey);
  const customerAClient = createIsolatedAnonClient(supabaseUrl, supabaseAnonKey);
  const customerBClient = createIsolatedAnonClient(supabaseUrl, supabaseAnonKey);
  const unauthClient = createIsolatedAnonClient(supabaseUrl, supabaseAnonKey);

  // Login sebagai Pemilik, Pelanggan A, dan Pelanggan B memakai anon key
  const { data: ownerAuth, error: ownerLoginErr } = await ownerClient.auth.signInWithPassword({
    email: ownerEmail,
    password,
  });
  if (ownerLoginErr || !ownerAuth.user) {
    throw new Error(
      `Gagal login sebagai pemilik uji (${ownerLoginErr?.code ?? 'AUTH_ERROR'}). Jalankan npm run seed:dev terlebih dahulu.`
    );
  }

  const { data: custAAuth, error: custALoginErr } = await customerAClient.auth.signInWithPassword({
    email: customerAEmail,
    password,
  });
  if (custALoginErr || !custAAuth.user) {
    throw new Error(
      `Gagal login sebagai Pelanggan A (${custALoginErr?.code ?? 'AUTH_ERROR'}). Jalankan npm run seed:dev terlebih dahulu.`
    );
  }

  const { data: custBAuth, error: custBLoginErr } = await customerBClient.auth.signInWithPassword({
    email: customerBEmail,
    password,
  });
  if (custBLoginErr || !custBAuth.user) {
    throw new Error(
      `Gagal login sebagai Pelanggan B (${custBLoginErr?.code ?? 'AUTH_ERROR'}). Jalankan npm run seed:dev terlebih dahulu.`
    );
  }

  // Ambil usaha milik Pemilik
  const { data: ownerBusiness, error: bizErr } = await ownerClient
    .from('businesses')
    .select('id')
    .eq('owner_id', ownerAuth.user.id)
    .limit(1)
    .single();

  if (bizErr || !ownerBusiness) {
    throw new Error(`Usaha milik akun pemilik uji tidak ditemukan (${bizErr?.code ?? 'NOT_FOUND'}).`);
  }

  const businessId = ownerBusiness.id;
  const steps: GateTestStepResult[] = [];

  // =========================================================================
  // PERCOBAAN 1: Pemilik membuka antrean (open_queue) & Pelanggan A mengambil nomor (take_ticket)
  // =========================================================================
  const { data: openedSession, error: openErr } = await ownerClient.rpc('open_queue', {
    p_business_id: businessId,
  });

  if (openErr || !openedSession) {
    throw new Error(`Gagal membuka antrean pada langkah 1 (${openErr?.message ?? 'RPC_ERROR'}).`);
  }

  // Bersihkan tiket aktif Pelanggan A bila masih tersisa dari pengujian sebelumnya agar skrip idempoten
  const { data: existingActiveTickets } = await customerAClient
    .from('tickets')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('customer_id', custAAuth.user.id)
    .in('status', ['waiting', 'called']);

  if (existingActiveTickets && existingActiveTickets.length > 0) {
    for (const activeTicket of existingActiveTickets) {
      if (activeTicket.status === 'waiting') {
        await customerAClient.rpc('cancel_ticket', { p_ticket_id: activeTicket.id });
      } else if (activeTicket.status === 'called') {
        await ownerClient.rpc('finish_ticket', { p_ticket_id: activeTicket.id });
      }
    }
  }

  const { data: ticketA, error: takeErr } = await customerAClient.rpc('take_ticket', {
    p_business_id: businessId,
  });

  const step1Passed =
    !openErr &&
    !takeErr &&
    openedSession.status === 'open' &&
    ticketA !== null &&
    ticketA.status === 'waiting' &&
    ticketA.number >= 1;

  steps.push({
    step: 1,
    name: 'Pemilik membuka antrean (open_queue) dan Pelanggan A mengambil nomor (take_ticket)',
    actor: 'owner & customer_a',
    expected: 'Sesi berstatus open dan tiket baru berstatus waiting berhasil dibuat',
    actual: step1Passed
      ? `Sesi status=${openedSession.status}, tiket nomor=${ticketA.number} status=${ticketA.status}`
      : `Gagal: ${takeErr?.message ?? 'Data tidak sesuai'}`,
    errorCode: takeErr?.code ?? null,
    passed: step1Passed,
  });

  if (!ticketA) {
    throw new Error('Tiket A gagal dibuat, pengujian langkah berikutnya dihentikan.');
  }

  // =========================================================================
  // PERCOBAAN 2: Pelanggan B mencoba membaca tiket A lewat from('tickets').select()
  // =========================================================================
  const { data: bReadTickets, error: bReadErr } = await customerBClient
    .from('tickets')
    .select('id, number, status')
    .eq('id', ticketA.id);

  const bReadCount = bReadTickets ? bReadTickets.length : 0;
  const step2Passed = bReadErr === null && bReadCount === 0;

  steps.push({
    step: 2,
    name: "Pelanggan B mencoba membaca tiket A lewat from('tickets').select()",
    actor: 'customer_b',
    expected: 'Hasil kosong (0 baris dikembalikan karena difilter policy RLS)',
    actual: `Dikembalikan ${bReadCount} baris`,
    errorCode: bReadErr?.code ?? null,
    passed: step2Passed,
  });

  // =========================================================================
  // PERCOBAAN 3: Pelanggan B mencoba update status tiket A secara langsung
  // =========================================================================
  const { error: bUpdateErr } = await customerBClient
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('id', ticketA.id);

  const step3Passed = bUpdateErr !== null;

  steps.push({
    step: 3,
    name: 'Pelanggan B mencoba update status tiket A secara langsung di tabel tickets',
    actor: 'customer_b',
    expected: 'Ditolak oleh database (permission denied / RLS policy violation)',
    actual: bUpdateErr
      ? `Ditolak: ${bUpdateErr.message}`
      : 'Tidak ditolak (update langsung berhasil tanpa error)',
    errorCode: bUpdateErr?.code ?? null,
    passed: step3Passed,
  });

  // =========================================================================
  // PERCOBAAN 4: Pelanggan A mencoba mengubah role-nya sendiri di profiles
  // =========================================================================
  const { error: aRoleUpdateErr } = await customerAClient
    .from('profiles')
    .update({ role: 'owner' })
    .eq('id', custAAuth.user.id);

  const step4Passed = aRoleUpdateErr !== null;

  steps.push({
    step: 4,
    name: 'Pelanggan A mencoba mengubah kolom role miliknya sendiri menjadi owner di profiles',
    actor: 'customer_a',
    expected: 'Ditolak oleh database (column-level privilege: hanya display_name yang diizinkan)',
    actual: aRoleUpdateErr
      ? `Ditolak: ${aRoleUpdateErr.message}`
      : 'Tidak ditolak (role berhasil diubah)',
    errorCode: aRoleUpdateErr?.code ?? null,
    passed: step4Passed,
  });

  // =========================================================================
  // PERCOBAAN 5: Akun tanpa login mencoba memanggil take_ticket
  // =========================================================================
  const { error: unauthTakeErr } = await unauthClient.rpc('take_ticket', {
    p_business_id: businessId,
  });

  const step5Passed = unauthTakeErr !== null;

  steps.push({
    step: 5,
    name: 'Akun tanpa login (anon) mencoba memanggil RPC take_ticket',
    actor: 'unauthenticated',
    expected: 'Ditolak oleh database (permission denied for function take_ticket / UNAUTHENTICATED)',
    actual: unauthTakeErr
      ? `Ditolak: ${unauthTakeErr.message}`
      : 'Tidak ditolak (anon berhasil memanggil take_ticket)',
    errorCode: unauthTakeErr?.code ?? null,
    passed: step5Passed,
  });

  // Bersihkan sesi login di memori
  await ownerClient.auth.signOut();
  await customerAClient.auth.signOut();
  await customerBClient.auth.signOut();

  const report: GateRlsReport = {
    gate: 'RLS & Privilege Verification (Anon Key Only)',
    executedAt: new Date().toISOString(),
    usedClientKeyType: 'anon',
    allPassed: steps.every((s) => s.passed),
    steps,
  };

  const outDir = path.resolve(rootDir, 'docs', 'bukti');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.resolve(outDir, 'gate-rls.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  for (const s of steps) {
    console.log(`[Gate RLS] Percobaan ${s.step}: ${s.passed ? 'LULUS' : 'GAGAL'} — ${s.name}`);
  }
  console.log(`[Gate RLS] Laporan bukti disimpan di docs/bukti/gate-rls.json (allPassed=${report.allPassed}).`);

  if (!report.allPassed) {
    process.exit(1);
  }
}

runGateRls().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menjalankan gate-rls.';
  console.error(`[Gate RLS Gagal] ${msg}`);
  process.exit(1);
});

