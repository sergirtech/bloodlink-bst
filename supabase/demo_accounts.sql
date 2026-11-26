-- ════════════════════════════════════════════════════════════════
--  Comptes de demo (executa-ho DESPRÉS de migrations/002_auth_qr.sql)
--
--  1. A l'app, registra dos comptes amb «Registra't aquí»:
--       · un per al donant de demo (p. ex. el teu correu)
--       · un per al personal del BST (un altre correu)
--  2. Canvia els dos correus de sota i executa aquest fitxer al SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- Personal del BST: dona accés al backoffice (#/backoffice) i treu el perfil de donant
insert into staff (user_id, full_name, center_code)
select id, 'Personal BST', 'BST-MOB-UPC' from auth.users where email = 'personal@exemple.cat'
on conflict (user_id) do nothing;

delete from donors
where auth_user_id = (select id from auth.users where email = 'personal@exemple.cat')
  and not exists (select 1 from appointments a where a.donor_id = donors.id)
  and not exists (select 1 from donations d where d.donor_id = donors.id);

-- Donant de demo: enllaça el compte nou amb Marc Vila (BST-84920), que ja té historial
delete from donors
where auth_user_id = (select id from auth.users where email = 'donant@exemple.cat')
  and id <> 'BST-84920'
  and not exists (select 1 from appointments a where a.donor_id = donors.id)
  and not exists (select 1 from donations d where d.donor_id = donors.id);

update donors set auth_user_id = (select id from auth.users where email = 'donant@exemple.cat')
where id = 'BST-84920'
  and exists (select 1 from auth.users where email = 'donant@exemple.cat');
