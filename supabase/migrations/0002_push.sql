-- AntriYuk: Tambah kolom called_notified_at pada tabel public.tickets
-- Digunakan oleh Edge Function notify-queue untuk mencegah pengiriman push notification ganda
-- apabila webhook database diulang (idempotency guard).

alter table public.tickets
  add column if not exists called_notified_at timestamptz;

