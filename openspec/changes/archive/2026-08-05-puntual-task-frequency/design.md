## Context

`lib/algorithm/assign.ts` currently hardcodes
`DAYS_PER_WEEK_FOR_NON_DAILY_TASK = 3` and uses it for every non-daily
task's day count, via a `daysFor(task)` helper that draws
`pickDistinctDays(rng, DAYS_PER_WEEK_FOR_NON_DAILY_TASK)` and caches the
result per `dayGroupCache` key (`task.dayGroup ?? task.id`), shared across
the fixed and variable loops. Real household need: "Lavar Baño" should be
1x/week, "Sacar basura"/"Lavar ropa" more like 3-4x/week. This change makes
that count configurable per task — nothing else about day computation
changes.

**Supabase tables involved:** `tasks` gains `times_per_week smallint`
(nullable, check `times_per_week is null or (times_per_week between 1 and
7)`), meaningful only when `is_daily = false`. No other schema changes.

## Goals / Non-Goals

**Goals:**
- Each non-daily task's day count comes from its own configured
  `times_per_week` (1-7) instead of a shared constant.
- Tasks sharing a `day_group` are guaranteed to share the same
  `times_per_week` too — enforced at save time, not worked around at
  algorithm runtime.
- Zero changes to person-selection, the lottery, or the rebalancing pass.

**Non-Goals:**
- True evenly-spaced "every N days" interval scheduling (e.g. exact
  Mon/Wed/Fri spacing) — considered and rejected for this MVP; the
  existing random-N-of-7-days mechanism stays, just with a configurable N.
- Per-period frequency overrides (like fixed/variable settings have) —
  `times_per_week` is a task-level default only, not something the period
  review step lets you change per period. Out of scope; can be a future
  change if ever needed.

## Decisions

### Schema: nullable column, meaningful only when `is_daily = false`

Same shape as `min_age`/`day_group`: `times_per_week smallint` with a
check constraint bounding it to 1-7 when set. Not making it `NOT NULL`
because daily tasks have no use for it (must be null for them, enforced by
the CRUD, not the DB — mirrors how `day_group`/`min_age` are handled).

### Algorithm: `daysFor` reads `task.timesPerWeek`, constant removed

```ts
// lib/algorithm/assign.ts
function daysFor(task: AlgorithmTask): number[] | null {
  if (task.isDaily) return null;
  const groupKey = task.dayGroup ?? task.id;
  if (!dayGroupCache.has(groupKey)) {
    dayGroupCache.set(groupKey, pickDistinctDays(rng, task.timesPerWeek ?? 3));
  }
  return dayGroupCache.get(groupKey)!;
}
```

`DAYS_PER_WEEK_FOR_NON_DAILY_TASK` is deleted. The `?? 3` fallback is
defensive only — the CRUD is expected to always populate a value for
non-daily tasks, but the algorithm shouldn't crash or strand a task if a
stray row somehow lacks one (same "never strand a task" philosophy as the
`min_age` oldest-member fallback).

The `dayGroupCache` mechanism itself is completely unchanged: whichever
task in a group is processed first still draws the group's days, using
*its own* `timesPerWeek` — which, thanks to the CRUD-side consistency
check below, is guaranteed identical to every other task in that group by
the time this code ever runs. The algorithm does not re-validate that
consistency itself; that's a save-time concern, not a run-time one.

**Alternative considered — validate day_group frequency consistency inside
`assignPeriod` too, as a second line of defense.** Rejected: `assignPeriod`
is a pure function with no way to "reject" bad input other than throwing,
and throwing mid-assignment is a worse failure mode than a CRUD that
simply never lets inconsistent data get saved in the first place. If
inconsistent data somehow exists (e.g. manually edited in the DB), the
existing fallback behavior (first-task-wins for the cache) degrades
gracefully rather than crashing the whole assignment run.

### CRUD: required for non-daily, forced null for daily, cross-task check

`parseTaskInput` in `app/configuracion/actions.ts`:
- If `isDaily`: `timesPerWeek` is forced to `null` (ignoring whatever the
  hidden/disabled form field might contain).
- If `!isDaily`: required, must parse to an integer 1-7; reject with an
  inline error otherwise.
- If `dayGroup` is set (non-null): fetch the household's other tasks via
  the existing `listTasks()` (same "fetch all, filter in memory" pattern
  `reassignTaskAction` already uses in `app/calendario/actions.ts` — cheap
  at this household's scale) and find any other task sharing that
  `dayGroup`. If one exists with a different `timesPerWeek`, reject the
  save with an error naming the mismatch (e.g. "Lavar ropa" is 3x/semana;
  esta tarea debe usar el mismo valor").

**Alternative considered — let the day_group's frequency be derived
automatically from whichever task was created first, hiding the field for
subsequently-added tasks in the same group.** Rejected: more magic, harder
to reason about in the UI (a user editing task B wouldn't see why the
field is disabled or where the number "3" came from). An explicit
validation error that names the conflict is more legible for a small
household CRUD.

### UI: same conditional-visibility pattern as `day_group`

The task form shows a "Veces por semana" number input (1-7) only when
`!isDaily`, right next to the existing `day_group` field — same
`{!isDaily && (...)}` conditional already used there.

## Risks / Trade-offs

- **[Risk] Existing rows have no `times_per_week` until the backfill
  runs.** → The algorithm's `?? 3` fallback keeps assignment working in
  the interim (matching current behavior); the CRUD's new required-field
  validation only blocks *saving* a task without one, not *running* the
  assignment against tasks that don't have one yet.
- **[Risk] A user sets an inconsistent day_group frequency directly via
  SQL, bypassing the CRUD's check.** → Documented, accepted: the
  algorithm's graceful first-task-wins fallback (see above) means this
  degrades rather than breaks; not worth adding runtime validation for a
  self-inflicted, SQL-only edge case in a single-household app.

No Supabase credentials are touched — confirmed: `lib/algorithm/assign.ts`
has no Supabase imports (unchanged); the CRUD changes reuse the existing
server-only `lib/data/tasks.ts` module.

## Migration Plan

1. `ALTER TABLE tasks ADD COLUMN times_per_week smallint CHECK (times_per_week IS NULL OR (times_per_week BETWEEN 1 AND 7));`
2. Backfill: `UPDATE tasks SET times_per_week = 3 WHERE is_daily = false;`
   (handed to the user to run, matching every prior migration in this
   project).
3. Update `supabase/seed.sql` for fresh installs.
4. Deploy the code. The user can then adjust specific tasks (e.g. "Lavar
   Baño" → 1) via Configuración — no further SQL needed for that part,
   consistent with every other task attribute in this app.
5. Rollback: revert the commit; the schema addition (nullable column) is
   backward-compatible and doesn't need reverting.

## Open Questions

None — both design decisions (random-N-of-7 model, required day_group
consistency) were confirmed directly with the user before this proposal
was created.
