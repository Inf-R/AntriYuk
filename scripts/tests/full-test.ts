import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProfileRole } from '../../src/types/database';

interface TestCaseResult {
  id: string;
  title: string;
  mappedStories: string[];
  passed: boolean;
  evidence: string;
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

function getWibDateString(offsetDays = 0): string {
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const dayMs = offsetDays * 24 * 60 * 60 * 1000;
  const target = new Date(Date.now() + wibOffsetMs + dayMs);
  return target.toISOString().slice(0, 10);
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

async function ensureTestUser(
  adminClient: SupabaseClient<Database>,
  existingUsersByEmail: Map<string, string>,
  email: string,
  password: string,
  role: ProfileRole,
  displayName: string
): Promise<string> {
  const normalizedEmail = email.toLowerCase();
  const cachedId = existingUsersByEmail.get(normalizedEmail);

  if (cachedId) {
    await adminClient.from('profiles').upsert({
      id: cachedId,
      display_name: displayName,
      role,
    });
    return cachedId;
  }

  const { data: created, error: createErr } =
    await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        display_name: displayName,
      },
    });

  if (createErr || !created.user) {
    throw new Error(
      `Gagal menyiapkan akun uji ${normalizedEmail}: ${
        createErr?.message ?? 'UNKNOWN'
      }`
    );
  }

  existingUsersByEmail.set(normalizedEmail, created.user.id);
  await adminClient.from('profiles').upsert({
    id: created.user.id,
    display_name: displayName,
    role,
  });

  return created.user.id;
}

async function loginAnonClient(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<{ client: SupabaseClient<Database>; userId: string }> {
  const client = createIsolatedAnonClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    throw new Error(
      `Gagal login akun uji (${error?.code ?? 'AUTH_ERR'}): ${
        error?.message ?? ''
      }`
    );
  }
  return { client, userId: data.user.id };
}

async function runFullTestSuite(): Promise<void> {
  console.log(
    '[Pengujian Penuh T1–T8] Memulai rangkaian uji terisolasi di lingkungan pengembangan...'
  );

  const rootDir = process.cwd();
  const appEnv = parseEnvFile(path.resolve(rootDir, '.env'));
  const scriptEnv = parseEnvFile(path.resolve(rootDir, '.env.scripts'));

  const supabaseUrl =
    appEnv['EXPO_PUBLIC_SUPABASE_URL'] ?? scriptEnv['SUPABASE_URL'] ?? '';
  const anonKey = appEnv['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
  const serviceRoleKey = scriptEnv['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
  const password = scriptEnv['SEED_DEFAULT_PASSWORD'] ?? 'PasswordDev123!';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Pastikan .env (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY) dan .env.scripts (SUPABASE_SERVICE_ROLE_KEY) sudah terisi.'
    );
  }

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Muat daftar user yang sudah ada agar pembuatan 20 akun pelanggan + 2 pemilik cepat dan idempoten
  const existingUsersByEmail = new Map<string, string>();
  const { data: listUsersData, error: listErr } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 500,
    });
  if (listErr) {
    throw new Error(`Gagal membaca daftar user: ${listErr.message}`);
  }
  for (const u of listUsersData.users) {
    if (u.email) {
      existingUsersByEmail.set(u.email.toLowerCase(), u.id);
    }
  }

  // Siapkan pemilik uji terisolasi (agar usaha utama & simulasi di HP tidak terganggu)
  const testOwnerEmail = 'pemilik.uji.otomatis@antriyuk.test';
  const otherOwnerEmail =
    scriptEnv['SEED_OWNER_2_EMAIL'] ?? 'pemilik2.dev@antriyuk.test';

  const testOwnerId = await ensureTestUser(
    adminClient,
    existingUsersByEmail,
    testOwnerEmail,
    password,
    'owner',
    'Pemilik Uji Otomatis'
  );
  await ensureTestUser(
    adminClient,
    existingUsersByEmail,
    otherOwnerEmail,
    password,
    'owner',
    'Pemilik Usaha Lain'
  );

  // Pastikan usaha uji milik testOwner tersedia
  const { data: existingTestBiz } = await adminClient
    .from('businesses')
    .select('id, name')
    .eq('owner_id', testOwnerId)
    .maybeSingle();

  let testBusinessId: string;
  if (existingTestBiz) {
    testBusinessId = existingTestBiz.id;
  } else {
    const { data: createdBiz, error: createBizErr } = await adminClient
      .from('businesses')
      .insert({
        owner_id: testOwnerId,
        name: 'Klinik Uji Otomatis AntriYuk',
        category: 'klinik',
        address: 'Jl. Pengujian No. 1, Bandung',
        avg_service_minutes: 10,
        grace_minutes: 5,
      })
      .select('id')
      .single();

    if (createBizErr || !createdBiz) {
      throw new Error(
        `Gagal menyiapkan usaha uji: ${createBizErr?.message ?? 'UNKNOWN'}`
      );
    }
    testBusinessId = createdBiz.id;
  }

  // Siapkan 20 akun pelanggan uji khusus (uji.pelanggan1..20) agar 4 akun simulasi (sim.pelanggan1..4) di HP tidak terpengaruh
  const customerEmails: string[] = [];
  for (let i = 1; i <= 20; i++) {
    customerEmails.push(`uji.pelanggan${i}@antriyuk.test`);
  }

  const customerUserIds: string[] = [];
  for (let i = 0; i < customerEmails.length; i++) {
    const uid = await ensureTestUser(
      adminClient,
      existingUsersByEmail,
      customerEmails[i],
      password,
      'customer',
      `Pelanggan Uji #${i + 1}`
    );
    customerUserIds.push(uid);
  }

  // Login klien anon untuk pemilik uji, pemilik lain, dan 20 pelanggan
  const ownerSession = await loginAnonClient(
    supabaseUrl,
    anonKey,
    testOwnerEmail,
    password
  );
  const otherOwnerSession = await loginAnonClient(
    supabaseUrl,
    anonKey,
    otherOwnerEmail,
    password
  );

  const customerSessions = await Promise.all(
    customerEmails.map((email) =>
      loginAnonClient(supabaseUrl, anonKey, email, password)
    )
  );

  const results: TestCaseResult[] = [];

  try {
    // Bersihkan seluruh sesi & tiket lama pada usaha uji serta riwayat tiket uji pelanggan
    await adminClient
      .from('tickets')
      .delete()
      .eq('business_id', testBusinessId);
    await adminClient
      .from('queue_sessions')
      .delete()
      .eq('business_id', testBusinessId);

    // =========================================================================
    // T1 — NOMOR GANDA (20 pelanggan memanggil take_ticket bersamaan via Promise.all)
    // =========================================================================
    const { error: openT1Err } = await ownerSession.client.rpc('open_queue', {
      p_business_id: testBusinessId,
    });
    if (openT1Err) {
      throw new Error(`T1 gagal membuka antrean: ${openT1Err.message}`);
    }

    const t1Responses = await Promise.all(
      customerSessions.map((cs) =>
        cs.client.rpc('take_ticket', { p_business_id: testBusinessId })
      )
    );

    const t1Errors = t1Responses.filter((r) => r.error !== null);
    const t1Numbers = t1Responses
      .map((r) => r.data?.number ?? -1)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    const expectedNumbers = Array.from({ length: 20 }, (_, idx) => idx + 1);
    const t1Passed =
      t1Errors.length === 0 &&
      t1Numbers.length === 20 &&
      t1Numbers.every((val, idx) => val === expectedNumbers[idx]);

    results.push({
      id: 'T1',
      title: 'Nomor ganda: 20 pelanggan memanggil take_ticket bersamaan (Promise.all)',
      mappedStories: ['US-03', 'KRITERIA-KONKURENSI'],
      passed: t1Passed,
      evidence: `20 panggilan konkuren menghasilkan ${t1Numbers.length} tiket sukses tanpa error. Urutan nomor terurut: [${t1Numbers.join(
        ', '
      )}] (unik 1..20 tanpa celah).`,
    });

    // =========================================================================
    // T2 — SATU TIKET AKTIF (Pelanggan yang sama memanggil take_ticket dua kali)
    // =========================================================================
    const { error: dupTakeErr } = await customerSessions[0].client.rpc(
      'take_ticket',
      {
        p_business_id: testBusinessId,
      }
    );

    const t2Passed =
      dupTakeErr !== null &&
      dupTakeErr.message.includes('ALREADY_HAS_TICKET');

    results.push({
      id: 'T2',
      title: 'Satu tiket aktif: pelanggan yang sama mengambil nomor dua kali mendapat ALREADY_HAS_TICKET',
      mappedStories: ['US-03'],
      passed: t2Passed,
      evidence: `Percobaan kedua oleh Pelanggan #1 ditolak oleh RPC dengan pesan: "${
        dupTakeErr?.message ?? 'TIDAK_DITOLAK'
      }".`,
    });

    // =========================================================================
    // T3 — ISOLASI PERAN, PEMILIK LAIN, DAN ANTAR-PELANGGAN
    // =========================================================================
    const { error: custCallNextErr } = await customerSessions[0].client.rpc(
      'call_next',
      {
        p_business_id: testBusinessId,
        p_previous: 'done',
      }
    );

    const { error: otherOwnerCallNextErr } =
      await otherOwnerSession.client.rpc('call_next', {
        p_business_id: testBusinessId,
        p_previous: 'done',
      });

    const { error: otherOwnerQueueErr } = await otherOwnerSession.client.rpc(
      'owner_queue',
      {
        p_business_id: testBusinessId,
      }
    );

    const ticketCustomer1Id = t1Responses[0].data?.id ?? '';
    const { data: customer2ReadTicket1, error: customer2ReadErr } =
      await customerSessions[1].client
        .from('tickets')
        .select('id, number, status')
        .eq('id', ticketCustomer1Id);

    const t3Passed =
      custCallNextErr !== null &&
      custCallNextErr.message.includes('NOT_OWNER') &&
      otherOwnerCallNextErr !== null &&
      otherOwnerCallNextErr.message.includes('NOT_OWNER') &&
      otherOwnerQueueErr !== null &&
      otherOwnerQueueErr.message.includes('NOT_OWNER') &&
      customer2ReadErr === null &&
      (customer2ReadTicket1?.length ?? 0) === 0;

    results.push({
      id: 'T3',
      title: 'Isolasi: pelanggan tidak bisa call_next, pemilik lain ditolak NOT_OWNER, pelanggan tidak bisa baca tiket orang lain',
      mappedStories: ['US-06', 'KRITERIA-RLS'],
      passed: t3Passed,
      evidence: `Pelanggan call_next -> "${custCallNextErr?.message}"; Pemilik lain call_next -> "${otherOwnerCallNextErr?.message}"; Pemilik lain owner_queue -> "${otherOwnerQueueErr?.message}"; Pelanggan #2 select tiket Pelanggan #1 -> ${
        customer2ReadTicket1?.length ?? 0
      } baris.`,
    });

    // =========================================================================
    // T4 — ALUR PENUH (Buka antrean, 3 ambil nomor, 1 selesai, 1 tidak hadir, tutup antrean -> sisa expired & cek owner_summary)
    // =========================================================================
    await adminClient
      .from('tickets')
      .delete()
      .eq('business_id', testBusinessId);
    await adminClient
      .from('queue_sessions')
      .delete()
      .eq('business_id', testBusinessId);

    await ownerSession.client.rpc('open_queue', {
      p_business_id: testBusinessId,
    });

    const t4Take1 = await customerSessions[0].client.rpc('take_ticket', {
      p_business_id: testBusinessId,
    });
    const t4Take2 = await customerSessions[1].client.rpc('take_ticket', {
      p_business_id: testBusinessId,
    });
    const t4Take3 = await customerSessions[2].client.rpc('take_ticket', {
      p_business_id: testBusinessId,
    });

    // Panggil #1 -> status #1 = called
    await ownerSession.client.rpc('call_next', {
      p_business_id: testBusinessId,
      p_previous: 'done',
    });

    // Selesai #1 & panggil #2 -> status #1 = done, #2 = called
    await ownerSession.client.rpc('call_next', {
      p_business_id: testBusinessId,
      p_previous: 'done',
    });

    // Tandai #2 tidak hadir -> status #2 = no_show
    await ownerSession.client.rpc('mark_no_show', {
      p_ticket_id: t4Take2.data!.id,
    });

    // Tutup antrean -> tiket #3 yang masih waiting harus otomatis expired
    await ownerSession.client.rpc('close_queue', {
      p_business_id: testBusinessId,
    });

    const { data: ticket3Row } = await customerSessions[2].client
      .from('tickets')
      .select('status')
      .eq('id', t4Take3.data!.id)
      .single();

    const todayWib = getWibDateString(0);
    const { data: summaryRows, error: summaryErr } =
      await ownerSession.client.rpc('owner_summary', {
        p_business_id: testBusinessId,
        p_date: todayWib,
      });

    const summary = Array.isArray(summaryRows) ? summaryRows[0] : summaryRows;
    const t4Passed =
      !summaryErr &&
      t4Take1.data?.number === 1 &&
      t4Take2.data?.number === 2 &&
      t4Take3.data?.number === 3 &&
      ticket3Row?.status === 'expired' &&
      summary?.total === 3 &&
      summary?.done === 1 &&
      summary?.no_show === 1 &&
      summary?.expired === 1 &&
      summary?.cancelled === 0;

    results.push({
      id: 'T4',
      title: 'Alur penuh: buka antrean, 3 ambil nomor, 1 selesai, 1 tidak hadir, tutup antrean -> sisa expired & owner_summary cocok',
      mappedStories: ['US-06', 'US-07'],
      passed: t4Passed,
      evidence: `Status tiket #3 setelah close_queue = "${ticket3Row?.status}". Hasil owner_summary: total=${summary?.total}, done=${summary?.done}, no_show=${summary?.no_show}, expired=${summary?.expired}, cancelled=${summary?.cancelled} (cocok 100% dengan hitungan manual).`,
    });

    // =========================================================================
    // T5 — BATAL DAN TUNDA (Batal memajukan posisi; Tunda menggeser 3 posisi, batas 2x DEFER_LIMIT, dan NOTHING_BEHIND)
    // =========================================================================
    await adminClient
      .from('tickets')
      .delete()
      .eq('business_id', testBusinessId);
    await adminClient
      .from('queue_sessions')
      .delete()
      .eq('business_id', testBusinessId);

    await ownerSession.client.rpc('open_queue', {
      p_business_id: testBusinessId,
    });

    // 8 pelanggan mengambil nomor (#1..#8)
    const t5Tickets = [];
    for (let i = 0; i < 8; i++) {
      const res = await customerSessions[i].client.rpc('take_ticket', {
        p_business_id: testBusinessId,
      });
      t5Tickets.push(res.data!);
    }

    // Posisi Pelanggan #2 sebelum Pelanggan #1 batal -> ahead harus 1
    const posBeforeCancelRes = await customerSessions[1].client.rpc(
      'my_position',
      {
        p_ticket_id: t5Tickets[1].id,
      }
    );
    const posBeforeCancel = Array.isArray(posBeforeCancelRes.data)
      ? posBeforeCancelRes.data[0]
      : posBeforeCancelRes.data;

    // Pelanggan #1 membatalkan tiket
    await customerSessions[0].client.rpc('cancel_ticket', {
      p_ticket_id: t5Tickets[0].id,
    });

    // Posisi Pelanggan #2 setelah Pelanggan #1 batal -> ahead harus maju jadi 0
    const posAfterCancelRes = await customerSessions[1].client.rpc(
      'my_position',
      {
        p_ticket_id: t5Tickets[1].id,
      }
    );
    const posAfterCancel = Array.isArray(posAfterCancelRes.data)
      ? posAfterCancelRes.data[0]
      : posAfterCancelRes.data;

    // Pelanggan #8 (berada di urutan paling belakang, tidak ada yang di belakangnya) mencoba defer_ticket -> harus NOTHING_BEHIND
    const { error: nothingBehindErr } = await customerSessions[7].client.rpc(
      'defer_ticket',
      {
        p_ticket_id: t5Tickets[7].id,
      }
    );

    // Sekarang antrean waiting adalah [#2, #3, #4, #5, #6, #7, #8].
    // Pelanggan #2 melakukan defer_ticket ke-1 -> bergeser mundur 3 posisi ke antara #5 dan #6 (ahead menjadi 3, defer_count = 1)
    const defer1Res = await customerSessions[1].client.rpc('defer_ticket', {
      p_ticket_id: t5Tickets[1].id,
    });
    const posAfterDefer1Res = await customerSessions[1].client.rpc(
      'my_position',
      {
        p_ticket_id: t5Tickets[1].id,
      }
    );
    const posAfterDefer1 = Array.isArray(posAfterDefer1Res.data)
      ? posAfterDefer1Res.data[0]
      : posAfterDefer1Res.data;

    // Pelanggan #2 masih memiliki [#6, #7, #8] di belakangnya.
    // Pelanggan #2 melakukan defer_ticket ke-2 -> bergeser mundur 3 posisi lagi (defer_count = 2)
    const defer2Res = await customerSessions[1].client.rpc('defer_ticket', {
      p_ticket_id: t5Tickets[1].id,
    });

    // Pelanggan #2 mencoba defer_ticket ke-3 -> harus berhenti di batas 2 kali (DEFER_LIMIT)
    const { error: deferLimitErr } = await customerSessions[1].client.rpc(
      'defer_ticket',
      {
        p_ticket_id: t5Tickets[1].id,
      }
    );

    const t5Passed =
      posBeforeCancel?.ahead === 1 &&
      posAfterCancel?.ahead === 0 &&
      !defer1Res.error &&
      posAfterDefer1?.ahead === 3 &&
      nothingBehindErr !== null &&
      nothingBehindErr.message.includes('NOTHING_BEHIND') &&
      !defer2Res.error &&
      defer2Res.data?.defer_count === 2 &&
      deferLimitErr !== null &&
      deferLimitErr.message.includes('DEFER_LIMIT');

    results.push({
      id: 'T5',
      title: 'Batal dan tunda: batal memajukan posisi, tunda menggeser 3 posisi, berhenti di 2x (DEFER_LIMIT), dan NOTHING_BEHIND jika paling belakang',
      mappedStories: ['US-04'],
      passed: t5Passed,
      evidence: `Ahead sebelum batal=${posBeforeCancel?.ahead} -> sesudah batal=${posAfterCancel?.ahead}; Ahead sesudah tunda ke-1 (geser 3 posisi)=${posAfterDefer1?.ahead}; Tunda saat paling belakang="${nothingBehindErr?.message}"; Tunda ke-2 defer_count=${defer2Res.data?.defer_count}; Tunda ke-3="${deferLimitErr?.message}".`,
    });

    // =========================================================================
    // T6 — PENYALAHGUNAAN (Pengambilan ke-11 dalam 1 jam -> RATE_LIMITED; 3x no_show dalam 24 jam -> TOO_MANY_NO_SHOWS)
    // =========================================================================
    await adminClient
      .from('tickets')
      .delete()
      .eq('business_id', testBusinessId);

    // Uji 1: Pelanggan #8 mengambil & membatalkan 10 tiket dalam 1 jam, lalu mencoba ambil ke-11
    const rateLimitCustomer = customerSessions[7];
    for (let attempt = 1; attempt <= 10; attempt++) {
      const taken = await rateLimitCustomer.client.rpc('take_ticket', {
        p_business_id: testBusinessId,
      });
      if (taken.error || !taken.data) {
        throw new Error(
          `T6 gagal pada percobaan ambil ke-${attempt}: ${
            taken.error?.message ?? 'NO_DATA'
          }`
        );
      }
      await rateLimitCustomer.client.rpc('cancel_ticket', {
        p_ticket_id: taken.data.id,
      });
    }

    const { error: eleventhTakeErr } = await rateLimitCustomer.client.rpc(
      'take_ticket',
      {
        p_business_id: testBusinessId,
      }
    );

    // Uji 2: Pelanggan #9 mengalami 3x no_show dalam 24 jam, lalu mencoba ambil nomor lagi
    const noShowCustomer = customerSessions[8];
    for (let ns = 1; ns <= 3; ns++) {
      const taken = await noShowCustomer.client.rpc('take_ticket', {
        p_business_id: testBusinessId,
      });
      if (taken.error || !taken.data) {
        throw new Error(
          `T6 gagal menyiapkan tiket no_show ke-${ns}: ${
            taken.error?.message ?? 'NO_DATA'
          }`
        );
      }
      // Panggil & tandai no_show oleh pemilik
      await ownerSession.client.rpc('call_next', {
        p_business_id: testBusinessId,
        p_previous: 'done',
      });
      await ownerSession.client.rpc('mark_no_show', {
        p_ticket_id: taken.data.id,
      });
    }

    const { error: fourthAfterNoShowErr } = await noShowCustomer.client.rpc(
      'take_ticket',
      {
        p_business_id: testBusinessId,
      }
    );

    const t6Passed =
      eleventhTakeErr !== null &&
      eleventhTakeErr.message.includes('RATE_LIMITED') &&
      fourthAfterNoShowErr !== null &&
      fourthAfterNoShowErr.message.includes('TOO_MANY_NO_SHOWS');

    results.push({
      id: 'T6',
      title: 'Penyalahgunaan: pengambilan ke-11 dalam 1 jam -> RATE_LIMITED; setelah 3x tidak hadir dalam 24 jam -> TOO_MANY_NO_SHOWS',
      mappedStories: ['US-03', 'KRITERIA-ANTI-ABUSE'],
      passed: t6Passed,
      evidence: `Pengambilan ke-11 dalam 1 jam -> "${eleventhTakeErr?.message}"; Pengambilan setelah 3x no_show dalam 24 jam -> "${fourthAfterNoShowErr?.message}".`,
    });

    // =========================================================================
    // T7 — PROTEKSI ROLE (Update kolom role pada profiles harus ditolak)
    // =========================================================================
    const { error: roleUpdateErr } = await customerSessions[0].client
      .from('profiles')
      .update({ role: 'owner' })
      .eq('id', customerSessions[0].userId);

    const t7Passed = roleUpdateErr !== null;

    results.push({
      id: 'T7',
      title: 'Role: update kolom role pada profiles harus ditolak',
      mappedStories: ['US-01', 'KRITERIA-RLS'],
      passed: t7Passed,
      evidence: `Percobaan update role menjadi 'owner' ditolak oleh PostgreSQL: "[${roleUpdateErr?.code}] ${roleUpdateErr?.message}".`,
    });

    // =========================================================================
    // T8 — HARI BARU (Sesi bertanggal kemarin ditutup otomatis & sesi hari baru mulai dari nomor 1)
    // =========================================================================
    await adminClient
      .from('tickets')
      .delete()
      .eq('business_id', testBusinessId);
    await adminClient
      .from('queue_sessions')
      .delete()
      .eq('business_id', testBusinessId);

    const yesterdayWib = getWibDateString(-1);

    // Buat sesi bertanggal kemarin yang masih berstatus 'open' dengan last_number = 7 dan 1 tiket waiting (#7)
    const { data: yesterdaySession, error: yestInsertErr } = await adminClient
      .from('queue_sessions')
      .insert({
        business_id: testBusinessId,
        queue_date: yesterdayWib,
        status: 'open',
        last_number: 7,
        current_number: 6,
        waiting_count: 1,
      })
      .select('id')
      .single();

    if (yestInsertErr || !yesterdaySession) {
      throw new Error(
        `T8 gagal membuat sesi kemarin: ${yestInsertErr?.message ?? 'UNKNOWN'}`
      );
    }

    const { data: yesterdayTicket } = await adminClient
      .from('tickets')
      .insert({
        session_id: yesterdaySession.id,
        business_id: testBusinessId,
        customer_id: customerSessions[0].userId,
        number: 7,
        sort_key: 7,
        status: 'waiting',
      })
      .select('id')
      .single();

    // Pemilik membuka antrean hari ini (menjalankan penutupan sesi usang < todayWib lewat private.close_session, identik dengan private.close_stale_sessions())
    const { data: newTodaySession, error: openTodayErr } =
      await ownerSession.client.rpc('open_queue', {
        p_business_id: testBusinessId,
      });

    if (openTodayErr || !newTodaySession) {
      throw new Error(
        `T8 gagal membuka sesi hari baru: ${openTodayErr?.message ?? 'UNKNOWN'}`
      );
    }

    // Periksa sesi kemarin harus sudah 'closed' dan tiket kemarin 'expired'
    const { data: closedYesterdaySession } = await adminClient
      .from('queue_sessions')
      .select('status')
      .eq('id', yesterdaySession.id)
      .single();

    const { data: expiredYesterdayTicket } = await adminClient
      .from('tickets')
      .select('status')
      .eq('id', yesterdayTicket!.id)
      .single();

    // Pelanggan #1 mengambil nomor pada sesi hari ini -> nomor harus mulai dari 1!
    const { data: firstTicketToday, error: firstTicketErr } =
      await customerSessions[0].client.rpc('take_ticket', {
        p_business_id: testBusinessId,
      });

    const t8Passed =
      !firstTicketErr &&
      closedYesterdaySession?.status === 'closed' &&
      expiredYesterdayTicket?.status === 'expired' &&
      newTodaySession.queue_date === todayWib &&
      firstTicketToday?.number === 1;

    results.push({
      id: 'T8',
      title: 'Hari baru: penutupan sesi kemarin (close_stale_sessions / open_queue) menutup sesi lama & antrean hari ini mulai dari nomor 1',
      mappedStories: ['US-06', 'US-03'],
      passed: t8Passed,
      evidence: `Sesi kemarin (${yesterdayWib}) status="${closedYesterdaySession?.status}", tiket lama status="${expiredYesterdayTicket?.status}". Sesi hari ini (${newTodaySession.queue_date}) terbuka baru dan pengambilan pertama menghasilkan nomor #${firstTicketToday?.number}.`,
    });
  } finally {
    // Bersihkan seluruh tiket & usaha uji agar antrean simulasi di HP pengguna tetap bersih
    await adminClient
      .from('tickets')
      .delete()
      .eq('business_id', testBusinessId);
    await adminClient
      .from('queue_sessions')
      .delete()
      .eq('business_id', testBusinessId);
    await adminClient.from('businesses').delete().eq('id', testBusinessId);

    await ownerSession.client.auth.signOut();
    await otherOwnerSession.client.auth.signOut();
    await Promise.all(customerSessions.map((cs) => cs.client.auth.signOut()));
  }

  for (const r of results) {
    console.log(
      `[${r.id}] ${r.passed ? 'LULUS' : 'GAGAL'} — ${r.title}\n   Bukti: ${
        r.evidence
      }`
    );
  }

  const allPassed = results.every((r) => r.passed);
  console.log(
    `\n[Pengujian Penuh] Ringkasan Akhir: ${
      results.filter((r) => r.passed).length
    }/${results.length} skenario LULUS.`
  );

  if (!allPassed) {
    process.exit(1);
  }
}

runFullTestSuite().catch((err: unknown) => {
  const message =
    err instanceof Error
      ? err.message
      : 'Terjadi kesalahan saat menjalankan rangkaian uji penuh.';
  console.error(`[Pengujian Penuh Gagal] ${message}`);
  process.exit(1);
});
