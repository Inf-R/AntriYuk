-- AntriYuk: migrasi awal (0001_init_antriyuk.sql)
-- Jalankan di Supabase SQL Editor (proyek dev dulu), atau lewat Supabase CLI.

-- ============================================================
-- 1. TABEL
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  role text not null check (role in ('customer', 'owner')),
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade, -- unique = 1 pemilik 1 usaha
  name text not null check (char_length(name) between 2 and 80),
  category text not null check (category in ('klinik', 'barbershop', 'bengkel', 'warung_makan', 'lainnya')),
  address text check (char_length(address) <= 200),
  avg_service_minutes int not null default 10 check (avg_service_minutes between 1 and 240),
  grace_minutes int not null default 5 check (grace_minutes between 1 and 30), -- masa tunggu setelah dipanggil, diatur pemilik
  is_queue_open boolean not null default false, -- hanya diubah oleh fungsi open_queue/close_queue
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.queue_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  queue_date date not null,
  last_number int not null default 0,     -- nomor terakhir yang dibagikan
  current_number int not null default 0,  -- nomor yang sedang dilayani
  waiting_count int not null default 0,   -- jumlah tiket berstatus waiting
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (business_id, queue_date)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.queue_sessions(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  number int not null,
  sort_key numeric not null, -- urutan panggil; sama dengan number sampai tiket ditunda
  defer_count int not null default 0 check (defer_count between 0 and 2),
  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'done', 'cancelled', 'no_show', 'expired')),
  created_at timestamptz not null default now(),
  called_at timestamptz,
  done_at timestamptz,
  cancelled_at timestamptz,
  near_notified_at timestamptz, -- penanda push "giliran hampir tiba" sudah terkirim
  unique (session_id, number)
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

-- Maksimal 1 tiket aktif per pelanggan per usaha
create unique index one_active_ticket
  on public.tickets (business_id, customer_id)
  where status in ('waiting', 'called');

create index tickets_queue_idx on public.tickets (session_id, status, sort_key);
create index tickets_customer_idx on public.tickets (customer_id, status);
create index tickets_history_idx on public.tickets (customer_id, created_at desc);
create index tickets_done_idx on public.tickets (business_id, done_at desc) where status = 'done';
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ============================================================
-- 2. TRIGGER
-- ============================================================

create function private.set_updated_at() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger businesses_updated_at before update on public.businesses
  for each row execute function private.set_updated_at();

-- Profil dibuat otomatis saat user mendaftar. Role diambil dari metadata pendaftaran.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
  v_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  if v_role not in ('customer', 'owner') then
    v_role := 'customer';
  end if;
  insert into public.profiles (id, display_name, role)
  values (new.id, left(coalesce(v_name, split_part(new.email, '@', 1), 'Pengguna'), 50), v_role);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ============================================================
-- 3. FUNGSI INTERNAL (tidak bisa dipanggil dari aplikasi)
-- ============================================================

-- Menutup sesi: tiket yang tersisa menjadi expired.
create function private.close_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_business uuid;
begin
  update public.queue_sessions
     set status = 'closed', closed_at = now(), waiting_count = 0, updated_at = now()
   where id = p_session_id and status = 'open'
  returning business_id into v_business;

  if v_business is null then
    return;
  end if;

  update public.tickets set status = 'expired'
   where session_id = p_session_id and status in ('waiting', 'called');

  update public.businesses set is_queue_open = false, updated_at = now()
   where id = v_business;
end $$;

-- Menutup sesi hari sebelumnya yang lupa ditutup (dijadwalkan lewat pg_cron tiap tengah malam WIB).
create function private.close_stale_sessions() returns void
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  for r in select id from public.queue_sessions where status = 'open' and queue_date < v_today loop
    perform private.close_session(r.id);
  end loop;
end $$;

-- Rata-rata lama layanan: 20 tiket selesai terakhir, tiap durasi dibatasi 1-30 menit.
create function private.avg_minutes(p_business_id uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case when count(*) >= 5 then round(avg(m))::int end
       from (
         select greatest(1, least(30, extract(epoch from (done_at - called_at)) / 60)) as m
           from public.tickets
          where business_id = p_business_id and status = 'done'
            and called_at is not null and done_at is not null
          order by done_at desc
          limit 20
       ) t),
    (select avg_service_minutes from public.businesses where id = p_business_id),
    10
  )
$$;

-- ============================================================
-- 4. FUNGSI RPC (dipanggil aplikasi)
-- ============================================================

-- ---------- Pemilik: buka antrean ----------
create function public.open_queue(p_business_id uuid) returns public.queue_sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_session public.queue_sessions;
  r record;
begin
  perform 1 from public.businesses where id = p_business_id and owner_id = auth.uid() for update;
  if not found then raise exception 'NOT_OWNER'; end if;

  for r in select id from public.queue_sessions
            where business_id = p_business_id and status = 'open' and queue_date < v_today loop
    perform private.close_session(r.id);
  end loop;

  insert into public.queue_sessions (business_id, queue_date)
  values (p_business_id, v_today)
  on conflict (business_id, queue_date)
  do update set status = 'open', closed_at = null, updated_at = now()
  returning * into v_session;

  update public.businesses set is_queue_open = true where id = p_business_id;
  return v_session;
end $$;

-- ---------- Pemilik: tutup antrean ----------
create function public.close_queue(p_business_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_session_id uuid;
begin
  perform 1 from public.businesses where id = p_business_id and owner_id = auth.uid() for update;
  if not found then raise exception 'NOT_OWNER'; end if;

  select id into v_session_id from public.queue_sessions
   where business_id = p_business_id and status = 'open' for update;
  if v_session_id is not null then
    perform private.close_session(v_session_id);
  end if;
end $$;

-- ---------- Pelanggan: ambil nomor ----------
create function public.take_ticket(p_business_id uuid) returns public.tickets
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_session public.queue_sessions;
  v_ticket public.tickets;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'customer') then
    raise exception 'ONLY_CUSTOMER';
  end if;

  -- Kunci baris sesi: dua pelanggan yang menekan bersamaan akan antre satu per satu.
  select * into v_session from public.queue_sessions
   where business_id = p_business_id and status = 'open' and queue_date = v_today
   for update;
  if not found then raise exception 'QUEUE_CLOSED'; end if;

  if (select count(*) from public.tickets
       where customer_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'RATE_LIMITED';
  end if;

  if (select count(*) from public.tickets
       where customer_id = auth.uid() and status = 'no_show'
         and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'TOO_MANY_NO_SHOWS';
  end if;

  if exists (select 1 from public.tickets
              where business_id = p_business_id and customer_id = auth.uid()
                and status in ('waiting', 'called')) then
    raise exception 'ALREADY_HAS_TICKET';
  end if;

  update public.queue_sessions
     set last_number = last_number + 1, waiting_count = waiting_count + 1, updated_at = now()
   where id = v_session.id
  returning * into v_session;

  insert into public.tickets (session_id, business_id, customer_id, number, sort_key)
  values (v_session.id, p_business_id, auth.uid(), v_session.last_number, v_session.last_number)
  returning * into v_ticket;

  return v_ticket;
end $$;

-- ---------- Pelanggan: batalkan tiket ----------
create function public.cancel_ticket(p_ticket_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_session_id uuid;
  v_ticket public.tickets;
begin
  select session_id into v_session_id from public.tickets
   where id = p_ticket_id and customer_id = auth.uid();
  if v_session_id is null then raise exception 'TICKET_NOT_FOUND'; end if;

  -- Urutan kunci selalu sesi dulu, baru tiket (mencegah deadlock).
  perform 1 from public.queue_sessions where id = v_session_id for update;

  select * into v_ticket from public.tickets
   where id = p_ticket_id and customer_id = auth.uid() for update;
  if v_ticket.status <> 'waiting' then raise exception 'CANNOT_CANCEL'; end if;

  update public.tickets set status = 'cancelled', cancelled_at = now() where id = p_ticket_id;
  update public.queue_sessions
     set waiting_count = waiting_count - 1, updated_at = now()
   where id = v_session_id;
end $$;

-- ---------- Pelanggan: tunda tiket ("Saya butuh waktu") ----------
-- Tiket bergeser mundur 3 posisi, maksimal 2 kali per tiket, hanya sebelum dipanggil.
create function public.defer_ticket(p_ticket_id uuid) returns public.tickets
language plpgsql security definer set search_path = '' as $$
declare
  c_shift constant int := 3;
  v_session_id uuid;
  v_ticket public.tickets;
  v_behind int;
  v_new_key numeric;
begin
  select session_id into v_session_id from public.tickets
   where id = p_ticket_id and customer_id = auth.uid();
  if v_session_id is null then raise exception 'TICKET_NOT_FOUND'; end if;

  -- Urutan kunci: sesi dulu, baru tiket.
  perform 1 from public.queue_sessions where id = v_session_id and status = 'open' for update;
  if not found then raise exception 'QUEUE_CLOSED'; end if;

  select * into v_ticket from public.tickets
   where id = p_ticket_id and customer_id = auth.uid() for update;
  if v_ticket.status <> 'waiting' then raise exception 'CANNOT_DEFER'; end if;
  if v_ticket.defer_count >= 2 then raise exception 'DEFER_LIMIT'; end if;

  select count(*) into v_behind from public.tickets
   where session_id = v_session_id and status = 'waiting' and sort_key > v_ticket.sort_key;
  if v_behind = 0 then raise exception 'NOTHING_BEHIND'; end if;

  if v_behind <= c_shift then
    -- Tiket di belakang kurang dari 3: pindah ke urutan paling akhir.
    select max(sort_key) + 1 into v_new_key from public.tickets
     where session_id = v_session_id and status = 'waiting';
  else
    -- Selipkan tepat di antara tiket ke-3 dan ke-4 di belakang.
    select (a.sort_key + a.next_key) / 2 into v_new_key from (
      select sort_key, lead(sort_key) over (order by sort_key) as next_key
        from public.tickets
       where session_id = v_session_id and status = 'waiting' and sort_key > v_ticket.sort_key
       order by sort_key
      offset c_shift - 1 limit 1
    ) a;
  end if;

  update public.tickets
     set sort_key = v_new_key, defer_count = defer_count + 1, near_notified_at = null
   where id = p_ticket_id
  returning * into v_ticket;

  update public.queue_sessions set updated_at = now() where id = v_session_id;
  return v_ticket;
end $$;

-- ---------- Pemilik: panggil berikutnya (otomatis menyelesaikan yang sebelumnya) ----------
create function public.call_next(p_business_id uuid, p_previous text default 'done') returns public.tickets
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_session public.queue_sessions;
  v_next public.tickets;
begin
  perform 1 from public.businesses where id = p_business_id and owner_id = auth.uid();
  if not found then raise exception 'NOT_OWNER'; end if;

  select * into v_session from public.queue_sessions
   where business_id = p_business_id and status = 'open' and queue_date = v_today
   for update;
  if not found then raise exception 'QUEUE_CLOSED'; end if;

  if p_previous not in ('done', 'no_show') then raise exception 'INVALID_OUTCOME'; end if;

  update public.tickets set status = p_previous, done_at = now()
   where session_id = v_session.id and status = 'called';

  select * into v_next from public.tickets
   where session_id = v_session.id and status = 'waiting'
   order by sort_key limit 1 for update;

  if not found then
    update public.queue_sessions set updated_at = now() where id = v_session.id;
    return null; -- antrean kosong
  end if;

  update public.tickets set status = 'called', called_at = now()
   where id = v_next.id returning * into v_next;

  update public.queue_sessions
     set current_number = v_next.number, waiting_count = waiting_count - 1, updated_at = now()
   where id = v_session.id;

  return v_next;
end $$;

-- ---------- Pemilik: tandai tidak hadir ----------
create function public.mark_no_show(p_ticket_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
begin
  select * into v_ticket from public.tickets t
   where t.id = p_ticket_id
     and exists (select 1 from public.businesses b where b.id = t.business_id and b.owner_id = auth.uid());
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;

  perform 1 from public.queue_sessions where id = v_ticket.session_id for update;

  update public.tickets set status = 'no_show', done_at = now()
   where id = p_ticket_id and status = 'called';
  if not found then raise exception 'CANNOT_MARK_NO_SHOW'; end if;

  update public.queue_sessions set updated_at = now() where id = v_ticket.session_id;
end $$;

-- ---------- Pemilik: selesaikan tiket (untuk pelanggan terakhir) ----------
create function public.finish_ticket(p_ticket_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
begin
  select * into v_ticket from public.tickets t
   where t.id = p_ticket_id
     and exists (select 1 from public.businesses b where b.id = t.business_id and b.owner_id = auth.uid());
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;

  perform 1 from public.queue_sessions where id = v_ticket.session_id for update;

  update public.tickets set status = 'done', done_at = now()
   where id = p_ticket_id and status = 'called';
  if not found then raise exception 'CANNOT_FINISH'; end if;

  update public.queue_sessions set updated_at = now() where id = v_ticket.session_id;
end $$;

-- ---------- Pelanggan: posisi dan estimasi ----------
create function public.my_position(p_ticket_id uuid)
returns table (
  ticket_number int,
  ticket_status text,
  current_number int,
  ahead int,
  est_minutes int,
  queue_status text,
  updated_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
  v_session public.queue_sessions;
  v_ahead int := 0;
  v_serving int := 0;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id and customer_id = auth.uid();
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;

  select * into v_session from public.queue_sessions where id = v_ticket.session_id;

  if v_ticket.status = 'waiting' then
    select count(*) into v_ahead from public.tickets
     where session_id = v_ticket.session_id and status = 'waiting' and sort_key < v_ticket.sort_key;
    select count(*) into v_serving from public.tickets
     where session_id = v_ticket.session_id and status = 'called';
  end if;

  return query select
    v_ticket.number,
    v_ticket.status,
    v_session.current_number,
    v_ahead,
    (v_ahead + v_serving) * private.avg_minutes(v_ticket.business_id),
    v_session.status,
    v_session.updated_at;
end $$;

-- ---------- Pemilik: daftar antrean aktif (dengan nama pelanggan) ----------
create function public.owner_queue(p_business_id uuid)
returns table (
  ticket_id uuid,
  number int,
  display_name text,
  status text,
  created_at timestamptz,
  called_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  perform 1 from public.businesses where id = p_business_id and owner_id = auth.uid();
  if not found then raise exception 'NOT_OWNER'; end if;

  return query
    select t.id, t.number, p.display_name, t.status, t.created_at, t.called_at
      from public.tickets t
      join public.queue_sessions s on s.id = t.session_id
      join public.profiles p on p.id = t.customer_id
     where t.business_id = p_business_id
       and s.queue_date = v_today
       and t.status in ('waiting', 'called')
     order by t.sort_key;
end $$;

-- ---------- Pemilik: ringkasan harian ----------
create function public.owner_summary(
  p_business_id uuid,
  p_date date default (now() at time zone 'Asia/Jakarta')::date
)
returns table (
  total int,
  done int,
  cancelled int,
  no_show int,
  expired int,
  avg_service_minutes numeric
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform 1 from public.businesses where id = p_business_id and owner_id = auth.uid();
  if not found then raise exception 'NOT_OWNER'; end if;

  return query
    select
      count(*)::int,
      (count(*) filter (where t.status = 'done'))::int,
      (count(*) filter (where t.status = 'cancelled'))::int,
      (count(*) filter (where t.status = 'no_show'))::int,
      (count(*) filter (where t.status = 'expired'))::int,
      round((avg(extract(epoch from (t.done_at - t.called_at)) / 60)
            filter (where t.status = 'done' and t.called_at is not null))::numeric, 1)
      from public.tickets t
      join public.queue_sessions s on s.id = t.session_id
     where t.business_id = p_business_id and s.queue_date = p_date;
end $$;

-- ---------- Push token ----------
create function public.register_push_token(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_token is null or char_length(p_token) not between 10 and 300 then
    raise exception 'INVALID_TOKEN';
  end if;

  -- Satu perangkat bisa berganti akun: token dipindahkan ke user yang sedang login.
  insert into public.push_tokens (user_id, token)
  values (auth.uid(), p_token)
  on conflict (token) do update set user_id = auth.uid(), updated_at = now();
end $$;

create function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

-- ---------- Hapus akun sendiri ----------
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  delete from auth.users where id = auth.uid(); -- cascade ke profil, usaha, sesi, tiket, token
end $$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.queue_sessions enable row level security;
alter table public.tickets enable row level security;
alter table public.push_tokens enable row level security; -- tanpa policy: hanya lewat RPC

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy businesses_select_all on public.businesses
  for select to authenticated using (true);

create policy businesses_insert_owner on public.businesses
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

create policy businesses_update_own on public.businesses
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy sessions_select_all on public.queue_sessions
  for select to authenticated using (true);

create policy tickets_select_own_or_business on public.tickets
  for select to authenticated
  using (
    customer_id = auth.uid()
    or business_id in (select id from public.businesses where owner_id = auth.uid())
  );

-- ============================================================
-- 6. IZIN (lapisan pertahanan kedua)
-- ============================================================

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles, public.businesses, public.queue_sessions, public.tickets to authenticated;

-- Role tidak bisa diubah: hanya display_name yang boleh di-update.
grant update (display_name) on public.profiles to authenticated;

-- Pemilik tidak bisa mengubah is_queue_open langsung; harus lewat open_queue/close_queue.
grant insert (owner_id, name, category, address, avg_service_minutes, grace_minutes) on public.businesses to authenticated;
grant update (name, category, address, avg_service_minutes, grace_minutes) on public.businesses to authenticated;

-- Semua fungsi tertutup dulu, lalu dibuka satu per satu hanya untuk user login.
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Izin minimal untuk fungsi trigger agar INSERT auth.users dan UPDATE businesses tidak gagal karena permission denied.
grant usage on schema private to authenticated, supabase_auth_admin;
grant execute on function private.set_updated_at() to authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;

grant execute on function public.open_queue(uuid) to authenticated;
grant execute on function public.close_queue(uuid) to authenticated;
grant execute on function public.take_ticket(uuid) to authenticated;
grant execute on function public.cancel_ticket(uuid) to authenticated;
grant execute on function public.defer_ticket(uuid) to authenticated;
grant execute on function public.call_next(uuid, text) to authenticated;
grant execute on function public.mark_no_show(uuid) to authenticated;
grant execute on function public.finish_ticket(uuid) to authenticated;
grant execute on function public.my_position(uuid) to authenticated;
grant execute on function public.owner_queue(uuid) to authenticated;
grant execute on function public.owner_summary(uuid, date) to authenticated;
grant execute on function public.register_push_token(text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- 7. REALTIME
-- ============================================================

alter publication supabase_realtime add table public.queue_sessions;
alter publication supabase_realtime add table public.tickets;
