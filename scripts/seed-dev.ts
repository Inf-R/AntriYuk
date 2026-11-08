import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BusinessCategory, Database, ProfileRole } from '../src/types/database';

/**
 * Membaca file .env.scripts lokal tanpa membocorkan nilai ke log.
 * File ini hanya dijalankan di lingkungan Node.js lokal dan tidak pernah di-import oleh aplikasi.
 */
function loadLocalScriptEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.scripts');
  if (!fs.existsSync(envPath)) {
    throw new Error('File .env.scripts tidak ditemukan. Salin .env.scripts.example menjadi .env.scripts terlebih dahulu.');
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

async function ensureUser(
  adminClient: SupabaseClient<Database>,
  email: string,
  password: string,
  role: ProfileRole,
  displayName: string
): Promise<string> {
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      display_name: displayName,
    },
  });

  if (!createError && created.user) {
    return created.user.id;
  }

  // Jika akun sudah pernah dibuat sebelumnya (idempotent), cari dari daftar user Admin API
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    throw new Error(`Gagal memeriksa daftar akun (${listError.code ?? 'AUTH_LIST_ERROR'}).`);
  }

  const existing = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!existing) {
    throw new Error(
      `Gagal menyiapkan akun peran ${role} (${createError?.code ?? 'AUTH_CREATE_ERROR'}).`
    );
  }

  // Pastikan profil memiliki role dan display_name yang sesuai
  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: existing.id,
    display_name: displayName,
    role,
  });

  if (profileError) {
    throw new Error(`Gagal menyinkronkan profil peran ${role} (${profileError.code}).`);
  }

  return existing.id;
}

interface SeedBusinessInput {
  name: string;
  category: BusinessCategory;
  address: string;
  avg_service_minutes: number;
  grace_minutes: number;
}

async function ensureBusinessForOwner(
  adminClient: SupabaseClient<Database>,
  ownerId: string,
  input: SeedBusinessInput
): Promise<void> {
  const { data: existingList, error: selectError } = await adminClient
    .from('businesses')
    .select('id, name')
    .eq('owner_id', ownerId)
    .eq('name', input.name)
    .limit(1);

  if (selectError) {
    throw new Error(`Gagal memeriksa data usaha (${selectError.code}).`);
  }

  if (existingList && existingList.length > 0) {
    return;
  }

  const { error: insertError } = await adminClient.from('businesses').insert({
    owner_id: ownerId,
    name: input.name,
    category: input.category,
    address: input.address,
    avg_service_minutes: input.avg_service_minutes,
    grace_minutes: input.grace_minutes,
  });

  if (insertError) {
    const errWithCode = new Error(`Gagal membuat usaha (${insertError.code}).`) as Error & {
      pgCode?: string;
    };
    errWithCode.pgCode = insertError.code;
    throw errWithCode;
  }
}

async function runSeed(): Promise<void> {
  console.log('[Seed] Memulai proses seeding data pengembangan...');

  const env = loadLocalScriptEnv();
  const supabaseUrl = env['SUPABASE_URL'] ?? process.env['SUPABASE_URL'] ?? '';
  const serviceRoleKey =
    env['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl.includes('project-ref-anda') ||
    serviceRoleKey.includes('...')
  ) {
    throw new Error(
      'Konfigurasi SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY di .env.scripts belum diisi dengan benar.'
    );
  }

  const ownerEmail = env['SEED_OWNER_EMAIL'] ?? 'pemilik.dev@antriyuk.test';
  const owner2Email = env['SEED_OWNER_2_EMAIL'] ?? 'pemilik2.dev@antriyuk.test';
  const customerEmail = env['SEED_CUSTOMER_EMAIL'] ?? 'pelanggan.dev@antriyuk.test';
  const customer2Email = env['SEED_CUSTOMER_2_EMAIL'] ?? 'pelanggan2.dev@antriyuk.test';
  const defaultPassword = env['SEED_DEFAULT_PASSWORD'] ?? 'PasswordDev123!';

  const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Buat 1 akun pemilik utama
  const primaryOwnerId = await ensureUser(
    adminClient,
    ownerEmail,
    defaultPassword,
    'owner',
    'Pemilik Usaha Contoh'
  );
  console.log('[Seed] Akun pemilik utama berhasil disiapkan.');

  // 2. Buat 2 usaha contoh
  const sampleBusinesses: readonly [SeedBusinessInput, SeedBusinessInput] = [
    {
      name: 'Klinik Pratama Sehat Sentosa',
      category: 'klinik',
      address: 'Jl. Merdeka No. 12, Jakarta Pusat',
      avg_service_minutes: 15,
      grace_minutes: 5,
    },
    {
      name: 'Barbershop Rapi Jaya',
      category: 'barbershop',
      address: 'Jl. Sudirman No. 45, Jakarta Selatan',
      avg_service_minutes: 20,
      grace_minutes: 5,
    },
  ];

  // Usaha contoh pertama menggunakan pemilik utama
  const { data: existingOwner1Biz } = await adminClient
    .from('businesses')
    .select('id')
    .eq('owner_id', primaryOwnerId)
    .limit(1);

  if (!existingOwner1Biz || existingOwner1Biz.length === 0) {
    await ensureBusinessForOwner(adminClient, primaryOwnerId, sampleBusinesses[0]);
  }
  console.log('[Seed] Usaha contoh #1 berhasil disiapkan.');

  // Usaha contoh kedua: coba gunakan pemilik utama dulu;
  // bila skema memberlakukan UNIQUE(owner_id) (23505: 1 pemilik = 1 usaha),
  // otomatis siapkan pemilik pendamping untuk memegang usaha contoh #2.
  try {
    await ensureBusinessForOwner(adminClient, primaryOwnerId, sampleBusinesses[1]);
    console.log('[Seed] Usaha contoh #2 berhasil disiapkan pada pemilik utama.');
  } catch (err: unknown) {
    const pgCode =
      typeof err === 'object' && err !== null && 'pgCode' in err && typeof err.pgCode === 'string'
        ? err.pgCode
        : '';

    if (pgCode === '23505') {
      const secondaryOwnerId = await ensureUser(
        adminClient,
        owner2Email,
        defaultPassword,
        'owner',
        'Pemilik Usaha Contoh 2'
      );
      const { data: existingOwner2Biz } = await adminClient
        .from('businesses')
        .select('id')
        .eq('owner_id', secondaryOwnerId)
        .limit(1);

      if (!existingOwner2Biz || existingOwner2Biz.length === 0) {
        await ensureBusinessForOwner(adminClient, secondaryOwnerId, sampleBusinesses[1]);
      }
      console.log(
        '[Seed] Usaha contoh #2 berhasil disiapkan (menggunakan pemilik pendamping karena constraint 1 pemilik = 1 usaha).'
      );
    } else {
      throw err;
    }
  }

  // 3. Buat akun pelanggan A dan pelanggan B (untuk pengujian RLS antar-pelanggan)
  await ensureUser(
    adminClient,
    customerEmail,
    defaultPassword,
    'customer',
    'Pelanggan Contoh A'
  );
  await ensureUser(
    adminClient,
    customer2Email,
    defaultPassword,
    'customer',
    'Pelanggan Contoh B'
  );
  console.log('[Seed] Akun pelanggan A dan B berhasil disiapkan.');

  console.log('[Seed] Seluruh data seed pengembangan berhasil dibuat.');
}

runSeed().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat menjalankan seed.';
  console.error(`[Seed Gagal] ${message}`);
  process.exit(1);
});

