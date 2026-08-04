## Why

Once-per-period ("puntual") tasks currently each draw one independent random
day, with no notion that some tasks are related. Real example: "Lavar ropa"
(wash) and "Extender ropa" (hang to dry) can land on different days of the
week, which makes no sense for a household — you hang clothes to dry the
same day you wash them. Separately, puntual tasks only ever get **one** day
per period, but the real requirement is that they happen **3 times a week,
always**. Neither problem touches who gets assigned a task — only when.

## What Changes

- Add an optional `day_group` tag to the task catalog (editable via the
  Configuración CRUD). Tasks sharing the same non-null `day_group` always
  land on the exact same set of days within a period — no dependency/offset
  logic between them, just a shared day set (MVP-level).
- Every `is_daily = false` task — fixed or variable alike, keeping today's
  symmetry between the two — now receives **3** distinct days per period
  instead of 1.
- Tag the real household's "Lavar ropa", "Extender ropa", and "Doblar ropa"
  with the same `day_group` so they always land on the same 3 days.
- **BREAKING** (data model): `assignments`'s `unique (period_id, task_id)`
  constraint relaxes to `unique (period_id, task_id, day_of_week)`, since a
  non-daily task now produces multiple rows (one per assigned day) instead
  of one.
- Explicitly unchanged: the person-selection lottery (least-loaded
  selection) and the post-lottery rebalancing pass — both keep operating on
  tasks and members exactly as today; only day-of-week computation changes.
  The calendar view's rendering/query logic is also unchanged, since it
  already reads one day per database row regardless of how many rows a
  task produces.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `period-assignment`: the "Run the Weighted Assignment Algorithm"
  requirement changes so non-daily tasks receive 3 distinct days instead
  of 1, and tasks sharing a `day_group` receive the identical 3 days.
- `task-config-view`: the task catalog gains `day_group` as another
  optional attribute editable via the CRUD.

## Impact

- `supabase/schema.sql`: `tasks.day_group text` (nullable); relax the
  `assignments` unique constraint.
- A one-off SQL script to backfill `day_group = 'laundry'` on the 3 real
  laundry tasks, run by the user against the live database.
- `supabase/seed.sql`: updated for fresh installs.
- `lib/algorithm/rng.ts`: new `pickDistinctDays(rng, count)` helper.
- `lib/algorithm/assign.ts`: `AssignmentResult.dayOfWeek` changes from
  `number | null` to `number[] | null`; day computation groups by
  `dayGroup ?? task.id`. Person-selection and rebalancing logic unchanged.
- `lib/data/tasks.ts`, `components/task-form-dialog.tsx`,
  `app/configuracion/actions.ts`, `components/task-row.tsx`: `day_group`
  CRUD support.
- `lib/data/assignments.ts`: `runAssignment` expands each result into one
  row per day when inserting into Supabase. `getWeekScheduleForPeriod` and
  all calendar rendering: unchanged.
- `lib/algorithm/assign.test.ts`: updated/added tests for the new day-count
  and grouping behavior.
