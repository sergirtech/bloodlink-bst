-- ════════════════════════════════════════════════════════════════
--  BST App · Migració 002: autenticació, seguretat per usuari,
--  QR de check-in i reserves amb places limitades.
--  S'executa DESPRÉS de supabase/schema.sql. No esborra dades.
-- ════════════════════════════════════════════════════════════════

-- ── Donants: enllaç amb Supabase Auth, adreça i token del QR ─────
alter table donors
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists municipality text,
  add column if not exists district     text,
  add column if not exists postal_code  text,
  add column if not exists qr_token     uuid not null default gen_random_uuid();
alter table donors alter column blood_group drop not null;   -- es pot registrar sense saber-lo

update donors set municipality = 'Barcelona', district = 'Les Corts', postal_code = '08028'
where id = 'BST-84920' and municipality is null;

create sequence if not exists donor_seq start 10001;

-- ── Personal del BST (accés al backoffice). S'hi afegeix des de SQL. ──
create table if not exists staff (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  center_code text references centers(code),
  created_at  timestamptz not null default now()
);
alter table staff enable row level security;

-- ── Cites: token del QR i hora d'arribada ────────────────────────
alter table appointments
  add column if not exists checkin_token uuid not null default gen_random_uuid(),
  add column if not exists checked_in_at timestamptz;
create index if not exists appointments_center_start on appointments (center_code, scheduled_start);

-- ── Fòrum: l'autor és sempre el donant que ha iniciat sessió ─────
alter table forum_posts add column if not exists donor_id text references donors(id);

-- ── Funcions auxiliars ───────────────────────────────────────────
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid())
$$;

create or replace function public.my_donor_id() returns text
language sql stable security definer set search_path = public as $$
  select id from donors where auth_user_id = auth.uid()
$$;

-- Dies que cal esperar després de cada tipus de donació (també a src/lib/donor.js)
create or replace function public.wait_days(p_type text) returns int
language sql immutable set search_path = public as $$
  select case p_type when 'whole_blood' then 60 when 'plasma' then 14 when 'platelets' then 14 else 0 end
$$;

-- ── Alta de donant automàtica en registrar-se ────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into donors (id, auth_user_id, full_name, birth_date, blood_group, email, phone, zone,
                      reference_center_code, municipality, district, postal_code)
  values (
    'BST-' || nextval('donor_seq'),
    new.id,
    coalesce(nullif(trim(m->>'full_name'), ''), split_part(new.email, '@', 1)),
    case when m->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$' then (m->>'birth_date')::date end,
    case when m->>'blood_group' in ('0-','0+','A-','A+','B-','B+','AB-','AB+') then m->>'blood_group' end,
    new.email,
    nullif(trim(m->>'phone'), ''),
    nullif(m->>'zone', ''),
    (select code from centers where code = m->>'reference_center_code'),
    nullif(trim(m->>'municipality'), ''),
    nullif(trim(m->>'district'), ''),
    nullif(trim(m->>'postal_code'), '')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Fòrum: l'autor el posa la base de dades, no el navegador ─────
create or replace function public.forum_set_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select id, full_name into new.donor_id, new.author from donors where auth_user_id = auth.uid();
  if new.donor_id is null then raise exception 'Cal un perfil de donant per publicar'; end if;
  return new;
end $$;

drop trigger if exists forum_set_author on forum_posts;
create trigger forum_set_author before insert on forum_posts
  for each row execute function public.forum_set_author();

-- ── Seguretat (RLS): substitueix les polítiques obertes de la demo ──
drop policy if exists demo_read  on centers;
drop policy if exists demo_read  on donors;
drop policy if exists demo_all   on appointments;
drop policy if exists demo_all   on donations;
drop policy if exists demo_read  on forum_posts;
drop policy if exists demo_write on forum_posts;

create policy centers_read    on centers      for select using (true);
create policy staff_self      on staff        for select to authenticated using (user_id = auth.uid());
create policy donors_read     on donors       for select to authenticated using (auth_user_id = auth.uid() or is_staff());
create policy donors_update   on donors       for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy appts_read      on appointments for select to authenticated using (donor_id = my_donor_id() or is_staff());
create policy appts_staff     on appointments for update to authenticated using (is_staff()) with check (is_staff());
create policy donations_read  on donations    for select to authenticated using (donor_id = my_donor_id() or is_staff());
create policy posts_read      on forum_posts  for select to authenticated using (true);
create policy posts_insert    on forum_posts  for insert to authenticated with check (donor_id = my_donor_id());

-- El donant només pot canviar les seves dades de contacte (ni l'ID, ni el token, ni el compte)
revoke update on donors from anon, authenticated;
grant update (full_name, birth_date, blood_group, phone, zone, reference_center_code, municipality, district, postal_code)
  on donors to authenticated;
-- Les cites i donacions es creen només amb les funcions de sota
revoke insert, delete on appointments, donations from anon, authenticated;
revoke update on donations from anon, authenticated;

-- ── Reserves ─────────────────────────────────────────────────────
-- Places ocupades per franja en un punt (sense revelar qui les ha reservat)
create or replace function public.slot_usage(p_center text, p_from timestamptz, p_to timestamptz)
returns table (slot_start timestamptz, booked int)
language sql stable security definer set search_path = public as $$
  select scheduled_start, count(*)::int from appointments
  where center_code = p_center and status in ('scheduled', 'checked_in')
    and scheduled_start >= p_from and scheduled_start < p_to
  group by scheduled_start
$$;

create or replace function public.book_appointment(
  p_type text, p_center text, p_start timestamptz,
  p_name text, p_phone text, p_email text, p_record jsonb
) returns appointments
language plpgsql security definer set search_path = public as $$
declare
  d donors; a appointments; v_id text; v_last donations;
  capacity constant int := 2;     -- donants per franja i punt
begin
  select * into d from donors where auth_user_id = auth.uid();
  if d.id is null then raise exception 'Has d''iniciar sessió com a donant'; end if;
  if p_start <= now() then raise exception 'Aquesta hora ja ha passat. Tria''n una altra.'; end if;
  if p_start > now() + interval '60 days' then raise exception 'Només es pot reservar amb 60 dies d''antelació'; end if;
  if not exists (select 1 from centers where code = p_center) then raise exception 'Punt de donació desconegut'; end if;

  if exists (select 1 from appointments where donor_id = d.id and status in ('scheduled', 'checked_in') and scheduled_start > now() - interval '3 hours') then
    raise exception 'Ja tens una cita programada. Cancel·la-la abans de reservar-ne una altra.';
  end if;

  select * into v_last from donations where donor_id = d.id order by performed_at desc limit 1;
  if v_last.id is not null and p_start < v_last.performed_at + make_interval(days => wait_days(v_last.donation_type)) then
    raise exception 'Encara no pots tornar a donar. Podràs a partir del %',
      to_char((v_last.performed_at + make_interval(days => wait_days(v_last.donation_type))) at time zone 'Europe/Madrid', 'DD/MM/YYYY');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_center || p_start::text));
  if (select count(*) from appointments where center_code = p_center and scheduled_start = p_start
      and status in ('scheduled', 'checked_in')) >= capacity then
    raise exception 'Aquesta franja s''acaba d''omplir. Tria''n una altra.';
  end if;

  loop
    v_id := 'CITA-' || to_char(p_start at time zone 'Europe/Madrid', 'YYYY') || '-' || (floor(random() * 900000) + 100000)::int;
    exit when not exists (select 1 from appointments where id = v_id);
  end loop;

  insert into appointments (id, donor_id, donor_name, phone, email, donation_type, center_code, scheduled_start, status, record)
  values (v_id, d.id, coalesce(nullif(trim(p_name), ''), d.full_name), p_phone, p_email, p_type, p_center, p_start, 'scheduled',
          jsonb_set(coalesce(p_record, '{}'::jsonb), '{appointment,appointment_id}', to_jsonb(v_id)))
  returning * into a;
  return a;
end $$;

create or replace function public.cancel_my_appointment(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update appointments set status = 'cancelled'
  where id = p_id and donor_id = my_donor_id() and status = 'scheduled';
  if not found then raise exception 'Aquesta cita ja no es pot cancel·lar'; end if;
end $$;

-- Nou token de QR (invalida el QR anterior, per exemple si s'ha compartit)
create or replace function public.rotate_my_qr() returns uuid
language sql security definer set search_path = public as $$
  update donors set qr_token = gen_random_uuid() where auth_user_id = auth.uid() returning qr_token
$$;

-- ── Personal del BST ─────────────────────────────────────────────
-- Comprova un QR escanejat: el donant i (si n'hi ha) la cita han de coincidir amb els tokens
create or replace function public.verify_qr(p_donor_id text, p_token uuid, p_appointment_id text default null, p_appointment_token uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d donors; a appointments;
begin
  if not is_staff() then raise exception 'Només el personal del BST pot validar QR'; end if;
  select * into d from donors where id = p_donor_id and qr_token = p_token;
  if d.id is null then raise exception 'QR no vàlid: el donant no existeix o el codi s''ha renovat'; end if;
  if p_appointment_id is not null then
    select * into a from appointments where id = p_appointment_id and donor_id = d.id and checkin_token = p_appointment_token;
    if a.id is null then raise exception 'QR no vàlid: la cita no correspon a aquest donant'; end if;
  end if;
  return jsonb_build_object(
    'donor', to_jsonb(d) - 'qr_token' - 'auth_user_id',
    'appointment', case when a.id is null then null else to_jsonb(a) - 'checkin_token' end
  );
end $$;

create or replace function public.check_in_appointment(p_id text) returns appointments
language plpgsql security definer set search_path = public as $$
declare a appointments;
begin
  if not is_staff() then raise exception 'Només el personal del BST'; end if;
  update appointments set status = 'checked_in', checked_in_at = now()
  where id = p_id and status = 'scheduled' returning * into a;
  if a.id is null then raise exception 'La cita no està programada (ja s''ha processat o cancel·lat)'; end if;
  return a;
end $$;

-- Marca la cita com a feta i crea la donació, tot alhora
create or replace function public.complete_appointment(p_id text) returns donations
language plpgsql security definer set search_path = public as $$
declare a appointments; d donations; v_id text;
begin
  if not is_staff() then raise exception 'Només el personal del BST'; end if;
  select * into a from appointments where id = p_id for update;
  if a.id is null then raise exception 'Cita desconeguda'; end if;
  if a.status not in ('scheduled', 'checked_in') then raise exception 'Aquesta cita ja està tancada'; end if;
  loop
    v_id := 'DON-' || to_char(now() at time zone 'Europe/Madrid', 'YYYY-MMDD') || (floor(random() * 9000) + 1000)::int;
    exit when not exists (select 1 from donations where id = v_id);
  end loop;
  insert into donations (id, donor_id, donation_type, performed_at, volume_ml, center_code, appointment_id)
  values (v_id, a.donor_id, a.donation_type, now(),
          case a.donation_type when 'whole_blood' then 450 when 'plasma' then 600 when 'platelets' then 250 end,
          a.center_code, a.id)
  returning * into d;
  update appointments set status = 'completed', checked_in_at = coalesce(checked_in_at, now()) where id = a.id;
  return d;
end $$;

-- Només els usuaris amb sessió poden cridar les funcions
revoke execute on function public.is_staff(), public.my_donor_id(), public.handle_new_user(), public.forum_set_author(),
  public.slot_usage(text, timestamptz, timestamptz), public.book_appointment(text, text, timestamptz, text, text, text, jsonb),
  public.cancel_my_appointment(text), public.rotate_my_qr(), public.verify_qr(text, uuid, text, uuid),
  public.check_in_appointment(text), public.complete_appointment(text)
  from public, anon;
grant execute on function public.is_staff(), public.my_donor_id(),
  public.slot_usage(text, timestamptz, timestamptz), public.book_appointment(text, text, timestamptz, text, text, text, jsonb),
  public.cancel_my_appointment(text), public.rotate_my_qr(), public.verify_qr(text, uuid, text, uuid),
  public.check_in_appointment(text), public.complete_appointment(text)
  to authenticated;
-- ════════════════════════════════════════════════════════════════
--  BST App · Migració 003 (NOMÉS PER A LA DEMO)
--  Confirma el correu automàticament en registrar-se, així es pot entrar
--  a l'app sense clicar l'enllaç del correu. Treu-ho abans de producció:
--    drop trigger auto_confirm_email on auth.users;
--  S'executa DESPRÉS de 002_auth_qr.sql.
-- ════════════════════════════════════════════════════════════════

create or replace function public.auto_confirm_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end $$;
revoke execute on function public.auto_confirm_email() from public, anon, authenticated;

drop trigger if exists auto_confirm_email on auth.users;
create trigger auto_confirm_email before insert on auth.users
  for each row execute function public.auto_confirm_email();

-- Confirma els comptes que ja existeixen
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;

-- Perfil de donant per als comptes creats abans de la migració 002
insert into donors (id, auth_user_id, full_name, birth_date, blood_group, email, phone, zone,
                    reference_center_code, municipality, district, postal_code)
select
  'BST-' || nextval('donor_seq'),
  u.id,
  coalesce(nullif(trim(m->>'full_name'), ''), split_part(u.email, '@', 1)),
  case when m->>'birth_date' ~ '^\d{4}-\d{2}-\d{2}$' then (m->>'birth_date')::date end,
  case when m->>'blood_group' in ('0-','0+','A-','A+','B-','B+','AB-','AB+') then m->>'blood_group' end,
  u.email,
  nullif(trim(m->>'phone'), ''),
  nullif(m->>'zone', ''),
  (select code from centers where code = m->>'reference_center_code'),
  nullif(trim(m->>'municipality'), ''),
  nullif(trim(m->>'district'), ''),
  nullif(trim(m->>'postal_code'), '')
from auth.users u
cross join lateral (select coalesce(u.raw_user_meta_data, '{}'::jsonb) as m) meta
where not exists (select 1 from donors d where d.auth_user_id = u.id)
  and not exists (select 1 from staff s where s.user_id = u.id);
