-- ════════════════════════════════════════════════════════════════
--  BST App · Esquema de base de dades (Supabase / PostgreSQL)
--  Executa aquest fitxer sencer a Supabase → SQL Editor → Run.
--  Es pot tornar a executar: esborra i recrea les taules de la demo.
-- ════════════════════════════════════════════════════════════════

drop view if exists v_ratings_by_center, v_kpis cascade;
drop table if exists forum_posts, donations, appointments, donors, centers cascade;

-- Punts de donació (hospitals, unitats mòbils, punts fixos)
create table centers (
  code        text primary key,
  name        text not null,
  kind        text not null check (kind in ('hospital', 'mobile_unit', 'fixed_point')),
  address     text,
  zone        text not null
);

-- Donants registrats a l'app
create table donors (
  id                    text primary key,            -- BST-84920
  full_name             text not null,
  birth_date            date,
  blood_group           text not null check (blood_group in ('0-','0+','A-','A+','B-','B+','AB-','AB+')),
  email                 text,
  phone                 text,
  zone                  text,
  reference_center_code text references centers(code),
  created_at            timestamptz not null default now()
);

-- Cites reservades des de l'app
create table appointments (
  id               text primary key,                  -- CITA-2026-123456
  donor_id         text not null references donors(id),
  donor_name       text not null,
  phone            text,
  email            text,
  donation_type    text not null check (donation_type in ('whole_blood','plasma','platelets','tissue_marrow')),
  center_code      text not null references centers(code),
  scheduled_start  timestamptz not null,
  status           text not null default 'scheduled'
                   check (status in ('scheduled','checked_in','completed','cancelled','no_show')),
  record           jsonb,                             -- registre JSON complet (format BST v1.0)
  created_at       timestamptz not null default now()
);

-- Donacions completades (les registra el personal del BST des del backoffice)
create table donations (
  id              text primary key,                   -- DON-2026-112501
  donor_id        text not null references donors(id),
  donation_type   text not null check (donation_type in ('whole_blood','plasma','platelets','tissue_marrow')),
  performed_at    timestamptz not null default now(),
  volume_ml       integer,
  center_code     text not null references centers(code),
  appointment_id  text references appointments(id),
  isbt128_id      text                                -- l'assigna el BST a l'extracció
);

-- Missatges del fòrum amb valoracions d'1 a 5
create table forum_posts (
  id                   bigint generated always as identity primary key,
  author               text not null,
  place                text,
  zone                 text not null,
  center_code          text references centers(code), -- on va donar (per agregar valoracions per punt)
  body                 text not null check (length(body) between 1 and 2000),
  rating_time          smallint check (rating_time between 1 and 5),
  rating_satisfaction  smallint check (rating_satisfaction between 1 and 5),
  rating_again         smallint check (rating_again between 1 and 5),
  created_at           timestamptz not null default now()
);

create index on appointments (scheduled_start);
create index on appointments (donor_id);
create index on donations (donor_id);
create index on forum_posts (zone, created_at desc);

-- ── Vistes per al backoffice ─────────────────────────────────────
create view v_ratings_by_center with (security_invoker = true) as
select c.code as center_code, c.name, c.zone,
       count(p.id)                                   as ratings,
       round(avg(p.rating_time), 2)                  as avg_time,
       round(avg(p.rating_satisfaction), 2)          as avg_satisfaction,
       round(avg(p.rating_again), 2)                 as avg_again
from centers c
left join forum_posts p on p.center_code = c.code and p.rating_time is not null
group by c.code, c.name, c.zone;

-- ── Seguretat (RLS) ──────────────────────────────────────────────
-- PROTOTIP: la clau pública (anon) pot llegir i escriure perquè la demo
-- funcioni sense inici de sessió real. En producció, cal Supabase Auth:
-- cada donant només veu les seves dades i el backoffice usa un rol de personal.
alter table centers      enable row level security;
alter table donors       enable row level security;
alter table appointments enable row level security;
alter table donations    enable row level security;
alter table forum_posts  enable row level security;

create policy demo_read  on centers      for select using (true);
create policy demo_read  on donors       for select using (true);
create policy demo_all   on appointments for all    using (true) with check (true);
create policy demo_all   on donations    for all    using (true) with check (true);
create policy demo_read  on forum_posts  for select using (true);
create policy demo_write on forum_posts  for insert with check (true);

-- ── Temps real: l'app i el backoffice s'actualitzen sols ─────────
alter publication supabase_realtime add table appointments, donations, forum_posts;

-- ── Dades d'exemple ──────────────────────────────────────────────
insert into centers (code, name, kind, address, zone) values
  ('BST-MOB-UPC', 'Autobús Campus Nord UPC',           'mobile_unit', 'Plaça Telecos, C/ Jordi Girona 1–3, 08034 Barcelona', 'Barcelona - Barcelonès'),
  ('BST-HCB',     'Hospital Universitari Clínic',      'hospital',    'C/ Villarroel 170, 08036 Barcelona',                  'Barcelona - Barcelonès'),
  ('BST-HUB',     'Hospital Universitari de Bellvitge', 'hospital',   'Feixa Llarga s/n, 08907 L''Hospitalet de Llobregat',   'Barcelona - Baix Llobregat'),
  ('BST-TRU',     'Hospital Dr. Josep Trueta',         'hospital',    'Av. de França s/n, 17007 Girona',                     'Gironès'),
  ('BST-MOB-UAB', 'Unitat mòbil UAB',                  'mobile_unit', 'Plaça Cívica, 08193 Bellaterra',                       'Vallès Occ.');

insert into donors (id, full_name, birth_date, blood_group, email, phone, zone, reference_center_code) values
  ('BST-84920', 'Marc Vila Soler', '1998-08-14', '0-', 'marc.vila@estudiantat.upc.edu', '+34645892100', 'Barcelona - Barcelonès', 'BST-HCB');

insert into donations (id, donor_id, donation_type, performed_at, volume_ml, center_code) values
  ('DON-2024-031501', 'BST-84920', 'whole_blood', '2024-03-15T10:20:00+01:00', 450, 'BST-HCB'),
  ('DON-2023-110802', 'BST-84920', 'whole_blood', '2023-11-08T17:40:00+01:00', 450, 'BST-MOB-UPC'),
  ('DON-2023-062104', 'BST-84920', 'plasma',      '2023-06-21T11:05:00+02:00', 600, 'BST-HCB'),
  ('DON-2023-020903', 'BST-84920', 'platelets',   '2023-02-09T09:30:00+01:00', 250, 'BST-HCB');

insert into forum_posts (author, place, zone, center_code, body, rating_time, rating_satisfaction, rating_again, created_at) values
  ('Laia Rovira', 'Barcelona - Barcelonès', 'Barcelona - Barcelonès', 'BST-MOB-UPC', 'Acabo de donar sang a l''autobús de la UPC! Molt ràpid i l''equip súper amable. Animeu-vos!', 5, 5, 5, now() - interval '10 minutes'),
  ('Pol Casals', 'Campus Nord UPC, Barcelona', 'Barcelona - Barcelonès', null, 'Algú sap si cal demanar cita prèvia per a donació de plasma aquesta tarda?', null, null, null, now() - interval '2 hours'),
  ('Mireia Font', 'Hospital Clínic, Barcelona', 'Barcelona - Barcelonès', 'BST-HCB', 'Primera vegada que dono plaquetes a l''Hospital Clínic, experiència de 10!', 3, 5, 5, now() - interval '1 day'),
  ('Arnau Puig', 'Barcelona - Barcelonès', 'Barcelona - Barcelonès', null, 'Recordeu que les reserves de 0− estan una mica baixes aquesta setmana. Qui pugui apropar-se a qualsevol punt fix serà de gran ajuda!', null, null, null, now() - interval '3 days'),
  ('Júlia Serra', 'Hospital Dr. Josep Trueta, Girona', 'Gironès', 'BST-TRU', 'Vam anar tota la classe a donar al Trueta. Una mica d''espera però val la pena.', 2, 4, 4, now() - interval '2 days'),
  ('Oriol Mas', 'Unitat mòbil UAB, Bellaterra', 'Vallès Occ.', 'BST-MOB-UAB', 'Plasma fet entre classes. 45 minuts i a dinar!', 4, 5, 5, now() - interval '4 days');
