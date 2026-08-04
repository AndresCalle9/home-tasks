## Context

`lib/algorithm/assign.ts`'s `assignPeriod` currently gives every non-daily
task exactly one day via `pickDay(rng)`, independently per task, with no
concept of relatedness between tasks. Real complaint: "Lavar ropa" and
"Extender ropa" (wash → hang to dry) can land on different days, which is
incoherent for a household. Separately, the actual requirement is 3
occurrences per week per puntual task, not 1. Neither issue involves who is
assigned a task — `eligibleMembers`, the least-loaded selection loop, and
the busiest/neediest rebalancing pass (from `strict-load-balance` and
`period-fixed-load-balance`) are explicitly out of scope and must not change.

**Supabase tables involved:**
- `tasks`: add `day_group text` (nullable, no FK — a plain shared label,
  no relational structure needed since the rule is "same tag ⇒ same days",
  nothing more).
- `assignments`: relax `unique (period_id, task_id)` to
  `unique (period_id, task_id, day_of_week)`, since a non-daily task will
  now produce 3 rows (one per day) instead of 1. No column changes.

## Goals / Non-Goals

**Goals:**
- Every `is_daily = false` task (fixed or variable) gets 3 distinct days
  per period instead of 1.
- Tasks sharing a `day_group` always get the identical set of 3 days.
- Zero changes to person-selection or rebalancing logic.
- Zero changes to calendar-rendering/query code.

**Non-Goals:**
- Dependency/offset scheduling between grouped tasks (e.g. "fold 1 day
  after wash") — out of scope for this MVP; `day_group` only means "same
  days", not "sequenced days".
- Per-task configurable frequency (2x, 4x, etc.) — hardcoded to 3 for all
  non-daily tasks in this change.
- Any change to daily tasks' scheduling (unaffected — they still have no
  day, applying to every day of the period as today).

## Decisions

### `day_group`: a plain shared text tag, not a relation

A nullable `text` column on `tasks`. Two tasks are "grouped" iff both have
the same non-null `day_group` value. No self-referencing FK, no join table:
the only operation needed is "give me all tasks sharing this task's group",
which a plain equality filter on a text column does directly. Ungrouped
tasks (`day_group is null`) are never grouped with anything, including each
other.

**Alternative considered — self-referencing FK (`depends_on_task_id`) or a
join table.** Rejected: implies a relationship *between specific tasks*
that would invite adding sequencing/offset semantics later, which is
explicitly out of scope now. A shared tag is simpler to reason about, to
seed, and to edit via CRUD (a single optional text field vs. managing a
relationship UI).

### Algorithm: array-valued `dayOfWeek`, computed via a per-run group cache

```
AssignmentResult.dayOfWeek: number[] | null   // was: number | null
```

`null` for daily tasks (unchanged meaning). For non-daily tasks, an array of
3 distinct days (0–6). Pseudocode, dropped into the existing fixed/variable
loops in place of the current `task.isDaily ? null : pickDay(rng)`:

```
const dayGroupCache = new Map<string, number[]>()   // shared across both loops

function daysFor(task, rng):
  if task.isDaily: return null
  groupKey = task.dayGroup ?? task.id     // ungrouped tasks are their own singleton group
  if not dayGroupCache.has(groupKey):
    dayGroupCache.set(groupKey, pickDistinctDays(rng, 3))
  return dayGroupCache.get(groupKey)

# in both the fixed loop and the variable loop, replace the day computation:
results.push({ ..., dayOfWeek: daysFor(task, rng), ... })
```

`pickDistinctDays(rng, count)` (new helper in `rng.ts`): rejection-sampling
loop over the existing `pickDay(rng)` until `count` distinct values are
collected, sorted ascending for a stable read. Still fully deterministic
per seed — the number of rng calls can vary slightly by seed, but the
*sequence* for a given seed is always the same, which is all determinism
requires.

Because the cache is a single `Map` local to one `assignPeriod` call and is
consulted by both the fixed loop (which runs first) and the variable loop,
whichever task in a group is encountered first draws the group's 3 days;
every other task in the same group — fixed or variable — reuses them
verbatim, regardless of which loop it's in.

**Why this doesn't touch the rebalancing pass at all:** the pass only ever
reads/writes `taskId` and `memberId` on a `AssignmentResult`; `dayOfWeek` is
untouched by it today and stays untouched. Keeping exactly one
`AssignmentResult` per task (now holding an array) rather than exploding
into 3 separate result objects per task means the rebalancing pass's
existing `variableResults.find(...)` logic needs zero changes — it already
operates at the "one task = one result" granularity it was written for.

**Alternative considered — one `AssignmentResult` per (task, day) pair.**
Rejected: would require the rebalancing pass to find and transfer *all 3*
matching rows together atomically instead of accidentally moving just one
day of a 3-day task to a different member. Keeping the array inside a
single result sidesteps that failure mode entirely by construction.

### Data layer: expand at insert time only

`lib/data/assignments.ts`'s `runAssignment` is the only place that changes:

```
const rows = results.flatMap((r) =>
  r.dayOfWeek == null
    ? [{ period_id, task_id: r.taskId, member_id: r.memberId, day_of_week: null, is_fixed: r.isFixed }]
    : r.dayOfWeek.map((d) => ({ period_id, task_id: r.taskId, member_id: r.memberId, day_of_week: d, is_fixed: r.isFixed }))
)
```

`getWeekScheduleForPeriod` and every calendar-rendering component are
unchanged: they already read one day per `assignments` row and group by
`day_of_week`, which continues to work identically whether a task produced
1 row (daily) or 3 rows (non-daily) — from the query's perspective it's
just "more rows for the same task_id", already handled by the existing
per-row shape.

No Supabase credentials are touched by this change — confirmed:
`lib/algorithm/{assign,rng}.ts` have no Supabase imports (unchanged); the
`runAssignment` change stays entirely within the existing server-only
`lib/data/assignments.ts` module.

## Risks / Trade-offs

- **[Risk] `pickDistinctDays` could theoretically loop many times on
  unlucky RNG sequences.** → With 7 possible days and only 3 needed, the
  expected number of draws is small (~4–5); no practical risk of a long or
  unbounded loop.
- **[Risk] A user tags unrelated tasks with the same `day_group` by
  mistake**, forcing them onto the same days. → No DB-level guard beyond
  the tag being freeform text; acceptable for this MVP since grouping is an
  explicit, visible choice in the CRUD, not an inferred one.
- **[Risk] Existing tests assume `dayOfWeek` is a single number.** → Must
  update every assertion touching `.dayOfWeek` in `assign.test.ts`, not
  just add new ones — a partial update would leave stale, now-nonsensical
  assertions (e.g. comparing an array to a number range).

## Migration Plan

1. `ALTER TABLE tasks ADD COLUMN day_group text;`
2. `ALTER TABLE assignments DROP CONSTRAINT assignments_period_id_task_id_key, ADD CONSTRAINT assignments_period_id_task_id_day_of_week_key UNIQUE (period_id, task_id, day_of_week);` (exact constraint name to be confirmed against the live schema before handing to the user — Postgres auto-names unique constraints from a `UNIQUE (...)` inline declaration).
3. Backfill `day_group = 'laundry'` on the 3 real laundry tasks (SQL handed
   to the user, same pattern as prior migrations).
4. Update `supabase/seed.sql` for fresh installs.
5. Deploy the code. The next "Asignar tareas" or "Reroll" run uses the new
   3-day/grouped logic automatically — no retroactive change to
   already-assigned periods.
6. Rollback: revert the code deploy; the schema additions (nullable column,
   relaxed constraint) are backward-compatible and don't need reverting.

## Open Questions

None — both design decisions (plain shared tag, 3 days for all non-daily
tasks including fixed) were confirmed directly with the user before this
proposal was created.
