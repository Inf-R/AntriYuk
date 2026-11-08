-- AntriYuk: Jadwalkan private.close_stale_sessions() tiap pukul 00:00 WIB (17:00 UTC)
-- [VERIFIKASI: ketersediaan ekstensi pg_cron, nama skema, dan fungsi cron.schedule() perlu diverifikasi di dokumentasi resmi Supabase Cron / pg_cron]

create extension if not exists pg_cron;

-- Hapus jadwal lama bila sudah ada dengan nama yang sama agar idempoten
do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'antriyuk-close-stale-sessions'
  ) then
    perform cron.unschedule('antriyuk-close-stale-sessions');
  end if;
end $$;

-- 00:00 WIB = 17:00 UTC (WIB adalah UTC+7)
select cron.schedule(
  'antriyuk-close-stale-sessions',
  '0 17 * * *',
  $cron$select private.close_stale_sessions();$cron$
);

