# Dokumentasi Bukti Revisi Antarmuka (UI) AntriYuk

Dokumen ini merangkum seluruh perubahan tampilan AntriYuk dari Fase R0 hingga R5 yang mengacu pada pedoman desain dan gambar acuan visual, dengan tetap menjaga 100% logika bisnis, kontrak RPC Supabase, skema validasi Zod, penyimpanan SQLite offline, serta penjaga pintu navigasi (`NavigationGuard`).

---

## 1. Daftar File yang Diubah dan Dibuat

### A. Fondasi Tema & Komponen Presentasi (`src/lib/` & `src/components/`)
- `src/lib/theme.ts`: Sistem token desain lengkap (`colors`, `spacing`, `radii`, `sizes`, `shadows`, `motion`, `typography`) dengan mempertahankan seluruh nama token lama agar kompatibel mundur.
- `src/components/ui/Icon.tsx`: Pembungkus tunggal ikon `Ionicons` dengan dukungan aksesibilitas pembaca layar.
- `src/components/ui/CategoryIcon.tsx`: Pembungkus ikon kategori usaha dari `MaterialCommunityIcons` (`hospital-box-outline`, `content-cut`, `wrench-outline`, `silverware-fork-knife`, `storefront-outline`, dan `view-grid-outline`) beserta komponen `CategoryTile` (ubin 56 px berlatar `primarySoft`).
- `src/components/ui/useReducedMotion.ts`: Hook pembaca status `AccessibilityInfo.isReduceMotionEnabled()`.
- `src/components/ui/FadeInView.tsx`: Pembungkus transisi masuk (fade + geser ringan 200 ms, `Easing.out`) yang otomatis nonaktif bila *reduce motion* aktif.
- `src/components/ui/Screen.tsx`: Kerangka layar dengan `SafeAreaView`, `KeyboardAvoidingView`, `ScrollView`, slot `header`, dan slot `footer` menempel di bawah.
- `src/components/ui/ScreenHeader.tsx`: Kepala layar dengan judul di tengah (atau kiri), tombol kembali bulat putih berbayangan lembut (`IconButton`), dan slot aksi kanan.
- `src/components/ui/Button.tsx`: Tombol dengan varian `primary` (`#063C92`), `accent` (`#326DDA`), `secondary`, `dangerOutline`, `dangerGhost`, dan `ghost`; ukuran `m` (50 px), `l` (56 px), dan `xl` (60 px); umpan balik tekan skala `0,98`.
- `src/components/ui/Card.tsx`: Permukaan kartu putih (`radius: 20`, bayangan lembut), varian `default`, `tint`, dan `dark`, serta efek tekan skala `0,98` bila dapat diketuk.
- `src/components/ui/Chip.tsx`: Kapsul filter/pilihan dengan dukungan ikon `Ionicons` maupun ikon kategori `MaterialCommunityIcons`.
- `src/components/ui/StatusPill.tsx`: Pil status dengan kombinasi ikon + teks (`open`, `closed`, `waiting`, `almost`, `called`, `done`, `cancelled`, `no_show`, `expired`).
- `src/components/ui/StatTile.tsx`: Tile KPI (`filledPrimary`, `filledAccent`, `tint`, `neutral`, `card`) dengan dukungan lencana ikon berwarna status (`iconTone`).
- `src/components/ui/Input.tsx`: Kolom input setinggi 52 px berlatar `canvas` (`#EDF2F4`), berborder `accent` 2 px saat fokus, mendukung ikon kiri dan tombol tampil/sembunyikan sandi.
- `src/components/ui/OtpInput.tsx`: Enam kotak kode visual yang dikendalikan oleh satu `TextInput` tersembunyi agar logika state string `code` tetap sama.
- `src/components/ui/StepIndicator.tsx`: Indikator progres 3 langkah untuk pemulihan kata sandi.
- `src/components/ui/Banner.tsx`: Kotak pesan sebaris (`info`, `warning`, `success`, `danger`) dengan ikon dan tautan aksi opsional.
- `src/components/ui/EmptyState.tsx`: Komponen kondisi kosong/error dengan ilustrasi geometris, judul, deskripsi, dan tombol aksi.
- `src/components/ui/GeoIllustration.tsx`: Ilustrasi murni dari komposisi `View` geometris (`hero`, `empty`, `success`) menggunakan warna palet tanpa SVG atau aset eksternal.
- `src/components/ui/ListRow.tsx`: Baris daftar berikon dengan tinggi minimal 56 px dan chevron opsional.
- `src/components/ui/SectionTitle.tsx`: Judul bagian (`18 px` semi-tebal) beserta subjudul opsional.
- `src/components/ui/Skeleton.tsx`: Placeholder berdenyut halus (`Animated` opacity) yang menghormati *reduce motion*.
- `src/components/ui/TicketCard.tsx`: Kartu tiket berkepala `#063C92` dengan nomor putih berukuran besar (`displayHero`), pemisah tiket bergaris putus-putus dengan lekuk lingkaran `canvas` di kiri-kanan, dan tiga metrik sejajar.
- `src/components/ui/Timeline.tsx`: Alur posisi vertikal 4 tahap (`Nomor diambil`, `Menunggu`, `Hampir giliran`, `Dipanggil`) dengan indikator titik berdenyut halus pada tahap aktif.
- `src/components/ui/BottomTabs.tsx`: Bilah navigasi bawah 4 menu dengan sudut atas membulat, pil aktif `primarySoft`, dan penyembunyian otomatis pada rute non-tab (`usaha/[id]`, `onboarding`).
- `src/components/ui/Stepper.tsx`: Kontrol angka minus/plus dengan batas rentang (`1–240` dan `1–30`) yang menulis langsung ke state string layar.
- `src/components/ui/index.ts`: Barrel export seluruh komponen UI.
- `src/components/OfflineBanner.tsx`, `PushPermissionModal.tsx`, `GlobalErrorBoundary.tsx`, `ScreenPlaceholder.tsx`: Diselaraskan ke sistem komponen `ui` dan bebas emoji.

### B. Layar Autentikasi (`app/(auth)/`)
- `app/(auth)/_layout.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/daftar.tsx`
- `app/(auth)/verifikasi.tsx`
- `app/(auth)/lupa-password.tsx`

### C. Layar Pelanggan (`app/(pelanggan)/`)
- `app/(pelanggan)/_layout.tsx`
- `app/(pelanggan)/index.tsx`
- `app/(pelanggan)/usaha/[id].tsx`
- `app/(pelanggan)/tiket.tsx`
- `app/(pelanggan)/riwayat.tsx`
- `app/(pelanggan)/profil.tsx`

### D. Layar Pemilik Usaha (`app/(pemilik)/`) & Layar Umum (`app/`)
- `app/(pemilik)/_layout.tsx`
- `app/(pemilik)/index.tsx`
- `app/(pemilik)/ringkasan.tsx`
- `app/(pemilik)/pengaturan.tsx`
- `app/(pemilik)/onboarding.tsx`
- `app/(pemilik)/profil.tsx`
- `app/index.tsx`
- `app/kebijakan-privasi.tsx`

---

## 2. Keputusan Desain & Pemetaan dari Gambar Acuan

1. **Palet Warna & Kontras Aksesibilitas (WCAG AA >= 4,5:1)**:
   - Teks putih (`#FFFFFF`) hanya digunakan di atas latar `primary` (`#063C92`) dan `accent` (`#326DDA`).
   - Teks kecil dan sekunder menggunakan `slateText` (`#5F6B80`), sedangkan `muted` (`#8D99AE`) hanya digunakan untuk ikon nonaktif, garis pemisah, border, dan placeholder.
   - Nilai warna status di `theme.colors.status` dipertahankan untuk lencana ikon dan latar, ditambah `statusInk` untuk memastikan teks status berukuran kecil memiliki kontras di atas 4,5:1.
2. **Penyesuaian Elemen Acuan Visual ke Fitur Nyata Aplikasi**:
   - **Dihapus dari tampilan acuan** karena tidak ada di skema data aplikasi: rating bintang, bookmark, pemilih lokasi kota, lonceng notifikasi di header, foto sampul usaha & tombol ubah foto (diganti `CategoryTile`), foto profil & edit profil (diganti avatar berinisial), input jam operasional, grafik batang per jam di Ringkasan, serta menu profil fiktif (Informasi Akun, Bantuan, Tentang AntriYuk).
   - **Diselaraskan dengan skema database**: lima kategori (`Klinik Pratama`, `Barbershop`, `Bengkel`, `Warung Makan`, `Lainnya`), label status `Buka` / `Tutup`, nomor tiket berupa bilangan bulat (`42`, bukan `A042`), dan tab pelanggan bernama `Beranda`, `Antrean`, `Riwayat`, `Profil`.
   - **Ditambahkan dengan bahasa visual yang sama**: layar `Detail Usaha`, `Daftar`, `Verifikasi Kode`, `Lupa Kata Sandi`, `Onboarding Usaha`, seluruh 6 kondisi layar `Antrean Saya` (tidak punya tiket, menunggu, hampir giliran, dipanggil, tidak hadir, kedaluwarsa, serta mode offline dan batas tunda 2x), tombol `Tutup antrean` terpisah di bawah dasbor pemilik, kartu `Kedaluwarsa` di Ringkasan, kartu `Zona Berbahaya (Hapus Akun)` dengan modal konfirmasi ketik `HAPUS` di kedua profil, serta layar `Kebijakan Privasi`.
3. **Skala Font 130% & Area Sentuh**:
   - Semua tombol, chip (melalui `hitSlop`), dan kontrol memiliki target sentuh minimal `48x48 dp`.
   - Angka besar menggunakan `adjustsFontSizeToFit` dan `tabular-nums`, sedangkan kontainer kartu dan baris metrik menggunakan `minHeight` (bukan `height` kaku) agar tidak terpotong ketika ukuran huruf sistem Android diatur ke 130%.

---

## 3. Daftar File yang Sengaja Tidak Diubah

Sesuai aturan keras, file berikut **sama sekali tidak diubah**:
- `app/_layout.tsx` (penjaga pintu `NavigationGuard` dan penyedia sesi).
- Seluruh hook di `src/hooks/` (`useCustomerQueue.ts`, `useMyBusiness.ts`, `useMyTicket.ts`, `useOnline.ts`, `useOwnerSession.ts`, `usePushRegistration.ts`, `useSession.ts`, `index.ts`).
- `src/lib/supabase.ts`, `src/lib/validation.ts`, `src/lib/errors.ts`, `src/lib/logger.ts`, `src/lib/sentry.ts`, `src/lib/pushNotifications.ts`.
- `src/db/sqlite.ts` dan `src/types/database.ts`.
- Seluruh migrasi SQL di `supabase/migrations/`.

---

## 4. Saran Pengembangan yang Sengaja Ditunda (Membutuhkan Query / Skema Baru)

Beberapa elemen pada gambar acuan membutuhkan perubahan query, view, atau kolom database sehingga sengaja tidak diimplementasikan pada fase tampilan ini dan dicatat sebagai saran pengembangan berikutnya:
1. **Ringkasan Antrean Aktif di Kartu Beranda Pelanggan (`± X mnt • Y antrean`)**:
   - Saat ini `useBusinessesList` hanya membaca tabel `businesses`. Untuk menampilkan jumlah antrean menunggu dan estimasi langsung di kartu Beranda tanpa membebani klien dengan *N+1 query*, disarankan menambahkan *view* atau RPC ringan yang menggabungkan `businesses` dengan `queue_sessions` hari ini (`waiting_count`).
2. **Waktu Pengambilan Tiket (`created_at`) di Kartu Tiket Aktif**:
   - RPC `my_position` dan cache SQLite saat ini mengembalikan `updated_at` dan `called_at`. Bila ingin menampilkan jam pengambilan awal secara terpisah dari jam pembaruan terakhir saat offline, kolom `created_at` dapat ikut disimpan ke tabel SQLite `active_ticket`.
3. **Grafik Distribusi Antrean Harian per Jam di Ringkasan Pemilik**:
   - Membutuhkan RPC agregasi per jam (`date_trunc('hour', created_at)`) pada tabel `tickets` untuk sesi tanggal terpilih.
4. **Jam Operasional Usaha & Foto Profil/Usaha**:
   - Membutuhkan kolom tambahan pada tabel `businesses` (`opening_hours`, `photo_url`) serta konfigurasi bucket Supabase Storage.
