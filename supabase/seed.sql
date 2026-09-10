-- Home Tasks: initial data (v3 — multi-tenant households)
-- Run after schema.sql, against a fresh schema, for exactly one household.
-- Not idempotent (unique constraints on (household_id, name)) — do not
-- re-run against a database that already has this household's data.
--
-- Replace both placeholders below before running:
--   - REPLACE_WITH_AUTH_USER_ID: add a user by hand first
--     (Authentication -> Users) and paste its User UID.
--   - REPLACE_WITH_ACTION_PASSWORD_HASH: pick the action password this
--     household will use and hash it the same way
--     lib/security/password.ts does — run once with Node (no project
--     install needed):
--
--       node -e '
--         const { scryptSync, randomBytes } = require("node:crypto");
--         const password = process.argv[1];
--         const salt = randomBytes(16);
--         const hash = scryptSync(password, salt, 64);
--         console.log(salt.toString("hex") + ":" + hash.toString("hex"));
--       ' "<the action password you want to start with>"
--
-- `days` uses 0 = Monday ... 6 = Sunday. Tasks that used to share a
-- `day_group` (laundry) or a `times_per_week` with no fixed days (the
-- "organizar"/limpieza rotation) get Mon/Wed/Fri (0,2,4) as a starting
-- pattern — adjust per task from Ajustes.
--
-- Tasks that used to be `default_is_fixed` to a single member are seeded
-- with that member as the *only* eligible one, which reproduces "always
-- this person" under the least-loaded-among-eligible model.

insert into household (user_id, name, action_password_hash) values (
  'REPLACE_WITH_AUTH_USER_ID',
  'Nuestro hogar',
  'REPLACE_WITH_ACTION_PASSWORD_HASH'
);

insert into members (household_id, name, color) values
  ((select id from household limit 1), 'Lizeth', '#7766E8'),
  ((select id from household limit 1), 'Yuliet', '#8BC9A5'),
  ((select id from household limit 1), 'Andres', '#84B8DF'),
  ((select id from household limit 1), 'Maria Jose', '#EEA5B5'),
  ((select id from household limit 1), 'Antonia', '#F5CA67');

-- Single-person "fixed" tasks: eligibility is just that one member.
insert into tasks (household_id, name, icon, effort, freq, days) values
  ((select id from household limit 1), 'Organizar habitacion Principal', '🛏️', 'media', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Organizar habitacion Secundaria', '🛏️', 'media', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Organizar habitacion Antonia', '🛏️', 'media', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Organizar habitacion MariaJo', '🛏️', 'media', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Organizar Oficina', '🗄️', 'media', 'dias', array[0,2,4]);

insert into task_eligible_members (household_id, task_id, member_id) values
  ((select id from household limit 1), (select id from tasks where name = 'Organizar habitacion Principal'), (select id from members where name = 'Yuliet')),
  ((select id from household limit 1), (select id from tasks where name = 'Organizar habitacion Secundaria'), (select id from members where name = 'Andres')),
  ((select id from household limit 1), (select id from tasks where name = 'Organizar habitacion Antonia'), (select id from members where name = 'Antonia')),
  ((select id from household limit 1), (select id from tasks where name = 'Organizar habitacion MariaJo'), (select id from members where name = 'Maria Jose')),
  ((select id from household limit 1), (select id from tasks where name = 'Organizar Oficina'), (select id from members where name = 'Andres'));

-- Daily tasks, one member for the whole week. Cooking requires 14+ (Antonia
-- excluded); the rest is open to everyone.
insert into tasks (household_id, name, icon, effort, freq) values
  ((select id from household limit 1), 'Cocinar Desayuno', '🍳', 'alta', 'diario'),
  ((select id from household limit 1), 'Cocinar Almuerzo', '🍲', 'alta', 'diario'),
  ((select id from household limit 1), 'Cocinar Cena', '🍽️', 'alta', 'diario'),
  ((select id from household limit 1), 'Lavar cocina Desayuno', '🧼', 'media', 'diario'),
  ((select id from household limit 1), 'Lavar cocina Almuerzo', '🧼', 'media', 'diario'),
  ((select id from household limit 1), 'Lavar cocina Cena', '🧼', 'media', 'diario'),
  ((select id from household limit 1), 'Secar cocina Desayuno', '🧽', 'ligera', 'diario'),
  ((select id from household limit 1), 'Secar cocina Almuerzo', '🧽', 'ligera', 'diario'),
  ((select id from household limit 1), 'Secar cocina Cena', '🧽', 'ligera', 'diario'),
  ((select id from household limit 1), 'Alimentacion Cocoa manana', '🐶', 'ligera', 'diario'),
  ((select id from household limit 1), 'Alimentacion Cocoa tarde/noche', '🐶', 'ligera', 'diario'),
  ((select id from household limit 1), 'Ruta del popo', '🐾', 'ligera', 'diario'),
  ((select id from household limit 1), 'Regar jardines', '🌱', 'ligera', 'diario');

insert into task_eligible_members (household_id, task_id, member_id)
select (select id from household limit 1), t.id, m.id
from tasks t
cross join members m
where t.name in (
  'Lavar cocina Desayuno', 'Lavar cocina Almuerzo', 'Lavar cocina Cena',
  'Secar cocina Desayuno', 'Secar cocina Almuerzo', 'Secar cocina Cena',
  'Alimentacion Cocoa manana', 'Alimentacion Cocoa tarde/noche',
  'Ruta del popo', 'Regar jardines'
);

insert into task_eligible_members (household_id, task_id, member_id)
select (select id from household limit 1), t.id, m.id
from tasks t
cross join members m
where t.name in ('Cocinar Desayuno', 'Cocinar Almuerzo', 'Cocinar Cena')
  and m.name <> 'Antonia';

-- Never let the same person both wash and dry the same meal.
insert into task_conflicts (household_id, task_a_id, task_b_id) values
  ((select id from household limit 1), (select id from tasks where name = 'Lavar cocina Desayuno'), (select id from tasks where name = 'Secar cocina Desayuno')),
  ((select id from household limit 1), (select id from tasks where name = 'Lavar cocina Almuerzo'), (select id from tasks where name = 'Secar cocina Almuerzo')),
  ((select id from household limit 1), (select id from tasks where name = 'Lavar cocina Cena'), (select id from tasks where name = 'Secar cocina Cena'));

-- Laundry: washing and hanging to dry on the same days (kept in sync
-- manually, not by an enforced group — adjust all three together if you
-- change the days from Ajustes).
insert into tasks (household_id, name, icon, effort, freq, days) values
  ((select id from household limit 1), 'Lavar ropa', '🧺', 'media', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Extender ropa', '👕', 'ligera', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Doblar ropa', '🧦', 'media', 'dias', array[0,2,4]);

insert into tasks (household_id, name, icon, effort, freq, days) values
  ((select id from household limit 1), 'Barrer', '🧹', 'media', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Trapear', '🪣', 'alta', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Organizar zonas comunes internas', '🏡', 'media', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Organizar zonas comunes externas', '🏡', 'media', 'dias', array[0,2,4]),
  ((select id from household limit 1), 'Organizar taller', '🧰', 'media', 'dias', array[0,2,4]);

insert into task_eligible_members (household_id, task_id, member_id)
select (select id from household limit 1), t.id, m.id
from tasks t
cross join members m
where t.name in (
  'Lavar ropa', 'Extender ropa', 'Doblar ropa',
  'Barrer', 'Trapear', 'Organizar zonas comunes internas',
  'Organizar zonas comunes externas', 'Organizar taller'
);
