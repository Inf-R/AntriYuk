# Laporan Hasil Pengujian Penuh (Otomatis T1–T8 & Manual di HP) — AntriYuk

- **Proyek**: AntriYuk (`com.antriyuk.app`) — Tugas Kuliah Pengembangan Aplikasi Mobile (`INF2528`)
- **Tanggal Eksekusi**: 11 November 2026
- **Skrip Uji Otomatis**:
  - `npm run test:full` ([`scripts/tests/full-test.ts`](../../scripts/tests/full-test.ts)) — Skenario T1 s/d T8 pada proyek Supabase pengembangan (terisolasi dari usaha simulasi utama)
  - `npm run gate:rls` ([`scripts/gate-rls.ts`](../../scripts/gate-rls.ts)) — Feasibility Gate RLS & Hak Akses
  - `npm run audit:security` ([`scripts/audit-security.ts`](../../scripts/audit-security.ts)) — Pemeriksaan RLS Seluruh Tabel `public` & Penolakan 14 RPC untuk `anon`
  - `npm run sim:isi | sim:ramai | sim:sebentar | sim:panggil | sim:giliran` ([`scripts/simulasi-antrean.ts`](../../scripts/simulasi-antrean.ts)) — Skenario simulasi interaktif untuk pengujian realtime di perangkat Android

---

## 1. Hasil Eksekusi Skrip Pengujian Otomatis (`T1` sampai `T8`)

| Kode Uji | Nama Skenario Pengujian | Status | Bukti Hasil Eksekusi (`npm run test:full`) |
| :--- | :--- | :--- | :--- |
| **T1** | **Nomor ganda (Konkurensi 20 Pelanggan)** (`Promise.all` memanggil `take_ticket` bersamaan) | **LULUS** | 20 panggilan konkuren menghasilkan tepat 20 tiket sukses tanpa error dengan urutan nomor unik berurutan tanpa celah: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]` berkat penguncian baris `SELECT ... FOR UPDATE` pada `queue_sessions`. |
| **T2** | **Satu tiket aktif per usaha** (Pelanggan yang sama memanggil `take_ticket` dua kali) | **LULUS** | Panggilan kedua pada usaha yang sama saat tiket pertama masih `waiting` ditolak oleh database dengan kode/pesan `ALREADY_HAS_TICKET` (serta dijaga oleh unique partial index `tickets_one_active_per_customer`). |
| **T3** | **Isolasi peran & kepemilikan** (`call_next`, `owner_queue`, dan pembacaan `tickets` silang) | **LULUS** | 1) Pelanggan memanggil `call_next` -> ditolak `NOT_OWNER`.<br>2) Pemilik lain memanggil `call_next` & `owner_queue` usaha orang lain -> ditolak `NOT_OWNER`.<br>3) Pelanggan #2 membaca tiket Pelanggan #1 (`from('tickets').select()`) -> `0 baris` (disaring policy RLS `tickets_select_own_or_business`). |
| **T4** | **Alur penuh & akurasi ringkasan** (Buka antrean -> 3 ambil nomor -> 1 `done` -> 1 `no_show` -> tutup antrean) | **LULUS** | Saat `close_queue` dipanggil, tiket #3 yang masih `waiting` otomatis berubah menjadi `expired`. Pemanggilan `owner_summary` menghasilkan `total=3, done=1, no_show=1, expired=1, cancelled=0` (100% cocok dengan hitungan manual). |
| **T5** | **Batal dan tunda giliran** (`cancel_ticket` & `defer_ticket`) | **LULUS** | 1) Saat tiket #1 dibatalkan (`cancel_ticket`), posisi `ahead` tiket #2 maju otomatis dari `1` menjadi `0`.<br>2) Saat tiket paling belakang memanggil `defer_ticket` -> ditolak `NOTHING_BEHIND`.<br>3) Saat tiket #2 memanggil `defer_ticket` ke-1 -> bergeser mundur 3 posisi (`ahead` menjadi `3`, `defer_count=1`).<br>4) Tunda ke-2 berhasil (`defer_count=2`), dan percobaan tunda ke-3 ditolak dengan `DEFER_LIMIT`. |
| **T6** | **Pencegahan penyalahgunaan (Anti-Abuse)** (`RATE_LIMITED` & `TOO_MANY_NO_SHOWS`) | **LULUS** | 1) Setelah 10 pengambilan tiket dalam 1 jam terakhir, pengambilan ke-11 ditolak dengan `RATE_LIMITED`.<br>2) Setelah 3 tiket berstatus `no_show` dalam 24 jam terakhir, panggilan `take_ticket` berikutnya ditolak dengan `TOO_MANY_NO_SHOWS`. |
| **T7** | **Proteksi perubahan peran (`role`)** (`UPDATE profiles SET role = 'owner'`) | **LULUS** | Percobaan pelanggan mengubah kolom `role` miliknya sendiri di tabel `profiles` menjadi `'owner'` ditolak langsung oleh PostgreSQL dengan `[42501] permission denied for table profiles` (column-level privilege hanya mengizinkan `UPDATE (display_name)`). |
| **T8** | **Pergantian hari baru (WIB)** (`close_stale_sessions` / `open_queue` pada sesi kemarin) | **LULUS** | Sesi bertanggal kemarin (`status='open'`, `last_number=7`) otomatis ditutup (`status='closed'`) dan tiket tunggunya diubah menjadi `expired`. Sesi hari ini dibuka baru dan pengambilan tiket pertama dimulai kembali dari nomor **`#1`**. |

---

## 2. Pemetaan User Stories (`US-01` s/d `US-08`) ke Status & Bukti

| Kode Story | Deskripsi Kebutuhan Pengguna (User Story) | Status | Bukti Otomatis & Verifikasi Aplikasi |
| :--- | :--- | :--- | :--- |
| **US-01** | **Registrasi, Login, Verifikasi OTP 6 Angka, & Pemisahan Peran Tetap** (`customer` vs `owner`) | **LULUS** | • Diuji otomatis pada **T7** dan `gate-rls.ts` (Percobaan 4): peran disimpan di `profiles.role` saat trigger `handle_new_user()` berjalan dan tidak dapat diubah.<br>• Sesi disimpan terenkripsi dengan `LargeSecureStore` (`expo-secure-store` + `AsyncStorage` AES-256) di [`src/lib/supabase.ts`](../../src/lib/supabase.ts) dan diarahkan oleh `NavigationGuard` di [`app/_layout.tsx`](../../app/_layout.tsx). |
| **US-02** | **Pencarian & Filter Daftar Usaha bagi Pelanggan** (Debounce 300ms, filter 5 kategori, indikator Buka/Tutup) | **LULUS** | • Diimplementasikan di [`app/(pelanggan)/index.tsx`](../../app/%28pelanggan%29/index.tsx) dan [`src/hooks/useCustomerQueue.ts`](../../src/hooks/useCustomerQueue.ts) dengan sanitasi karakter wildcard `%` dan `_`, batas 50 hasil, indeks trigram `businesses_name_trgm`, serta validasi Zod `businessSearchFilterSchema`. |
| **US-03** | **Pengambilan Nomor Antrean dari Rumah** (Bebas nomor ganda, batas 1 tiket aktif per usaha, proteksi rate-limit & no-show) | **LULUS** | • Diuji otomatis pada **T1** (20 pelanggan konkuren -> nomor unik 1..20), **T2** (`ALREADY_HAS_TICKET`), **T6** (`RATE_LIMITED` & `TOO_MANY_NO_SHOWS`), dan **T8** (reset nomor mulai dari 1 setiap hari baru WIB). |
| **US-04** | **Pemantauan Posisi Realtime, Estimasi Waktu, Batal, & Tunda Giliran** (`my_position`, `"Sebentar lagi"`, `cancel_ticket`, `defer_ticket`) | **LULUS** | • Diuji otomatis pada **T5** (`ahead` maju saat tiket depan batal, geser 3 posisi saat tunda, batas `DEFER_LIMIT` 2x, dan `NOTHING_BEHIND`).<br>• Diuji interaktif di HP dengan skrip `npm run sim:ramai`, `npm run sim:sebentar`, `npm run sim:panggil`, dan `npm run sim:giliran` lewat hook [`useMyTicket.ts`](../../src/hooks/useMyTicket.ts). |
| **US-05** | **Notifikasi Push Saat Hampir Giliran (`ahead <= 2`) & Saat Dipanggil (`called`)** | **LULUS** | • Migrasi [`0002_push.sql`](../../supabase/migrations/0002_push.sql) (`called_notified_at` & `near_notified_at` idempoten), layar edukasi izin [`PushPermissionModal.tsx`](../../src/components/PushPermissionModal.tsx), channel Android `antrean` prioritas `MAX` di [`usePushRegistration.ts`](../../src/hooks/usePushRegistration.ts), serta Edge Function [`notify-queue/index.ts`](../../supabase/functions/notify-queue/index.ts). |
| **US-06** | **Pengelolaan Antrean oleh Pemilik Usaha** (Buka/tutup antrean, panggil berikutnya, selesai, tidak hadir, hitung mundur `grace_minutes`) | **LULUS** | • Diuji otomatis pada **T3** (isolasi `NOT_OWNER`), **T4** (`open_queue`, `call_next`, `mark_no_show`, `close_queue`), dan **T8**.<br>• Dasbor pemilik satu tangan dengan tombol jumbo dan penghitung mundur merah saat lewat `grace_minutes` di [`app/(pemilik)/index.tsx`](../../app/%28pemilik%29/index.tsx). |
| **US-07** | **Ringkasan Statistik Harian Pemilik & Riwayat Tiket Pelanggan** (`owner_summary` & riwayat berpaginasi 20 item) | **LULUS** | • Diuji otomatis pada **T4**: hasil `owner_summary` (`total`, `done`, `cancelled`, `no_show`, `expired`, `avg_service_minutes`) cocok 100% dengan hitungan manual.<br>• Navigasi tanggal WIB di [`app/(pemilik)/ringkasan.tsx`](../../app/%28pemilik%29/ringkasan.tsx) dan paginasi 20 tiket di [`app/(pelanggan)/riwayat.tsx`](../../app/%28pelanggan%29/riwayat.tsx). |
| **US-08** | **Ketahanan Mode Offline, Cache SQLite Tiket Aktif, & Penghapusan Akun Mandiri (UU PDP)** | **LULUS** | • Tabel SQLite `active_ticket` di [`src/db/sqlite.ts`](../../src/db/sqlite.ts) menyimpan posisi terakhir dan menampilkannya dengan banner `"Offline. Terakhir diperbarui pukul HH:mm WIB"` di [`app/(pelanggan)/tiket.tsx`](../../app/%28pelanggan%29/tiket.tsx), serta otomatis dihapus saat tiket selesai/batal/hangus/logout/hapus akun.<br>• Hapus akun 2 tahap (ketik `HAPUS`) tersedia di profil kedua peran. |

---

## 3. Pemetaan Kriteria Keamanan (OWASP Mobile) ke Status & Bukti

| Kriteria Keamanan | Status | Bukti Verifikasi |
| :--- | :--- | :--- |
| **Seluruh tabel di schema `public` wajib mengaktifkan RLS** | **LULUS** | Diverifikasi oleh `npm run audit:security` (`scripts/audit-security.ts`): 5/5 tabel (`profiles`, `businesses`, `queue_sessions`, `tickets`, `push_tokens`) berstatus RLS aktif dan menolak akses baca/tulis dari `anon`. |
| **Pemanggil tanpa login (`anon`) tidak bisa memanggil satu pun RPC** | **LULUS** | Diverifikasi oleh `npm run audit:security`: 14/14 fungsi RPC di schema `public` menolak pemanggilan `anon` dengan `[42501] permission denied for function ...`. |
| **Klien tidak pernah menulis langsung ke `tickets` atau `queue_sessions`** | **LULUS** | Diverifikasi oleh `npm run gate:rls` (Percobaan 3) dan `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`. Seluruh mutasi antrean berjalan melalui fungsi `SECURITY DEFINER` dengan `SET search_path = ''`. |
| **Tidak ada kunci `service_role` di kode klien atau riwayat Git** | **LULUS** | Diverifikasi oleh `npm run audit:security` dan pemindaian `git log` di [`docs/bukti/audit-keamanan.md`](./audit-keamanan.md). |
| **Tidak ada data pribadi (PII) di `console.log` maupun laporan crash** | **LULUS** | Utilitas [`src/lib/logger.ts`](../../src/lib/logger.ts) menyensor PII dan mati saat `!__DEV__`; Sentry di [`src/lib/sentry.ts`](../../src/lib/sentry.ts) memakai `sendDefaultPii: false` dan sanitasi `beforeSend`. |
| **Pembatasan izin Android & penonaktifan Android Auto Backup** | **LULUS** | [`app.json`](../../app.json) menetapkan `"allowBackup": false`, `"configureAndroidBackup": false`, daftar `permissions` minimal, dan `blockedPermissions` untuk kamera, lokasi, mikrofon, kontak, serta penyimpanan eksternal. |

---

## 4. Daftar Uji Manual di Perangkat Android (Checklist Verifikasi Akhir)

Berikut adalah daftar uji manual di ponsel Android (Development Build) untuk memverifikasi perilaku antarmuka dan perangkat keras secara langsung:

### A. Sesi Bertahan Setelah Aplikasi Ditutup Paksa (`US-01`)
1. Masuk ke aplikasi menggunakan akun Pelanggan atau Pemilik Usaha.
2. Tutup paksa (*force close* / geser dari *Recent Apps*) aplikasi AntriYuk.
3. Buka kembali aplikasi AntriYuk.
4. **Hasil yang Diharapkan**: Aplikasi langsung masuk ke beranda sesuai peran akun (`/(pelanggan)` atau `/(pemilik)`) tanpa meminta login ulang karena sesi JWT terenkripsi dipulihkan dari `LargeSecureStore`. *(Telah diverifikasi pada pengujian Langkah 4–8)*.

### B. Daftar Usaha Tampil di Bawah 3 Detik & Filter Berfungsi (`US-02`)
1. Masuk sebagai Pelanggan dan buka tab **Beranda**.
2. Amati waktu muat daftar usaha pada koneksi normal, lalu ketik nama usaha di kolom pencarian dan ketuk chip kategori (**Klinik Pratama**, **Barbershop**, dll.).
3. Ketuk salah satu kartu usaha untuk membuka **Detail Usaha**, lalu tekan tombol kembali.
4. **Hasil yang Diharapkan**: Daftar usaha tampil dalam waktu `< 3 detik`, pencarian bekerja dengan debounce 300ms, chip kategori memfilter daftar dengan akurat, dan navigasi ke Detail Usaha berjalan mulus. *(Telah diverifikasi pada pengujian Langkah 6)*.

### C. Posisi Antrean Berubah Otomatis Tanpa Tarik Layar (`US-04`)
1. Ambil nomor antrean pada usaha simulasi dari HP Pelanggan, lalu buka tab **Tiket**.
2. Dari terminal komputer, jalankan:
   - `npm run sim:ramai` -> Layar HP otomatis memperbarui posisi menjadi `3 orang di depan Anda` dengan estimasi `± X menit`.
   - `npm run sim:sebentar` -> Layar HP otomatis berubah menjadi warna peringatan (*Hampir Giliran Anda*) dengan estimasi **`Sebentar lagi`**.
   - `npm run sim:giliran` -> Layar HP otomatis berubah menjadi latar hijau **`Giliran Anda! Datang dalam X menit`** dan tombol Batal/Tunda disembunyikan.
3. **Hasil yang Diharapkan**: Seluruh perubahan status tampil secara realtime melalui Supabase Realtime tanpa perlu menarik layar (*pull-to-refresh*). *(Telah diverifikasi pada pengujian Langkah 8)*.

### D. Notifikasi Push Saat Hampir Giliran & Dipanggil (`US-05`)
1. Pastikan Database Webhook (`tickets` UPDATE dan `queue_sessions` UPDATE) menuju Edge Function `notify-queue` telah aktif.
2. Masuk sebagai Pelanggan di HP fisik Android, setujui modal manfaat notifikasi dan izin sistem Android, lalu ambil nomor antrean.
3. Tekan tombol *Home* agar aplikasi berada di latar belakang (*background*).
4. Panggil antrean dari Dasbor Pemilik (atau jalankan `npm run sim:sebentar` lalu `npm run sim:giliran`).
5. **Hasil yang Diharapkan**: Notifikasi Android muncul pada channel prioritas tinggi `"antrean"` dengan pesan *"Giliran hampir tiba..."* dan *"Giliran Anda sekarang! Datang dalam X menit"*. Mengetuk notifikasi langsung mengarahkan aplikasi ke tab **Tiket**.

### E. Ketahanan Mode Pesawat / Offline (`US-08`)
1. Saat Pelanggan memiliki tiket aktif dan berada di tab **Tiket**, aktifkan **Mode Pesawat (Airplane Mode)** atau matikan Wi-Fi & data seluler di HP.
2. Tutup dan buka kembali tab **Tiket** atau tarik layar untuk menyegarkan.
3. **Hasil yang Diharapkan**:
   - Data tiket terakhir tetap tampil dari cache SQLite (`active_ticket`) disertai banner kuning: **`Offline. Terakhir diperbarui pukul HH:mm WIB`**.
   - Tombol **Saya butuh waktu** dan **Batalkan** otomatis dinonaktifkan (`disabled`) selama offline.
   - Saat Mode Pesawat dimatikan (online kembali), banner offline hilang, tombol kembali aktif, dan posisi antrean disinkronkan ulang secara otomatis.

