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
