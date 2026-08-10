-- Home Tasks: initial data
-- Run after schema.sql. Safe to re-run only on a fresh schema (names are
-- unique; re-running against existing data will violate the unique
-- constraints on members.name / tasks.name).
--
-- Assumptions made on is_daily for tasks not explicitly grouped as
-- "independientes" by the user (Ruta del popo, Regar jardines): marked as
-- daily since both usually need doing every day. Adjust from the management
-- (CRUD) screen once it exists if that's wrong for your household.
--
-- min_age defaults to 10 for every task, except the 3 "Cocinar" tasks
-- (stove/knives), which default to 14. Adjust per task from Configuración.
--
-- Once-per-period tasks each get a configurable number of days a week
-- (times_per_week, 1-7); defaults to 3 here, adjust per task from
-- Configuración (e.g. "Lavar Baño" → 1, "Sacar basura" → 4). "Lavar ropa",
-- "Extender ropa", and "Doblar ropa" share day_group = 'laundry' so they
-- always land on the same days (you hang clothes to dry the same day you
-- wash them) — tasks in the same day_group must share times_per_week.

insert into members (name, age) values
  ('Lizeth', 34),
  ('Yuliet', 50),
  ('Andres', 34),
  ('Maria Jose', 16),
  ('Antonia', 10);

-- Fixed tasks (one per person's default-assigned room/space). Each fixed
-- task can have one or more enabled members in task_default_fixed_members;
-- these all default to exactly one, adjust from Configuración to add more.
insert into tasks (name, is_daily, default_is_fixed, min_age, times_per_week)
values
  ('Organizar habitacion Principal', false, true, 10, 3),
  ('Organizar habitacion Secundaria', false, true, 10, 3),
  ('Organizar habitacion Antonia', false, true, 10, 3),
  ('Organizar habitacion MariaJo', false, true, 10, 3),
  ('Organizar Oficina', false, true, 10, 3);

insert into task_default_fixed_members (task_id, member_id) values
  ((select id from tasks where name = 'Organizar habitacion Principal'), (select id from members where name = 'Yuliet')),
  ((select id from tasks where name = 'Organizar habitacion Secundaria'), (select id from members where name = 'Andres')),
  ((select id from tasks where name = 'Organizar habitacion Antonia'), (select id from members where name = 'Antonia')),
  ((select id from tasks where name = 'Organizar habitacion MariaJo'), (select id from members where name = 'Maria Jose')),
  ((select id from tasks where name = 'Organizar Oficina'), (select id from members where name = 'Andres'));

-- Daily tasks: one person assigned for the whole period, done every day.
insert into tasks (name, is_daily, default_is_fixed, min_age) values
  ('Cocinar Desayuno', true, false, 14),
  ('Cocinar Almuerzo', true, false, 14),
  ('Cocinar Cena', true, false, 14),
  ('Lavar cocina Desayuno', true, false, 10),
  ('Lavar cocina Almuerzo', true, false, 10),
  ('Lavar cocina Cena', true, false, 10),
  ('Secar cocina Desayuno', true, false, 10),
  ('Secar cocina Almuerzo', true, false, 10),
  ('Secar cocina Cena', true, false, 10),
  ('Alimentacion Cocoa manana', true, false, 10),
  ('Alimentacion Cocoa tarde/noche', true, false, 10),
  ('Ruta del popo', true, false, 10),
  ('Regar jardines', true, false, 10);

-- Once-per-period tasks: get days assigned per their times_per_week as
-- part of the sorteo.
insert into tasks (name, is_daily, default_is_fixed, min_age, day_group, times_per_week) values
  ('Lavar ropa', false, false, 10, 'laundry', 3),
  ('Extender ropa', false, false, 10, 'laundry', 3),
  ('Doblar ropa', false, false, 10, 'laundry', 3);

insert into tasks (name, is_daily, default_is_fixed, min_age, times_per_week) values
  ('Barrer', false, false, 10, 3),
  ('Trapear', false, false, 10, 3),
  ('Organizar zonas comunes internas', false, false, 10, 3),
  ('Organizar zonas comunes externas', false, false, 10, 3),
  ('Organizar taller', false, false, 10, 3);
