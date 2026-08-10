## Why

Every once-per-period ("puntual") task currently gets a hardcoded 3 days a
week (from the already-archived `puntual-task-scheduling` change). That
doesn't fit every task: "Lavar Baño" realistically only needs once a week,
while "Sacar basura" or "Lavar ropa" need to happen more like every other
day (~3-4x/week). One fixed number can't represent both.

## What Changes

- Add a configurable frequency (`times_per_week`, 1-7) to each puntual
  (`is_daily = false`) task, replacing the hardcoded constant of 3. Fixed
  and variable puntual tasks alike get to configure this, matching the
  existing symmetry between the two.
- Keep the existing random-day mechanism (`pickDistinctDays`) — this
  changes only how many days are drawn, not how they're chosen. No true
  evenly-spaced "every N days" interval scheduling is introduced.
- Tasks sharing a `day_group` (which always land on identical days) must
  also share an identical `times_per_week` — the CRUD SHALL reject saving
  a task whose frequency doesn't match the rest of its group.
- **BREAKING** (data model): `tasks.times_per_week` is required for every
  non-daily task going forward; existing rows need a one-off backfill
  (default 3, matching current behavior) before the CRUD's new validation
  is exercised.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `period-assignment`: the "Run the Weighted Assignment Algorithm"
  requirement changes so a non-daily task's day count comes from its own
  `times_per_week` instead of a fixed constant.
- `task-config-view`: the task catalog gains `times_per_week` as another
  attribute editable via the CRUD, with day_group-consistency validation.

## Impact

- `supabase/schema.sql`: `tasks.times_per_week smallint` (nullable, check
  1-7).
- A one-off backfill SQL script (handed to the user, not run
  automatically): sets `times_per_week = 3` on every existing non-daily
  task.
- `supabase/seed.sql`: updated for fresh installs.
- `lib/algorithm/assign.ts`: `AlgorithmTask` gains `timesPerWeek`; the
  existing `daysFor` helper uses it instead of the removed constant.
- `lib/data/tasks.ts`, `components/task-form-dialog.tsx`,
  `app/configuracion/actions.ts`, `components/task-row.tsx`:
  `times_per_week` CRUD support + day_group-consistency validation.
- `CLAUDE.md`: reword the stale "reciben un día específico" sentence.
- `lib/algorithm/assign.test.ts`: updated fixtures and new tests for
  per-task frequency.
- No changes to person-selection, the lottery, or the rebalancing pass.
