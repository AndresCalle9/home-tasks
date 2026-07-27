-- Home Tasks: initial data
-- Run after schema.sql. Safe to re-run only on a fresh schema (names are
-- unique; re-running against existing data will violate the unique
-- constraints on members.name / tasks.name).
--
-- Assumptions made on is_daily for tasks not explicitly grouped as
-- "independientes" by the user (Ruta del popo, Regar jardines): marked as
-- daily since both usually need doing every day. Adjust from the management
-- (CRUD) screen once it exists if that's wrong for your household.

insert into members (name, age) values
  ('Lizeth', 34),
  ('Yuliet', 50),
  ('Andres', 34),
  ('Maria Jose', 16),
  ('Antonia', 10);

-- Fixed tasks (one per person's default-assigned room/space).
insert into tasks (name, is_daily, default_is_fixed, default_fixed_member_id)
values
  ('Organizar habitacion Principal', false, true, (select id from members where name = 'Yuliet')),
  ('Organizar habitacion Secundaria', false, true, (select id from members where name = 'Andres')),
  ('Organizar habitacion Antonia', false, true, (select id from members where name = 'Antonia')),
  ('Organizar habitacion MariaJo', false, true, (select id from members where name = 'Maria Jose')),
  ('Organizar Oficina', false, true, (select id from members where name = 'Andres'));

-- Daily tasks: one person assigned for the whole period, done every day.
insert into tasks (name, is_daily, default_is_fixed) values
  ('Cocinar Desayuno', true, false),
  ('Cocinar Almuerzo', true, false),
  ('Cocinar Cena', true, false),
  ('Lavar cocina Desayuno', true, false),
  ('Lavar cocina Almuerzo', true, false),
  ('Lavar cocina Cena', true, false),
  ('Secar cocina Desayuno', true, false),
  ('Secar cocina Almuerzo', true, false),
  ('Secar cocina Cena', true, false),
  ('Alimentacion Cocoa manana', true, false),
  ('Alimentacion Cocoa tarde/noche', true, false),
  ('Ruta del popo', true, false),
  ('Regar jardines', true, false);

-- Once-per-period tasks: get a specific day assigned as part of the sorteo.
insert into tasks (name, is_daily, default_is_fixed) values
  ('Lavar ropa', false, false),
  ('Extender ropa', false, false),
  ('Doblar ropa', false, false),
  ('Barrer', false, false),
  ('Trapear', false, false),
  ('Organizar zonas comunes internas', false, false),
  ('Organizar zonas comunes externas', false, false),
  ('Organizar taller', false, false);
