import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

function loadLocalScriptEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.scripts');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      'File .env.scripts tidak ditemukan. Pastikan .env.scripts sudah tersedia.'
    );
  }

  const content = fs.readFileSync(envPath, 'utf8');
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

function getTodayWibDateString(): string {
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibTime = new Date(Date.now() + wibOffsetMs);
  return wibTime.toISOString().slice(0, 10);
}

const DUMMY_CUSTOMERS = [
  { email: 'sim.pelanggan1@antriyuk.test', name: 'Budi Santoso' },
  { email: 'sim.pelanggan2@antriyuk.test', name: 'Siti Aminah' },
  { email: 'sim.pelanggan3@antriyuk.test', name: 'Andi Wijaya' },
  { email: 'sim.pelanggan4@antriyuk.test', name: 'Dewi Lestari' },
] as const;

async function ensureDummyCustomer(
  adminClient: SupabaseClient<Database>,
  email: string,
  displayName: string,
  password: string
): Promise<string> {
  const { data: created, error: createErr } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'customer',
        display_name: displayName,
      },
    });

  if (!createErr && created.user) {
    return created.user.id;
  }

  const { data: listData, error: listErr } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

  if (listErr) {
    throw new Error('Gagal membaca daftar pengguna simulasi.');
  }

  const found = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!found) {
    throw new Error('Gagal menyiapkan akun pelanggan simulasi.');
  }

  await adminClient.from('profiles').upsert({
    id: found.id,
    display_name: displayName,
    role: 'customer',
  });

  return found.id;
}

async function resolveTargetBusiness(adminClient: SupabaseClient<Database>) {
  const todayWib = getTodayWibDateString();

  // 1. Prioritaskan usaha yang memiliki tiket aktif hari ini dari pengguna asli
  const { data: activeTickets } = await adminClient
    .from('tickets')
    .select('business_id, customer_id, status, created_at')
    .in('status', ['waiting', 'called'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (activeTickets && activeTickets.length > 0) {
    const bizId = activeTickets[0].business_id;
    const { data: biz } = await adminClient
      .from('businesses')
      .select('id, name, owner_id, is_queue_open')
      .eq('id', bizId)
      .single();
    if (biz) {
      return biz;
    }
  }

  // 2. Prioritaskan usaha yang antreannya sedang buka hari ini
  const { data: openSession } = await adminClient
    .from('queue_sessions')
    .select('business_id')
    .eq('queue_date', todayWib)
    .eq('status', 'open')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openSession) {
    const { data: biz } = await adminClient
      .from('businesses')
      .select('id, name, owner_id, is_queue_open')
      .eq('id', openSession.business_id)
      .single();
    if (biz) {
      return biz;
    }
  }

  // 3. Gunakan usaha terbaru yang dibuat
  const { data: latestBiz, error: bizErr } = await adminClient
    .from('businesses')
    .select('id, name, owner_id, is_queue_open')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (bizErr || !latestBiz) {
    throw new Error('Belum ada usaha yang terdaftar di database.');
  }

  return latestBiz;
}

async function ensureOpenSessionToday(
  adminClient: SupabaseClient<Database>,
  businessId: string
) {
  const todayWib = getTodayWibDateString();

  const { data: existing } = await adminClient
    .from('queue_sessions')
    .select('*')
    .eq('business_id', businessId)
    .eq('queue_date', todayWib)
    .maybeSingle();

  if (existing) {
    const { data: updated, error: updateErr } = await adminClient
      .from('queue_sessions')
      .update({
        status: 'open',
        closed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new Error('Gagal membuka sesi antrean hari ini.');
    }

    await adminClient
      .from('businesses')
      .update({ is_queue_open: true })
      .eq('id', businessId);

    return updated;
  }

  const { data: inserted, error: insertErr } = await adminClient
    .from('queue_sessions')
    .insert({
      business_id: businessId,
      queue_date: todayWib,
      status: 'open',
      last_number: 0,
      current_number: 0,
      waiting_count: 0,
    })
    .select('*')
    .single();

  if (insertErr || !inserted) {
    throw new Error('Gagal membuat sesi antrean hari ini.');
  }

  await adminClient
    .from('businesses')
    .update({ is_queue_open: true })
    .eq('id', businessId);

  return inserted;
}

async function syncSessionCounters(
  adminClient: SupabaseClient<Database>,
  sessionId: string
) {
  const { data: waitingRows } = await adminClient
    .from('tickets')
    .select('id')
    .eq('session_id', sessionId)
    .eq('status', 'waiting');

  const { data: calledRow } = await adminClient
    .from('tickets')
    .select('number')
    .eq('session_id', sessionId)
    .eq('status', 'called')
    .order('called_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const waitingCount = waitingRows?.length ?? 0;

  const updatePayload: {
    waiting_count: number;
    updated_at: string;
    current_number?: number;
  } = {
    waiting_count: waitingCount,
    updated_at: new Date().toISOString(),
  };

  if (calledRow) {
    updatePayload.current_number = calledRow.number;
  }

  await adminClient
    .from('queue_sessions')
    .update(updatePayload)
    .eq('id', sessionId);
}

async function runSimulation(): Promise<void> {
  const mode = (process.argv[2] ?? 'bantuan').toLowerCase();
  const env = loadLocalScriptEnv();
  const supabaseUrl = env['SUPABASE_URL'] ?? '';
  const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
  const defaultPassword = env['SEED_DEFAULT_PASSWORD'] ?? 'PasswordDev123!';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.scripts.'
    );
  }

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Siapkan 4 akun pelanggan dummy
  const dummyIds: string[] = [];
  for (const item of DUMMY_CUSTOMERS) {
    const id = await ensureDummyCustomer(
      adminClient,
      item.email,
      item.name,
      defaultPassword
    );
    dummyIds.push(id);
  }
  const dummyIdSet = new Set(dummyIds);

  const targetBiz = await resolveTargetBusiness(adminClient);
  const session = await ensureOpenSessionToday(adminClient, targetBiz.id);

  if (mode === 'isi') {
    // Tambahkan tiket untuk pelanggan dummy yang belum punya tiket aktif di sesi ini
    let addedCount = 0;
    let nextNumber = session.last_number;

    for (let i = 0; i < dummyIds.length; i++) {
      const dummyId = dummyIds[i];
      const { data: existingActive } = await adminClient
        .from('tickets')
        .select('id, number')
        .eq('session_id', session.id)
        .eq('customer_id', dummyId)
        .in('status', ['waiting', 'called'])
        .maybeSingle();

      if (!existingActive) {
        nextNumber += 1;
        await adminClient.from('tickets').insert({
          session_id: session.id,
          business_id: targetBiz.id,
          customer_id: dummyId,
          number: nextNumber,
          sort_key: nextNumber,
          status: 'waiting',
        });
        addedCount += 1;
      }
    }

    await adminClient
      .from('queue_sessions')
      .update({ last_number: nextNumber })
      .eq('id', session.id);

    await syncSessionCounters(adminClient, session.id);

    console.log(
      `[Simulasi: ISI] Usaha "${targetBiz.name}" telah dibuka dan diisi ${addedCount} antrean dummy baru (Total nomor terakhir: #${nextNumber}).`
    );
    return;
  }

  if (mode === 'ramai') {
    // Cari tiket milik pengguna asli (bukan dummy) di sesi ini
    const { data: sessionTickets } = await adminClient
      .from('tickets')
      .select('*')
      .eq('session_id', session.id)
      .in('status', ['waiting', 'called'])
      .order('sort_key', { ascending: true });

    const realUserTicket = (sessionTickets ?? []).find(
      (t) => !dummyIdSet.has(t.customer_id)
    );

    // Pastikan 3 dummy pertama berstatus waiting di depan pengguna asli
    const baseSortKey = realUserTicket ? Number(realUserTicket.sort_key) : 100;
    let nextNumber = session.last_number;

    for (let i = 0; i < 3; i++) {
      const dummyId = dummyIds[i];
      const desiredSortKey = baseSortKey - (3 - i) * 0.1;

      const { data: existingDummy } = await adminClient
        .from('tickets')
        .select('id')
        .eq('session_id', session.id)
        .eq('customer_id', dummyId)
        .in('status', ['waiting', 'called'])
        .maybeSingle();

      if (existingDummy) {
        await adminClient
          .from('tickets')
          .update({
            status: 'waiting',
            called_at: null,
            sort_key: desiredSortKey,
          })
          .eq('id', existingDummy.id);
      } else {
        nextNumber += 1;
        await adminClient.from('tickets').insert({
          session_id: session.id,
          business_id: targetBiz.id,
          customer_id: dummyId,
          number: nextNumber,
          sort_key: desiredSortKey,
          status: 'waiting',
        });
      }
    }

    if (realUserTicket && realUserTicket.status === 'called') {
      await adminClient
        .from('tickets')
        .update({ status: 'waiting', called_at: null })
        .eq('id', realUserTicket.id);
    }

    await adminClient
      .from('queue_sessions')
      .update({ last_number: nextNumber })
      .eq('id', session.id);

    await syncSessionCounters(adminClient, session.id);

    console.log(
      `[Simulasi: RAMAI] 3 pengantre dummy ditempatkan di depan antrean pada "${targetBiz.name}". Periksa layar Tiket Saya di HP Anda!`
    );
    return;
  }

  if (mode === 'sebentar') {
    // Kondisikan tiket pengguna asli berada di urutan paling depan (ahead = 0)
    // dan tidak ada tiket yang sedang dipanggil (serving = 0) -> est_minutes = 0 ("Sebentar lagi")
    const { data: sessionTickets } = await adminClient
      .from('tickets')
      .select('*')
      .eq('session_id', session.id)
      .in('status', ['waiting', 'called'])
      .order('sort_key', { ascending: true });

    const tickets = sessionTickets ?? [];
    const targetCustomerTicket =
      tickets.find((t) => !dummyIdSet.has(t.customer_id)) ?? tickets[0];

    if (!targetCustomerTicket) {
      console.log(
        `[Simulasi: SEBENTAR] Belum ada tiket aktif di "${targetBiz.name}". Silakan ambil nomor antrean terlebih dahulu dari aplikasi Pelanggan di HP Anda, lalu jalankan ulang perintah ini.`
      );
      return;
    }

    const nowIso = new Date().toISOString();

    // Selesaikan semua tiket lain yang sedang dipanggil atau yang berada di depan tiket target
    for (const t of tickets) {
      if (t.id === targetCustomerTicket.id) {
        continue;
      }
      if (
        t.status === 'called' ||
        Number(t.sort_key) < Number(targetCustomerTicket.sort_key)
      ) {
        await adminClient
          .from('tickets')
          .update({
            status: 'done',
            done_at: nowIso,
          })
          .eq('id', t.id);
      }
    }

    // Pastikan tiket target berstatus 'waiting' di urutan paling depan
    await adminClient
      .from('tickets')
      .update({
        status: 'waiting',
        called_at: null,
        done_at: null,
      })
      .eq('id', targetCustomerTicket.id);

    await syncSessionCounters(adminClient, session.id);

    console.log(
      `[Simulasi: SEBENTAR LAGI] Tiket #${targetCustomerTicket.number} di "${targetBiz.name}" kini berada di urutan paling depan (0 orang di depan, 0 sedang dilayani). Layar Pelanggan sekarang menampilkan "Sebentar lagi"!`
    );
    return;
  }

  if (mode === 'panggil') {
    const nowIso = new Date().toISOString();

    // 1. Selesaikan tiket yang sedang dipanggil saat ini (jika ada)
    await adminClient
      .from('tickets')
      .update({ status: 'done', done_at: nowIso })
      .eq('session_id', session.id)
      .eq('status', 'called');

    // 2. Ambil tiket waiting terdepan
    const { data: nextTicket } = await adminClient
      .from('tickets')
      .select('*')
      .eq('session_id', session.id)
      .eq('status', 'waiting')
      .order('sort_key', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!nextTicket) {
      await syncSessionCounters(adminClient, session.id);
      console.log(
        `[Simulasi: PANGGIL] Tidak ada antrean menunggu lagi di "${targetBiz.name}".`
      );
      return;
    }

    await adminClient
      .from('tickets')
      .update({
        status: 'called',
        called_at: nowIso,
      })
      .eq('id', nextTicket.id);

    await syncSessionCounters(adminClient, session.id);

    console.log(
      `[Simulasi: PANGGIL] Nomor #${nextTicket.number} berhasil dipanggil di "${targetBiz.name}".`
    );
    return;
  }

  if (mode === 'giliran') {
    const { data: sessionTickets } = await adminClient
      .from('tickets')
      .select('*')
      .eq('session_id', session.id)
      .in('status', ['waiting', 'called'])
      .order('sort_key', { ascending: true });

    const tickets = sessionTickets ?? [];
    const targetCustomerTicket =
      tickets.find((t) => !dummyIdSet.has(t.customer_id)) ?? tickets[0];

    if (!targetCustomerTicket) {
      console.log(
        `[Simulasi: GILIRAN] Belum ada tiket aktif di "${targetBiz.name}". Silakan ambil nomor antrean dulu di HP Anda.`
      );
      return;
    }

    const nowIso = new Date().toISOString();

    // Selesaikan tiket lain yang ada di depan / sedang dipanggil
    for (const t of tickets) {
      if (t.id === targetCustomerTicket.id) {
        continue;
      }
      if (
        t.status === 'called' ||
        Number(t.sort_key) < Number(targetCustomerTicket.sort_key)
      ) {
        await adminClient
          .from('tickets')
          .update({
            status: 'done',
            done_at: nowIso,
          })
          .eq('id', t.id);
      }
    }

    // Panggil tiket target
    await adminClient
      .from('tickets')
      .update({
        status: 'called',
        called_at: nowIso,
      })
      .eq('id', targetCustomerTicket.id);

    await syncSessionCounters(adminClient, session.id);

    console.log(
      `[Simulasi: GILIRAN ANDA] Tiket #${targetCustomerTicket.number} di "${targetBiz.name}" kini berstatus DIPANGGIL (kartu hijau)!`
    );
    return;
  }

  console.log(`
Gunakan salah satu perintah simulasi berikut:
  npm run sim:isi       -> Membuka antrean & mengisi 4 pelanggan dummy (untuk menguji Dasbor Pemilik)
  npm run sim:ramai     -> Menaruh 3 pengantre dummy di depan tiket Anda (muncul "± X menit")
  npm run sim:sebentar  -> Mengosongkan pengantre di depan tiket Anda sehingga muncul "Sebentar lagi" (0 menit)
  npm run sim:panggil   -> Memanggil 1 nomor berikutnya dari antrean (simulasi tombol Panggil Berikutnya)
  npm run sim:giliran   -> Langsung memanggil nomor tiket Anda menjadi "Dipanggil" (kartu hijau)
`);
}

runSimulation().catch((err: unknown) => {
  const message =
    err instanceof Error ? err.message : 'Terjadi kesalahan saat simulasi.';
  console.error(`[Simulasi Gagal] ${message}`);
  process.exit(1);
});

