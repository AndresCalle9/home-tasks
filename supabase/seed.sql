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

insert into members (name, age) values
  ('Lizeth', 34),
  ('Yuliet', 50),
  ('Andres', 34),
  ('Maria Jose', 16),
  ('Antonia', 10);

-- Fixed tasks (one per person's default-assigned room/space).
insert into tasks (name, is_daily, default_is_fixed, default_fixed_member_id, min_age)
values
  ('Organizar habitacion Principal', false, true, (select id from members where name = 'Yuliet'), 10),
  ('Organizar habitacion Secundaria', false, true, (select id from members where name = 'Andres'), 10),
  ('Organizar habitacion Antonia', false, true, (select id from members where name = 'Antonia'), 10),
  ('Organizar habitacion MariaJo', false, true, (select id from members where name = 'Maria Jose'), 10),
  ('Organizar Oficina', false, true, (select id from members where name = 'Andres'), 10);

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

-- Once-per-period tasks: get a specific day assigned as part of the sorteo.
insert into tasks (name, is_daily, default_is_fixed, min_age) values
  ('Lavar ropa', false, false, 10),
  ('Extender ropa', false, false, 10),
  ('Doblar ropa', false, false, 10),
  ('Barrer', false, false, 10),
  ('Trapear', false, false, 10),
  ('Organizar zonas comunes internas', false, false, 10),
  ('Organizar zonas comunes externas', false, false, 10),
  ('Organizar taller', false, false, 10);
