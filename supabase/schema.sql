-- Home Tasks: initial schema
-- Run once against the Supabase project (SQL Editor or `supabase db execute`).
-- Row Level Security is enabled with NO policies: only the service_role key
-- (server-side only, used by the Next.js API layer) can read/write these
-- tables. The anon/publishable key gets zero access by default.

create extension if not exists pgcrypto;

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  age smallint not null check (age >= 0),
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- true: happens every day of the period (e.g. Cocinar Desayuno).
  -- false: happens once per period and needs a specific day assigned (e.g. Barrer).
  is_daily boolean not null default false,
  default_is_fixed boolean not null default false,
  default_fixed_member_id uuid references members(id),
  -- null: no age restriction. Set: only members at or above this age are
  -- eligible for this task in the assignment lottery.
  min_age smallint check (min_age is null or min_age >= 0),
  created_at timestamptz not null default now(),
  constraint fixed_task_has_member
    check (default_is_fixed = false or default_fixed_member_id is not null)
);

create table periods (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status text not null default 'draft' check (status in ('draft', 'assigned')),
  -- Seed for the deterministic assignment algorithm. Regenerated on every
  -- reroll so re-running the sorteo for the same period gives a different
  -- (but still reproducible) result.
  seed bigint not null default ((extract(epoch from clock_timestamp()) * 1000)::bigint),
  created_at timestamptz not null default now()
);

-- Editable-per-period snapshot of which tasks are fixed and to whom, reviewed
-- before running the assignment. Seeded from tasks.default_* when a period is
-- created, then can be overridden for that period only.
create table period_task_settings (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  is_fixed boolean not null,
  fixed_member_id uuid references members(id),
  unique (period_id, task_id),
  constraint fixed_setting_has_member
    check (is_fixed = false or fixed_member_id is not null)
);

-- Final assignment result for a period: who does each task.
-- day_of_week is only set for non-daily tasks (0 = Monday ... 6 = Sunday);
-- daily tasks apply to every day of the period and leave it null.
create table assignments (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references members(id),
  day_of_week smallint check (day_of_week between 0 and 6),
  is_fixed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (period_id, task_id)
);

create index assignments_period_id_idx on assignments(period_id);
create index assignments_member_id_idx on assignments(member_id);
create index period_task_settings_period_id_idx on period_task_settings(period_id);

alter table members enable row level security;
alter table tasks enable row level security;
alter table periods enable row level security;
alter table period_task_settings enable row level security;
alter table assignments enable row level security;
