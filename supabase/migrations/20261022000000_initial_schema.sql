create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default 'Student',
  role text not null default 'student' check (role in ('student', 'staff', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.meal_slots (
  id uuid primary key default gen_random_uuid(),
  meal_key text not null unique check (meal_key in ('breakfast', 'lunch', 'dinner')),
  title text not null,
  starts_at time not null,
  ends_at time not null,
  cutoff_at time not null,
  sort_order smallint not null unique
);

create table if not exists public.meal_menus (
  id uuid primary key default gen_random_uuid(),
  meal_date date not null,
  meal_slot_id uuid not null references public.meal_slots(id) on delete cascade,
  menu_text text not null check (length(trim(menu_text)) between 2 and 500),
  notes text not null default '',
  is_vegetarian boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (meal_date, meal_slot_id)
);

create table if not exists public.dietary_preferences (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  preferences text[] not null default '{}',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  check (cardinality(preferences) <= 12),
  check (length(notes) <= 500)
);

create table if not exists public.meal_bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  meal_slot_id uuid not null references public.meal_slots(id) on delete restrict,
  meal_date date not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, meal_slot_id, meal_date)
);

create table if not exists public.meal_pass_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.meal_bookings(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_attendance (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.meal_bookings(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  meal_slot_id uuid not null references public.meal_slots(id) on delete restrict,
  meal_date date not null,
  scanned_by uuid not null references public.profiles(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  synced_from_offline boolean not null default false
);

create table if not exists public.rebate_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  amount_paise integer not null check (amount_paise <> 0),
  reason text not null check (length(trim(reason)) between 3 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  singleton boolean primary key default true check (singleton),
  monthly_meal_allowance integer not null default 60 check (monthly_meal_allowance > 0),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (singleton)
values (true)
on conflict (singleton) do nothing;

insert into public.meal_slots (meal_key, title, starts_at, ends_at, cutoff_at, sort_order)
values
  ('breakfast', 'Breakfast', '07:30', '09:00', '06:00', 1),
  ('lunch', 'Lunch', '12:30', '14:00', '10:00', 2),
  ('dinner', 'Dinner', '19:30', '21:00', '17:00', 3)
on conflict (meal_key) do update
set title = excluded.title,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    cutoff_at = excluded.cutoff_at,
    sort_order = excluded.sort_order;

insert into public.meal_menus (meal_date, meal_slot_id, menu_text, notes, is_vegetarian)
select
  (now() at time zone 'Asia/Kolkata')::date,
  slot.id,
  case slot.meal_key
    when 'breakfast' then 'Saffron poha · seasonal fruit · masala chai'
    when 'lunch' then 'Dal makhani · jeera rice · tandoori roti'
    else 'Paneer lababdar · millet khichdi · kheer'
  end,
  'Sample menu — replace this with the refectory menu.',
  true
from public.meal_slots as slot
on conflict (meal_date, meal_slot_id) do nothing;

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = required_role
  );
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('staff', 'admin')
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Student')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() = old.id then
    if new.role is distinct from old.role then
      raise exception 'You cannot change your own account role.';
    end if;
  elsif auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Only an administrator can update another profile.';
  end if;
  select users.email into new.email from auth.users as users where users.id = old.id;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

create or replace function public.book_meal(p_meal_slot_id uuid, p_meal_date date)
returns public.meal_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.meal_slots%rowtype;
  v_booking public.meal_bookings%rowtype;
  v_now_local timestamp := now() at time zone 'Asia/Kolkata';
begin
  if auth.uid() is null or not public.has_role('student') then
    raise exception 'Only signed-in students can book meals.';
  end if;
  if p_meal_date < v_now_local::date or p_meal_date > v_now_local::date + 30 then
    raise exception 'Choose a meal date between today and the next 30 days.';
  end if;

  select * into v_slot from public.meal_slots where id = p_meal_slot_id;
  if not found then raise exception 'Meal slot not found.'; end if;
  if p_meal_date + v_slot.cutoff_at <= v_now_local then
    raise exception 'The booking cutoff for this meal has passed.';
  end if;
  if not exists (
    select 1 from public.meal_menus
    where meal_date = p_meal_date and meal_slot_id = p_meal_slot_id
  ) then
    raise exception 'The menu for this meal has not been published yet.';
  end if;

  insert into public.meal_bookings (student_id, meal_slot_id, meal_date)
  values (auth.uid(), p_meal_slot_id, p_meal_date)
  on conflict (student_id, meal_slot_id, meal_date) do update
    set status = 'booked', redeemed_at = null, updated_at = now()
    where public.meal_bookings.redeemed_at is null
  returning * into v_booking;

  if not found then raise exception 'This meal has already been checked in.'; end if;
  return v_booking;
end;
$$;

create or replace function public.cancel_meal_booking(p_meal_slot_id uuid, p_meal_date date)
returns public.meal_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.meal_slots%rowtype;
  v_booking public.meal_bookings%rowtype;
  v_now_local timestamp := now() at time zone 'Asia/Kolkata';
begin
  if auth.uid() is null or not public.has_role('student') then
    raise exception 'Only signed-in students can cancel meals.';
  end if;
  select * into v_slot from public.meal_slots where id = p_meal_slot_id;
  if not found then raise exception 'Meal slot not found.'; end if;
  if p_meal_date + v_slot.cutoff_at <= v_now_local then
    raise exception 'The booking cutoff for this meal has passed.';
  end if;

  update public.meal_bookings
  set status = 'cancelled', updated_at = now()
  where student_id = auth.uid()
    and meal_slot_id = p_meal_slot_id
    and meal_date = p_meal_date
    and status = 'booked'
    and redeemed_at is null
  returning * into v_booking;
  if not found then raise exception 'No cancellable booking exists for this meal.'; end if;

  update public.meal_pass_tokens
  set revoked_at = now()
  where booking_id = v_booking.id and revoked_at is null;
  return v_booking;
end;
$$;

create or replace function public.issue_meal_pass(p_meal_slot_id uuid, p_meal_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.meal_bookings%rowtype;
  v_slot public.meal_slots%rowtype;
  v_token text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null or not public.has_role('student') then
    raise exception 'Only signed-in students can request a meal pass.';
  end if;
  select * into v_slot from public.meal_slots where id = p_meal_slot_id;
  if not found then raise exception 'Meal slot not found.'; end if;

  select * into v_booking
  from public.meal_bookings
  where student_id = auth.uid()
    and meal_slot_id = p_meal_slot_id
    and meal_date = p_meal_date
    and status = 'booked'
    and redeemed_at is null
  for update;
  if not found then raise exception 'Book this meal before requesting a pass.'; end if;
  if p_meal_date <> (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Meal passes are issued for today only.';
  end if;
  if (now() at time zone 'Asia/Kolkata') >
    p_meal_date + v_slot.ends_at
  then
    raise exception 'The meal pass window has expired.';
  end if;

  v_token := 'MS1.' || encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := (p_meal_date + v_slot.ends_at) at time zone 'Asia/Kolkata';

  update public.meal_pass_tokens
  set revoked_at = now()
  where booking_id = v_booking.id and revoked_at is null;
  insert into public.meal_pass_tokens (booking_id, token_hash, expires_at)
  values (v_booking.id, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires_at);

  return jsonb_build_object('token', v_token, 'expires_at', v_expires_at);
end;
$$;

create or replace function public.redeem_meal_pass(p_token text, p_synced_from_offline boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pass public.meal_pass_tokens%rowtype;
  v_booking public.meal_bookings%rowtype;
  v_slot public.meal_slots%rowtype;
  v_result jsonb;
  v_now_local timestamp := now() at time zone 'Asia/Kolkata';
begin
  if auth.uid() is null or not public.is_staff_or_admin() then
    raise exception 'Only refectory staff can check in a meal pass.';
  end if;
  if p_token is null or length(p_token) > 100 then
    raise exception 'The meal pass is invalid.';
  end if;

  select * into v_pass
  from public.meal_pass_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then raise exception 'Pass is expired, invalid, revoked, or already used.'; end if;

  select * into v_booking
  from public.meal_bookings
  where id = v_pass.booking_id
  for update;
  if not found or v_booking.status <> 'booked' or v_booking.redeemed_at is not null then
    raise exception 'This meal is not eligible for check-in.';
  end if;

  select * into v_slot from public.meal_slots where id = v_booking.meal_slot_id;
  if v_booking.meal_date <> v_now_local::date
    or v_now_local < v_booking.meal_date + v_slot.starts_at
    or v_now_local > v_booking.meal_date + v_slot.ends_at
  then
    raise exception 'This meal pass is outside the check-in window.';
  end if;

  update public.meal_pass_tokens
  set redeemed_at = now()
  where id = v_pass.id
    and revoked_at is null
    and redeemed_at is null
    and expires_at >= now()
  returning * into v_pass;
  if not found then raise exception 'Pass is expired, invalid, revoked, or already used.'; end if;

  update public.meal_bookings
  set redeemed_at = now(), updated_at = now()
  where id = v_booking.id and status = 'booked' and redeemed_at is null
  returning * into v_booking;
  if not found then raise exception 'This meal is not eligible for check-in.'; end if;

  insert into public.meal_attendance (
    booking_id, student_id, meal_slot_id, meal_date, scanned_by, synced_from_offline
  ) values (
    v_booking.id, v_booking.student_id, v_booking.meal_slot_id,
    v_booking.meal_date, auth.uid(), p_synced_from_offline
  );

  select jsonb_build_object(
    'student_name', profile.full_name,
    'meal', slot.title,
    'meal_date', v_booking.meal_date,
    'checked_in_at', now(),
    'synced_from_offline', p_synced_from_offline
  ) into v_result
  from public.profiles as profile
  join public.meal_slots as slot on slot.id = v_booking.meal_slot_id
  where profile.id = v_booking.student_id;
  return v_result;
end;
$$;

create or replace function public.staff_attendance_history(p_limit integer default 50)
returns table (
  attendance_id uuid,
  student_name text,
  meal_title text,
  meal_date date,
  checked_in_at timestamptz,
  synced_from_offline boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_staff_or_admin() then
    raise exception 'Only refectory staff can view attendance history.';
  end if;

  return query
  select attendance.id, profile.full_name, slot.title, attendance.meal_date,
    attendance.checked_in_at, attendance.synced_from_offline
  from public.meal_attendance as attendance
  join public.profiles as profile on profile.id = attendance.student_id
  join public.meal_slots as slot on slot.id = attendance.meal_slot_id
  order by attendance.checked_in_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

create or replace function public.staff_dietary_notes(p_meal_date date)
returns table (
  student_name text,
  meal_title text,
  preferences text[],
  notes text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_staff_or_admin() then
    raise exception 'Only refectory staff can view dietary notes.';
  end if;

  return query
  select profile.full_name, slot.title, preference.preferences, preference.notes
  from public.meal_bookings as booking
  join public.profiles as profile on profile.id = booking.student_id
  join public.meal_slots as slot on slot.id = booking.meal_slot_id
  join public.dietary_preferences as preference on preference.student_id = booking.student_id
  where booking.meal_date = p_meal_date
    and booking.status = 'booked'
    and (
      cardinality(preference.preferences) > 0
      or length(trim(preference.notes)) > 0
    )
  order by slot.sort_order, profile.full_name;
end;
$$;

alter table public.profiles enable row level security;
alter table public.meal_slots enable row level security;
alter table public.meal_menus enable row level security;
alter table public.dietary_preferences enable row level security;
alter table public.meal_bookings enable row level security;
alter table public.meal_pass_tokens enable row level security;
alter table public.meal_attendance enable row level security;
alter table public.rebate_entries enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
for select to authenticated using (id = (select auth.uid()) or public.has_role('admin'));
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists "authenticated read meal slots" on public.meal_slots;
create policy "authenticated read meal slots" on public.meal_slots
for select to authenticated using (true);
drop policy if exists "admin manage meal slots" on public.meal_slots;
create policy "admin manage meal slots" on public.meal_slots
for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists "authenticated read menus" on public.meal_menus;
create policy "authenticated read menus" on public.meal_menus
for select to authenticated using (true);
drop policy if exists "admin manage menus" on public.meal_menus;
create policy "admin manage menus" on public.meal_menus
for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists "students read own preferences" on public.dietary_preferences;
create policy "students read own preferences" on public.dietary_preferences
for select to authenticated using (
  student_id = (select auth.uid()) or public.has_role('admin')
);
drop policy if exists "students manage own preferences" on public.dietary_preferences;
create policy "students manage own preferences" on public.dietary_preferences
for all to authenticated using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()) and public.has_role('student'));

drop policy if exists "read bookings by role" on public.meal_bookings;
create policy "read bookings by role" on public.meal_bookings
for select to authenticated using (
  student_id = (select auth.uid()) or public.is_staff_or_admin()
);

drop policy if exists "read attendance by role" on public.meal_attendance;
create policy "read attendance by role" on public.meal_attendance
for select to authenticated using (
  student_id = (select auth.uid()) or public.is_staff_or_admin()
);

drop policy if exists "read rebates by role" on public.rebate_entries;
create policy "read rebates by role" on public.rebate_entries
for select to authenticated using (
  student_id = (select auth.uid()) or public.has_role('admin')
);
drop policy if exists "admin create rebates" on public.rebate_entries;
create policy "admin create rebates" on public.rebate_entries
for insert to authenticated with check (
  public.has_role('admin') and created_by = (select auth.uid())
);

drop policy if exists "authenticated read settings" on public.app_settings;
create policy "authenticated read settings" on public.app_settings
for select to authenticated using (true);
drop policy if exists "admin update settings" on public.app_settings;
create policy "admin update settings" on public.app_settings
for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

grant select, update on public.profiles to authenticated;
grant select on public.meal_slots, public.meal_menus, public.meal_bookings,
  public.meal_attendance, public.rebate_entries, public.app_settings to authenticated;
grant insert, update, delete on public.meal_slots, public.meal_menus to authenticated;
grant select, insert, update, delete on public.dietary_preferences to authenticated;
grant insert on public.rebate_entries to authenticated;
grant update on public.app_settings to authenticated;

revoke all on public.meal_pass_tokens from anon, authenticated;
revoke all on function public.book_meal(uuid, date) from public, anon;
revoke all on function public.cancel_meal_booking(uuid, date) from public, anon;
revoke all on function public.issue_meal_pass(uuid, date) from public, anon;
revoke all on function public.redeem_meal_pass(text, boolean) from public, anon;
revoke all on function public.staff_attendance_history(integer) from public, anon;
revoke all on function public.staff_dietary_notes(date) from public, anon;
grant execute on function public.book_meal(uuid, date) to authenticated;
grant execute on function public.cancel_meal_booking(uuid, date) to authenticated;
grant execute on function public.issue_meal_pass(uuid, date) to authenticated;
grant execute on function public.redeem_meal_pass(text, boolean) to authenticated;
grant execute on function public.staff_attendance_history(integer) to authenticated;
grant execute on function public.staff_dietary_notes(date) to authenticated;

create index if not exists meal_menus_date_idx on public.meal_menus (meal_date);
create index if not exists meal_bookings_date_slot_idx on public.meal_bookings (meal_date, meal_slot_id);
create index if not exists meal_attendance_date_slot_idx on public.meal_attendance (meal_date, meal_slot_id);
create index if not exists rebate_entries_student_created_idx on public.rebate_entries (student_id, created_at desc);
