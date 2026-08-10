-- Home Tasks: schema (v2 — visual redesign)
-- Run once against a fresh Supabase project (SQL Editor or `supabase db
-- execute`). For an existing v1 database, run migration_v2.sql instead —
-- this file is the target shape, not an upgrade script.
-- Row Level Security is enabled with NO policies: only the service_role key
-- (server-side only, used by the Next.js API layer) can read/write these
-- tables. The anon/publishable key gets zero access by default.

create extension if not exists pgcrypto;

-- Singleton row holding the household's display name (edited from Ajustes).
create table household (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Nuestro hogar'
);
insert into household (id, name) values (1, 'Nuestro hogar');

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- Hex color used for this member's avatar/pill across the app.
  color text not null,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
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
  check (freq = 'diario' or array_length(days, 1) > 0)
);

-- Who is allowed to be assigned this task. Replaces the old min_age-based
-- eligibility: the schedule generator's lottery pool for a task is exactly
-- this set (see lib/algorithm/schedule.ts).
create table task_eligible_members (
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (task_id, member_id)
);

-- Two tasks that must never be held by the same member on the same day
-- (e.g. washing and drying the same meal) — enforced by the schedule
-- generator, not the DB.
create table task_conflicts (
  task_a_id uuid not null references tasks(id) on delete cascade,
  task_b_id uuid not null references tasks(id) on delete cascade,
  primary key (task_a_id, task_b_id),
  check (task_a_id <> task_b_id)
);

-- The current week's schedule: one row per (task, day). Regenerating the
-- week ("Repartir nuestra semana") replaces every row. A daily task simply
-- gets one row per day, all sharing the same task_id — there is no
-- separate per-day completion table anymore, since every row is already
-- day-specific.
create table assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  -- Null when no eligible member was available at generation time
  -- (status = 'sin-responsable').
  member_id uuid references members(id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  status text not null default 'pending' check (status in ('pending', 'completed', 'sin-responsable')),
  created_at timestamptz not null default now(),
  unique (task_id, day_of_week)
);

create index task_eligible_members_member_id_idx on task_eligible_members(member_id);
create index task_conflicts_task_b_id_idx on task_conflicts(task_b_id);
create index assignments_member_id_idx on assignments(member_id);

alter table household enable row level security;
alter table members enable row level security;
alter table tasks enable row level security;
alter table task_eligible_members enable row level security;
alter table task_conflicts enable row level security;
alter table assignments enable row level security;
