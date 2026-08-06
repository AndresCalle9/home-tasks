## Why

The assignment algorithm balances well on average, but a household still
sometimes needs to override a single result by hand — someone's traveling
that week, a preference changed, etc. Today the only way to change who does
a task is a full reroll (a brand-new random result for everything) or
editing the task's default in Configuración (which doesn't affect the
current period). There's no way to tweak just one task's responsible
member while keeping the rest of the current period's assignment intact.

## What Changes

- Add an inline control on the "Calendario" tab, on each *variable* task's
  row, to change its responsible member for the current period — without
  re-running the lottery or touching any other task's assignment.
- Only members eligible for that task (respecting `min_age`, the same rule
  the lottery itself uses) are selectable.
- Fixed tasks are unaffected — they keep showing their static "Fija ·
  Nombre" badge; reassigning them stays a period-review or
  Configuración-default decision, not something to hand-edit here.
- A task with multiple day-rows (from `puntual-task-scheduling`'s 3-day
  scheduling) gets all of its rows updated together, keeping one
  responsible member across every day of that task, as today.
- A manually-reassigned task is stored identically to an algorithm-picked
  one — it counts the same toward future periods' historical balance; no
  new flag or distinction is introduced.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `calendar-view`: gains a new requirement — manually reassigning a
  variable task's responsible member directly from the calendar.

## Impact

- `lib/data/assignments.ts`: new function updating `member_id` on every
  `assignments` row matching a given `period_id` + `task_id` (variable
  tasks only).
- `app/calendario/actions.ts`: new server action validating eligibility
  server-side before writing, then revalidating `/calendario`.
- `components/calendar-accordion.tsx`, `components/person-task-group.tsx`:
  thread `periodId` and the full `members` list through so a new small
  client component can render the reassignment control per variable task.
- No changes to `lib/algorithm/assign.ts`, `runAssignment`, or historical
  balance calculation.
- No schema changes.
