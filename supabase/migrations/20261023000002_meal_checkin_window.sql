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
  if (now() at time zone 'Asia/Kolkata') > p_meal_date + v_slot.ends_at then
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
