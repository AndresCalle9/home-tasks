-- Home Tasks: initial data (v2 — visual redesign)
-- Run after schema.sql, against a fresh schema. Not idempotent (unique
-- constraints on members.name / tasks.name) — do not re-run against a
-- database that already has data.
--
-- `days` uses 0 = Monday ... 6 = Sunday. Tasks that used to share a
-- `day_group` (laundry) or a `times_per_week` with no fixed days (the
-- "organizar"/limpieza rotation) get Mon/Wed/Fri (0,2,4) as a starting
-- pattern — adjust per task from Ajustes.
--
-- Tasks that used to be `default_is_fixed` to a single member are seeded
-- with that member as the *only* eligible one, which reproduces "always
-- this person" under the new least-loaded-among-eligible model.

insert into members (name, color) values
  ('Lizeth', '#7766E8'),
  ('Yuliet', '#8BC9A5'),
  ('Andres', '#84B8DF'),
  ('Maria Jose', '#EEA5B5'),
  ('Antonia', '#F5CA67');

-- Single-person "fixed" tasks: eligibility is just that one member.
insert into tasks (name, icon, effort, freq, days) values
  ('Organizar habitacion Principal', '🛏️', 'media', 'dias', array[0,2,4]),
  ('Organizar habitacion Secundaria', '🛏️', 'media', 'dias', array[0,2,4]),
  ('Organizar habitacion Antonia', '🛏️', 'media', 'dias', array[0,2,4]),
  ('Organizar habitacion MariaJo', '🛏️', 'media', 'dias', array[0,2,4]),
  ('Organizar Oficina', '🗄️', 'media', 'dias', array[0,2,4]);

insert into task_eligible_members (task_id, member_id) values
  ((select id from tasks where name = 'Organizar habitacion Principal'), (select id from members where name = 'Yuliet')),
  ((select id from tasks where name = 'Organizar habitacion Secundaria'), (select id from members where name = 'Andres')),
  ((select id from tasks where name = 'Organizar habitacion Antonia'), (select id from members where name = 'Antonia')),
  ((select id from tasks where name = 'Organizar habitacion MariaJo'), (select id from members where name = 'Maria Jose')),
  ((select id from tasks where name = 'Organizar Oficina'), (select id from members where name = 'Andres'));

-- Daily tasks, one member for the whole week. Cooking requires 14+ (Antonia
-- excluded); the rest is open to everyone.
insert into tasks (name, icon, effort, freq) values
  ('Cocinar Desayuno', '🍳', 'alta', 'diario'),
  ('Cocinar Almuerzo', '🍲', 'alta', 'diario'),
  ('Cocinar Cena', '🍽️', 'alta', 'diario'),
  ('Lavar cocina Desayuno', '🧼', 'media', 'diario'),
  ('Lavar cocina Almuerzo', '🧼', 'media', 'diario'),
  ('Lavar cocina Cena', '🧼', 'media', 'diario'),
  ('Secar cocina Desayuno', '🧽', 'ligera', 'diario'),
  ('Secar cocina Almuerzo', '🧽', 'ligera', 'diario'),
  ('Secar cocina Cena', '🧽', 'ligera', 'diario'),
  ('Alimentacion Cocoa manana', '🐶', 'ligera', 'diario'),
  ('Alimentacion Cocoa tarde/noche', '🐶', 'ligera', 'diario'),
  ('Ruta del popo', '🐾', 'ligera', 'diario'),
  ('Regar jardines', '🌱', 'ligera', 'diario');

insert into task_eligible_members (task_id, member_id)
select t.id, m.id
from tasks t
cross join members m
where t.name in (
  'Lavar cocina Desayuno', 'Lavar cocina Almuerzo', 'Lavar cocina Cena',
  'Secar cocina Desayuno', 'Secar cocina Almuerzo', 'Secar cocina Cena',
  'Alimentacion Cocoa manana', 'Alimentacion Cocoa tarde/noche',
  'Ruta del popo', 'Regar jardines'
);

insert into task_eligible_members (task_id, member_id)
select t.id, m.id
from tasks t
cross join members m
where t.name in ('Cocinar Desayuno', 'Cocinar Almuerzo', 'Cocinar Cena')
  and m.name <> 'Antonia';

-- Never let the same person both wash and dry the same meal.
insert into task_conflicts (task_a_id, task_b_id) values
  ((select id from tasks where name = 'Lavar cocina Desayuno'), (select id from tasks where name = 'Secar cocina Desayuno')),
  ((select id from tasks where name = 'Lavar cocina Almuerzo'), (select id from tasks where name = 'Secar cocina Almuerzo')),
  ((select id from tasks where name = 'Lavar cocina Cena'), (select id from tasks where name = 'Secar cocina Cena'));

-- Laundry: washing and hanging to dry on the same days (kept in sync
-- manually, not by an enforced group — adjust all three together if you
-- change the days from Ajustes).
insert into tasks (name, icon, effort, freq, days) values
  ('Lavar ropa', '🧺', 'media', 'dias', array[0,2,4]),
  ('Extender ropa', '👕', 'ligera', 'dias', array[0,2,4]),
  ('Doblar ropa', '🧦', 'media', 'dias', array[0,2,4]);

insert into tasks (name, icon, effort, freq, days) values
  ('Barrer', '🧹', 'media', 'dias', array[0,2,4]),
  ('Trapear', '🪣', 'alta', 'dias', array[0,2,4]),
  ('Organizar zonas comunes internas', '🏡', 'media', 'dias', array[0,2,4]),
  ('Organizar zonas comunes externas', '🏡', 'media', 'dias', array[0,2,4]),
  ('Organizar taller', '🧰', 'media', 'dias', array[0,2,4]);

insert into task_eligible_members (task_id, member_id)
select t.id, m.id
from tasks t
cross join members m
where t.name in (
  'Lavar ropa', 'Extender ropa', 'Doblar ropa',
  'Barrer', 'Trapear', 'Organizar zonas comunes internas',
  'Organizar zonas comunes externas', 'Organizar taller'
);
