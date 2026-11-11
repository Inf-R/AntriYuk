# Laporan Audit Keamanan & Hardening (OWASP Mobile) — AntriYuk

- **Proyek**: AntriYuk (`com.antriyuk.app`) — Tugas Kuliah Pengembangan Aplikasi Mobile (`INF2528`)
- **Tanggal Audit**: 11 November 2026
- **Acuan Standar**: OWASP Mobile Top 10 (2024) & Undang-Undang Pelindungan Data Pribadi (UU PDP No. 27/2022)
- **Skrip Verifikasi Otomatis**: `npm run audit:security` (`scripts/audit-security.ts`) & `npm run gate:rls` (`scripts/gate-rls.ts`)

---

## 1. Tabel Ringkasan Temuan, Tingkat Risiko, Status, dan Perbaikan

| ID | Kategori OWASP Mobile | Temuan Audit | Tingkat Risiko | Status | Perbaikan yang Diterapkan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **M1: Improper Credential Usage** | File konfigurasi klien Firebase Android (`google-services.json` yang memuat `current_key` FCM dan `mobilesdk_app_id`) sempat terlacak di indeks Git (`git ls-files`). Sementara itu, `.env` dan `.env.scripts` (`SUPABASE_SERVICE_ROLE_KEY`) sudah aman dan tidak pernah masuk ke riwayat Git. | **Rendah–Sedang** | **Diperbaiki (Fixed)** | Menghapus `google-services.json` dari indeks Git (`git rm --cached google-services.json`), menambahkannya ke `.gitignore`, dan menyediakan template `google-services.json.example`. |
| **SEC-02** | **M6: Inadequate Privacy Controls** | Belum adanya utilitas log terpusat yang menjamin pembuangan data pribadi (PII) secara otomatis dan mematikan output log pada build produksi Android (`logcat`). | **Sedang** | **Diperbaiki (Fixed)** | Membuat [`src/lib/logger.ts`](../../src/lib/logger.ts) dengan fungsi `redactPiiString` & `sanitizeLogPayload` (menyensor email, JWT, Expo Push Token, password, nama tampilan) serta mematikan seluruh log saat `!__DEV__`. |
| **SEC-03** | **M4: Insufficient Input/Output Validation** | Form login, daftar, verifikasi OTP, lupa sandi, onboarding usaha, dan pengaturan usaha sudah memakai Zod, namun kolom konfirmasi hapus akun (`HAPUS`) di profil dan kolom pencarian usaha belum melewati skema Zod. | **Rendah** | **Diperbaiki (Fixed)** | Menambahkan `deleteAccountConfirmSchema` dan `businessSearchFilterSchema` di [`src/lib/validation.ts`](../../src/lib/validation.ts) serta memasangnya di layar Profil Pelanggan, Profil Pemilik, dan Beranda Pelanggan. |
| **SEC-04** | **M3: Insecure Authentication / Authorization** | Verifikasi bahwa seluruh tabel di schema `public` wajib mengaktifkan RLS dan pemanggil tanpa login (`anon`) tidak boleh mengeksekusi satu pun fungsi RPC. | **Tinggi (Mitigasi Terverifikasi)** | **Lulus Audit (Verified)** | Membuat skrip otomatis [`scripts/audit-security.ts`](../../scripts/audit-security.ts) (`npm run audit:security`) yang menguji 5/5 tabel `public` dan 14/14 RPC terhadap pemanggil `anon` secara langsung. Seluruh 14 RPC ditolak (`42501 permission denied`). |
| **SEC-05** | **M6 & M8: Privacy Controls & Error Reporting** | Aplikasi membutuhkan pelaporan crash/error terpusat tanpa membocorkan PII serta penangkap error tampilan (`ErrorBoundary`) global agar aplikasi tidak layar putih saat gagal render. | **Sedang** | **Diperbaiki (Fixed)** | Memasang `@sentry/react-native` di [`src/lib/sentry.ts`](../../src/lib/sentry.ts) (`sendDefaultPii: false`, `tracesSampleRate: 0.1`, hook `beforeSend` penyensor PII) dan membungkus aplikasi dengan [`GlobalErrorBoundary`](../../src/components/GlobalErrorBoundary.tsx) bertombol **"Coba lagi"**. |
| **SEC-06** | **M5: Insecure Communication & Availability** | Permintaan jaringan ke Supabase pada sinyal seluler buruk berisiko menggantung tanpa batas waktu (timeout), dan mutasi berisiko terkirim ganda bila di-retry otomatis. | **Sedang** | **Diperbaiki (Fixed)** | Menambahkan wrapper `fetchWithTimeout` (**10 detik** / `10_000 ms` menggunakan `AbortController`) di [`src/lib/supabase.ts`](../../src/lib/supabase.ts), membatasi `queries.retry: 2` (backoff eksponensial), dan mengunci `mutations.retry: 0` di [`app/_layout.tsx`](../../app/_layout.tsx). |
| **SEC-07** | **M8 & M9: Security Misconfiguration & Insecure Data Storage** | Pengaturan bawaan Android mengizinkan pencadangan otomatis (`allowBackup: true`) yang berpotensi mengekstrak database SQLite cache (`antriyuk_offline.db`), serta belum memblokir izin perangkat keras yang tidak diperlukan. | **Sedang** | **Diperbaiki (Fixed)** | Mengatur `"allowBackup": false`, `"configureAndroidBackup": false` pada `expo-secure-store`, daftar eksplisit `permissions` minimal, serta `blockedPermissions` (kamera, mikrofon, lokasi GPS, kontak, penyimpanan eksternal) di [`app.json`](../../app.json). |

---

## 2. Rincian Audit & Bukti Verifikasi per Bagian

### 2.1. Pemindaian Rahasia (`service_role`, Kunci, Token) di Repositori & Riwayat Git
- **Perintah Pemindaian**:
  - `git grep -n -E "service_role|SUPABASE_SERVICE_ROLE_KEY|eyJ[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{20,}|sbp_"`
  - `git log -G"eyJ[A-Za-z0-9_-]{20,}|SUPABASE_SERVICE_ROLE_KEY|service_role" --oneline`
- **Hasil**:
  1. **Kunci `service_role` Supabase**: Tidak pernah ditemukan di kode klien (`app/`, `src/`) maupun di riwayat commit Git. Variabel `SUPABASE_SERVICE_ROLE_KEY` hanya dibaca dari environment runtime di Edge Function (`supabase/functions/notify-queue/index.ts`) dan file lokal `.env.scripts` (diabaikan oleh `.gitignore`) untuk skrip CLI lokal (`scripts/seed-dev.ts`, `scripts/simulasi-antrean.ts`).
  2. **File `.env` & `.env.scripts`**: Tercantum di `.gitignore` sejak commit pertama dan tidak pernah ter-commit.
  3. **File `google-services.json`**: Ditemukan terlacak di Git, lalu telah dilepas dari indeks Git (`git rm --cached google-services.json`), dimasukkan ke `.gitignore`, dan digantikan oleh `google-services.json.example`.

### 2.2. Audit `console.log` & Utilitas Log Bebas Data Pribadi (`src/lib/logger.ts`)
- Seluruh file di `app/` dan `src/` telah dipindai: **0 pemanggilan `console.log` mentah** di luar modul logger.
-Edge Function `supabase/functions/notify-queue/index.ts` telah diaudit dan hanya mencatat jumlah pengiriman serta kode status tanpa pernah mencetak token push atau alamat email.
- Utilitas [`src/lib/logger.ts`](../../src/lib/logger.ts) memastikan:
  - Seluruh log (`debug`, `info`, `warn`, `error`) **dimatikan total** saat `!__DEV__` (build production).
  - Saat mode pengembangan (`__DEV__`), fungsi `redactPiiString` dan `sanitizeLogPayload` otomatis menyensor alamat email, JWT, Expo Push Token, kata sandi, dan nama tampilan.

### 2.3. Validasi Input Form dengan Zod (`src/lib/validation.ts`)
Seluruh input pengguna di aplikasi divalidasi menggunakan skema Zod v4 di [`src/lib/validation.ts`](../../src/lib/validation.ts):
1. `registerSchema` (`app/(auth)/daftar.tsx`) — nama tampilan (1–50 karakter), email, kata sandi (>= 8 karakter), peran (`customer` | `owner`), dan persetujuan kebijakan privasi.
2. `verifyOtpSchema` (`app/(auth)/verifikasi.tsx`) — email dan kode OTP 6 digit angka (`/^\d{6}$/`).
3. `loginSchema` (`app/(auth)/login.tsx`) — email dan kata sandi.
4. `forgotPasswordEmailSchema` & `resetPasswordSchema` (`app/(auth)/lupa-password.tsx`) — email, kode pemulihan 6 angka, dan kata sandi baru.
5. `businessFormSchema` (`app/(pemilik)/onboarding.tsx` & `app/(pemilik)/pengaturan.tsx`) — nama usaha (2–80 karakter), kategori enum, alamat (<= 200 karakter), rata-rata layanan (1–240 menit), dan masa tunggu panggilan (1–30 menit).
6. `deleteAccountConfirmSchema` (`app/(pelanggan)/profil.tsx` & `app/(pemilik)/profil.tsx`) — wajib mengetik string persis `HAPUS`.
7. `businessSearchFilterSchema` (`app/(pelanggan)/index.tsx`) — batas panjang kata kunci pencarian (<= 80 karakter) dan validasi kategori filter.

### 2.4. Pemeriksaan RLS Seluruh Tabel `public` & Penolakan RPC untuk `anon` (`scripts/audit-security.ts`)
Skrip [`scripts/audit-security.ts`](../../scripts/audit-security.ts) dijalankan dengan `npm run audit:security` dan memeriksa:
- **5/5 Tabel di Schema `public`** (`public.profiles`, `public.businesses`, `public.queue_sessions`, `public.tickets`, `public.push_tokens`):
  - Seluruhnya memiliki `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
  - Seluruhnya memiliki `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`.
  - Pengujian langsung dengan klien `anon` tanpa login membuktikan `anon` tidak dapat membaca maupun menulis ke tabel mana pun.
- **14/14 Fungsi RPC di Schema `public`** (`open_queue`, `close_queue`, `take_ticket`, `cancel_ticket`, `defer_ticket`, `call_next`, `mark_no_show`, `finish_ticket`, `my_position`, `owner_queue`, `owner_summary`, `register_push_token`, `unregister_push_token`, `delete_my_account`):
  - Seluruhnya dicabut izin eksekusinya dari `PUBLIC` dan `anon` (`REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public, anon, authenticated`).
  - Pengujian langsung memanggil ke-14 RPC menggunakan klien `anon` tanpa login menghasilkan **100% ditolak** (`[42501] permission denied for function ...` / `[PGRST202]`).

### 2.5. Pelaporan Error Sentry & `GlobalErrorBoundary`
- Modul [`src/lib/sentry.ts`](../../src/lib/sentry.ts) menginisialisasi `@sentry/react-native` menggunakan DSN dari `process.env.EXPO_PUBLIC_SENTRY_DSN` dengan:
  - `sendDefaultPii: false` (tidak mengirim IP, email, cookie, atau header autentikasi).
  - `tracesSampleRate: 0.1` (sampling rendah 10% agar hemat kuota paket gratis Developer Plan).
  - Hook `beforeSend` yang membersihkan `event.user`, `event.request`, `event.exception`, dan `event.breadcrumbs` melalui `redactPiiString`.
  - `[VERIFIKASI: langkah setup @sentry/react-native pada Expo serta batas kuota paket gratis Sentry Developer Plan perlu diverifikasi di dokumentasi resmi Sentry & Expo]`.
- Komponen [`GlobalErrorBoundary`](../../src/components/GlobalErrorBoundary.tsx) membungkus seluruh pohon komponen di [`app/_layout.tsx`](../../app/_layout.tsx), menangkap crash render, melaporkannya secara aman ke Sentry, dan menampilkan layar pemulihan ramah dengan tombol **"Coba lagi"**.

### 2.6. Timeout Jaringan 10 Detik & Retry Terbatas
- Di [`src/lib/supabase.ts`](../../src/lib/supabase.ts), seluruh request HTTP Supabase dibungkus oleh `fetchWithTimeout` dengan `AbortController` berdurasi **10.000 ms (10 detik)**.
- Di [`app/_layout.tsx`](../../app/_layout.tsx), `QueryClient` dikonfigurasi dengan `queries.retry: 2` (jeda eksponensial `1000ms -> 2000ms -> 4000ms`) dan `mutations.retry: 0` (mencegah pengiriman ulang otomatis pada aksi mutasi tiket).

### 2.7. Audit Izin Android & Pengaturan Backup (`app.json`)
- Di [`app.json`](../../app.json):
  - `"allowBackup": false` pada `expo.android` dan `["expo-secure-store", { "configureAndroidBackup": false }]` untuk mencegah pencadangan data lokal SQLite/sesi ke cloud tanpa enkripsi.
  - Daftar `permissions` dibatasi hanya pada yang mutlak diperlukan untuk antrean & push notification: `INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`.
  - Daftar `blockedPermissions` secara eksplisit memblokir izin sensitif yang tidak digunakan: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `CAMERA`, `RECORD_AUDIO`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `READ_CONTACTS`, dan `SYSTEM_ALERT_WINDOW`.
  - `[VERIFIKASI: perilaku penggabungan AndroidManifest.xml untuk android.allowBackup, android.permissions, dan android.blockedPermissions pada proses prebuild EAS perlu diverifikasi di dokumentasi resmi Expo app.json]`.

