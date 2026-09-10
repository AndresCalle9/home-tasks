-- Home Tasks: migration v2 -> v3 (multi-tenant households)
-- Run ONCE in the Supabase SQL Editor against your EXISTING (v2) database,
-- which has exactly one household (the singleton `household` row with
-- `id = 1`). schema.sql now describes the v3 shape directly — this script
-- is only for upgrading a database that already has v2 data.
--
-- BEFORE RUNNING:
--   1. Take a backup (Dashboard -> Database -> Backups, or `pg_dump`).
--   2. In Authentication -> Providers -> Email, turn OFF "Confirm email"
--      (sign-up needs an active session immediately — see design.md's
--      Open Questions in the multi-tenant-households change).
--   3. In Authentication -> Users, manually add one user (email + a
--      temporary password the household can change after signing in) for
--      the one real household. Copy its User UID.
--   4. Compute a hash of the household's *existing* action password (the
--      value currently in your SECURITY_PASSWORD env var) with the same
--      scheme lib/security/password.ts uses, so the household keeps using
--      the same action password after migrating. Run this once with
--      Node (no project install needed):
--
--        node -e '
--          const { scryptSync, randomBytes } = require("node:crypto");
--          const password = process.argv[1];
--          const salt = randomBytes(16);
--          const hash = scryptSync(password, salt, 64);
--          console.log(salt.toString("hex") + ":" + hash.toString("hex"));
--        ' "<your current SECURITY_PASSWORD value>"
--
--   5. Replace the two placeholders below (search for "REPLACE_WITH_")
--      with the values from steps 3 and 4 before running this script.
--
-- Irreversible: converts `household.id` from a fixed smallint to a uuid,
-- and every domain table gains a required `household_id`. Take the backup
-- from step 1 seriously.

begin;

-- household: add auth link + action password hash, convert id to uuid ----

alter table household add column id_new uuid not null default gen_random_uuid();
alter table household add column user_id uuid;
alter table household add column action_password_hash text;

update household set
  user_id = 'REPLACE_WITH_AUTH_USER_ID',
  action_password_hash = 'REPLACE_WITH_ACTION_PASSWORD_HASH'
where id = 1;

alter table household drop constraint household_pkey;
alter table household drop constraint household_id_check;
alter table household drop column id;
alter table household rename column id_new to id;
alter table household add primary key (id);

alter table household alter column user_id set not null;
alter table household add constraint household_user_id_key unique (user_id);
alter table household add constraint household_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table household alter column action_password_hash set not null;

-- domain tables: add household_id, backfilled from the one household ----

alter table members add column household_id uuid references household(id) on delete cascade;
update members set household_id = (select id from household limit 1);
alter table members alter column household_id set not null;
alter table members drop constraint members_name_key;
alter table members add constraint members_household_id_name_key unique (household_id, name);

alter table tasks add column household_id uuid references household(id) on delete cascade;
update tasks set household_id = (select id from household limit 1);
alter table tasks alter column household_id set not null;
alter table tasks drop constraint tasks_name_key;
alter table tasks add constraint tasks_household_id_name_key unique (household_id, name);

alter table task_eligible_members add column household_id uuid references household(id) on delete cascade;
update task_eligible_members set household_id = (select id from household limit 1);
alter table task_eligible_members alter column household_id set not null;

alter table task_conflicts add column household_id uuid references household(id) on delete cascade;
update task_conflicts set household_id = (select id from household limit 1);
alter table task_conflicts alter column household_id set not null;

alter table assignments add column household_id uuid references household(id) on delete cascade;
update assignments set household_id = (select id from household limit 1);
alter table assignments alter column household_id set not null;

create index members_household_id_idx on members(household_id);
create index tasks_household_id_idx on tasks(household_id);
create index task_eligible_members_household_id_idx on task_eligible_members(household_id);
create index task_conflicts_household_id_idx on task_conflicts(household_id);
create index assignments_household_id_idx on assignments(household_id);

-- RLS: real per-household policies keyed on auth.uid() ------------------
-- (RLS was already enabled with zero policies on every table; the
-- service-role key still bypasses all of this for hand-run scripts.)

create or replace function household_id_for_current_user()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from household where user_id = auth.uid()
$$;

create policy "select own household" on household
  for select using (user_id = auth.uid());
create policy "insert own household" on household
  for insert with check (user_id = auth.uid());
create policy "update own household" on household
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "select own members" on members
  for select using (household_id = household_id_for_current_user());
create policy "insert own members" on members
  for insert with check (household_id = household_id_for_current_user());
create policy "update own members" on members
  for update using (household_id = household_id_for_current_user())
  with check (household_id = household_id_for_current_user());
create policy "delete own members" on members
  for delete using (household_id = household_id_for_current_user());

create policy "select own tasks" on tasks
  for select using (household_id = household_id_for_current_user());
create policy "insert own tasks" on tasks
  for insert with check (household_id = household_id_for_current_user());
create policy "update own tasks" on tasks
  for update using (household_id = household_id_for_current_user())
  with check (household_id = household_id_for_current_user());
create policy "delete own tasks" on tasks
  for delete using (household_id = household_id_for_current_user());

create policy "select own task_eligible_members" on task_eligible_members
  for select using (household_id = household_id_for_current_user());
create policy "insert own task_eligible_members" on task_eligible_members
  for insert with check (household_id = household_id_for_current_user());
create policy "delete own task_eligible_members" on task_eligible_members
  for delete using (household_id = household_id_for_current_user());

create policy "select own task_conflicts" on task_conflicts
  for select using (household_id = household_id_for_current_user());
create policy "insert own task_conflicts" on task_conflicts
  for insert with check (household_id = household_id_for_current_user());
create policy "delete own task_conflicts" on task_conflicts
  for delete using (household_id = household_id_for_current_user());

create policy "select own assignments" on assignments
  for select using (household_id = household_id_for_current_user());
create policy "insert own assignments" on assignments
  for insert with check (household_id = household_id_for_current_user());
create policy "update own assignments" on assignments
  for update using (household_id = household_id_for_current_user())
  with check (household_id = household_id_for_current_user());
create policy "delete own assignments" on assignments
  for delete using (household_id = household_id_for_current_user());

commit;
