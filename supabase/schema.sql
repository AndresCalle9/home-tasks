-- Home Tasks: schema (v3 — multi-tenant households)
-- Run once against a fresh Supabase project (SQL Editor or `supabase db
-- execute`). For an existing v2 database, run migration_v3_multi_tenant.sql
-- instead — this file is the target shape, not an upgrade script.
--
-- Every table's isolation is enforced by Row Level Security policies keyed
-- on auth.uid(), not just by the Next.js API layer filtering by
-- household_id (see lib/data/*.ts and design.md in
-- openspec/changes/archive/.../multi-tenant-households for why). The
-- service_role key (used only by hand-run maintenance scripts, never by
-- the running app) bypasses RLS entirely, same as always.

create extension if not exists pgcrypto;

-- One row per household, linked 1:1 to a Supabase Auth user. There is no
-- multi-user-per-household support: exactly one login per household.
create table household (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'Nuestro hogar',
  -- Hashed with lib/security/password.ts's scrypt scheme — never the
  -- plaintext value. Gates running/resetting the sorteo and manually
  -- reassigning a task's responsible member (see week-assignment spec).
  action_password_hash text not null
);

create table members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  name text not null,
  -- Hex color used for this member's avatar/pill across the app.
  color text not null,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  name text not null,
  icon text not null default '📌',
  effort text not null check (effort in ('ligera', 'media', 'alta')),
  -- 'diario': every day of the week (`days` is ignored/empty).
  -- 'dias': a fixed set of specific days every week.
  -- 'semanal': exactly one day a week (days has exactly one entry).
  freq text not null check (freq in ('diario', 'dias', 'semanal')),
  -- 0 = Monday ... 6 = Sunday. Required and non-empty unless freq = 'diario'.
  days smallint[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, name),
  check (freq = 'diario' or array_length(days, 1) > 0)
);

-- Who is allowed to be assigned this task. The schedule generator's
-- lottery pool for a task is exactly this set (see lib/algorithm/schedule.ts).
-- `household_id` is denormalized from tasks/members onto this row directly
-- (rather than requiring a join) so its RLS policy stays a simple
-- equality check.
create table task_eligible_members (
  household_id uuid not null references household(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (task_id, member_id)
);

-- Two tasks that must never be held by the same member on the same day
-- (e.g. washing and drying the same meal) — enforced by the schedule
-- generator, not the DB. `household_id` denormalized, same reasoning as
-- task_eligible_members above.
create table task_conflicts (
  household_id uuid not null references household(id) on delete cascade,
  task_a_id uuid not null references tasks(id) on delete cascade,
  task_b_id uuid not null references tasks(id) on delete cascade,
  primary key (task_a_id, task_b_id),
  check (task_a_id <> task_b_id)
);

-- The current week's schedule for one household: one row per (task, day).
-- Regenerating the week ("Repartir nuestra semana") replaces every row for
-- that household. A daily task simply gets one row per day, all sharing
-- the same task_id — there is no separate per-day completion table, since
-- every row is already day-specific.
create table assignments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  -- Null when no eligible member was available at generation time
  -- (status = 'sin-responsable').
  member_id uuid references members(id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  status text not null default 'pending' check (status in ('pending', 'completed', 'sin-responsable')),
  created_at timestamptz not null default now(),
  unique (task_id, day_of_week)
);

create index members_household_id_idx on members(household_id);
create index tasks_household_id_idx on tasks(household_id);
create index task_eligible_members_household_id_idx on task_eligible_members(household_id);
create index task_eligible_members_member_id_idx on task_eligible_members(member_id);
create index task_conflicts_household_id_idx on task_conflicts(household_id);
create index task_conflicts_task_b_id_idx on task_conflicts(task_b_id);
create index assignments_household_id_idx on assignments(household_id);
create index assignments_member_id_idx on assignments(member_id);

alter table household enable row level security;
alter table members enable row level security;
alter table tasks enable row level security;
alter table task_eligible_members enable row level security;
alter table task_conflicts enable row level security;
alter table assignments enable row level security;

-- RLS policies: every table's access is scoped to the signed-in user's own
-- household, resolved via this helper (security definer so it can read
-- `household` regardless of that table's own RLS policy, without
-- recursion — see Supabase's documented pattern for RLS helper functions).
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
