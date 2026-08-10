-- Home Tasks: migration v1 -> v2 (visual redesign)
-- Run ONCE in the Supabase SQL Editor against your EXISTING (v1) database.
-- schema.sql/seed.sql now describe the v2 shape directly — this script is
-- only for upgrading a database that already has v1 data.
--
-- Irreversible: drops periods/period_task_settings/assignments history and
-- members.age. Take a backup (Supabase → Database → Backups, or a manual
-- pg_dump) first if you want to keep any of that.
--
-- What it does:
--   - Adds household(name) as a single editable row.
--   - Adds members.color (assigned round-robin by creation order); drops age.
--   - Adds tasks.icon/effort/freq/days/active, backfilled from
--     is_daily/times_per_week (effort defaults to 'media' — review from
--     Ajustes); drops is_daily/default_is_fixed/min_age/day_group/times_per_week.
--   - Replaces task_default_fixed_members with task_eligible_members:
--     previously-fixed tasks keep only their fixed member(s) as eligible
--     (reproduces "always this person"); other tasks get every member who
--     met the old min_age.
--   - Adds task_conflicts, best-effort populated for any "Lavar X" /
--     "Secar X" task pair that exists by name.
--   - Drops periods/period_task_settings/period_task_setting_fixed_members
--     and recreates assignments in the new (period-less, per-day) shape —
--     this week's schedule is gone; regenerate it from Ajustes afterward.

begin;

create table household (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Nuestro hogar'
);
insert into household (id, name) values (1, 'Nuestro hogar');
alter table household enable row level security;

-- members: add color, drop age -----------------------------------------

alter table members add column color text;

with ranked as (
  select id, row_number() over (order by created_at) as rn from members
)
update members m
set color = (array['#7766E8', '#8BC9A5', '#F5CA67', '#EEA5B5', '#84B8DF', '#EFA66E'])[((r.rn - 1) % 6) + 1]
from ranked r
where m.id = r.id;

alter table members alter column color set not null;

-- tasks: add new columns, backfill from the old shape --------------------

alter table tasks add column icon text not null default '📌';
alter table tasks add column effort text;
alter table tasks add column freq text;
alter table tasks add column days smallint[] not null default '{}';
alter table tasks add column active boolean not null default true;

update tasks set effort = 'media';

update tasks set freq = case
  when is_daily then 'diario'
  when times_per_week = 1 then 'semanal'
  else 'dias'
end;

-- Placeholder days (Monday-first, times_per_week of them) for non-daily
-- tasks — review/adjust the actual days from Ajustes.
update tasks t
set days = (
  select coalesce(array_agg(x), '{}')
  from (
    select x from unnest(array[0, 1, 2, 3, 4, 5, 6]) as x
    limit greatest(coalesce(t.times_per_week, 1), 1)
  ) s
)
where t.freq in ('dias', 'semanal');

alter table tasks alter column effort set not null;
alter table tasks add constraint tasks_effort_check check (effort in ('ligera', 'media', 'alta'));
alter table tasks alter column freq set not null;
alter table tasks add constraint tasks_freq_check check (freq in ('diario', 'dias', 'semanal'));
alter table tasks add constraint tasks_days_check check (freq = 'diario' or array_length(days, 1) > 0);

-- task_eligible_members, populated from the old fixed/min_age model ------

create table task_eligible_members (
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (task_id, member_id)
);

insert into task_eligible_members (task_id, member_id)
select task_id, member_id from task_default_fixed_members;

insert into task_eligible_members (task_id, member_id)
select t.id, m.id
from tasks t
join members m on true
where t.default_is_fixed = false
  and (t.min_age is null or m.age >= t.min_age)
on conflict do nothing;

-- task_conflicts, best-effort by name -------------------------------------

create table task_conflicts (
  task_a_id uuid not null references tasks(id) on delete cascade,
  task_b_id uuid not null references tasks(id) on delete cascade,
  primary key (task_a_id, task_b_id),
  check (task_a_id <> task_b_id)
);

insert into task_conflicts (task_a_id, task_b_id)
select washing.id, drying.id
from tasks washing
join tasks drying on drying.name = replace(washing.name, 'Lavar', 'Secar')
where washing.name like 'Lavar %';

-- drop period/assignment history, recreate assignments --------------------

drop table if exists assignment_completions;
drop table if exists assignments;
drop table if exists period_task_setting_fixed_members;
drop table if exists period_task_settings;
drop table if exists periods;
drop table if exists task_default_fixed_members;

create table assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid references members(id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  status text not null default 'pending' check (status in ('pending', 'completed', 'sin-responsable')),
  created_at timestamptz not null default now(),
  unique (task_id, day_of_week)
);

-- drop obsolete columns ----------------------------------------------------

alter table tasks
  drop column is_daily,
  drop column default_is_fixed,
  drop column min_age,
  drop column day_group,
  drop column times_per_week;

alter table members drop column age;

-- indexes + RLS --------------------------------------------------------

create index task_eligible_members_member_id_idx on task_eligible_members(member_id);
create index task_conflicts_task_b_id_idx on task_conflicts(task_b_id);
create index assignments_member_id_idx on assignments(member_id);

alter table task_eligible_members enable row level security;
alter table task_conflicts enable row level security;
alter table assignments enable row level security;

commit;
