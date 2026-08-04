## Context

`lib/algorithm/assign.ts` (from `period-assignment`, extended by
`assignment-eligibility`) currently picks a variable task's winner with
`ageWeight(age) / (1 + runningLoad)`, where `runningLoad` accumulates
`task.weight` (a difficulty number, 1 by default) across the period and
across prior assigned periods. In practice this produces results the
household perceives as arbitrarily lopsided (7 tasks to one member, 2 to
another) — two independent "who gets picked more" pressures (adults get
~5x the per-draw odds of a young child via `ageWeight`, and whoever
happens to win early heavy-weight tasks looks "loaded" for the rest of the
run) compound in ways that are hard to predict or explain. `min_age`
(from `assignment-eligibility`) already gives a hard, legible way to keep
a task away from members who shouldn't do it — the soft age-weighting is
now redundant with that and is the thing making results feel unfair.

## Goals / Non-Goals

**Goals:**
- One fairness mechanism: balance by how many tasks each member holds,
  full stop.
- Age's only role becomes the existing hard `min_age` exclusion — no more
  age-based probability boost.
- Remove `tasks.weight` entirely (schema, algorithm, CRUD) — it's no
  longer used by anything.
- Every existing task gets a sensible default `min_age` so the
  restriction is actually in effect for the real household, not just
  theoretically available.

**Non-Goals:**
- Changing the minimum-one-task guarantee pass's existence (still keep it
  — it directly helps the complaint) — only its internal metric changes
  from weight to count.
- Changing anything about fixed tasks, period definition, reroll, or
  Calendario's rendering.
- Reintroducing any other difficulty/weight concept later — if the
  household wants heavier tasks to count for more again, that's a future
  decision, not assumed here.

## Decisions

1. **Selection formula becomes `1 / (1 + tasksAlreadyHeld(member))`,
   computed only over members eligible per `min_age`.** No age
   multiplier. `tasksAlreadyHeld` starts from a historical count (see
   #3) and increments by 1 (not by weight) each time a member wins a
   variable task in this run.

2. **`tasks.weight` is dropped everywhere**: the `weight` column,
   `AlgorithmTask.weight`, `Task`/`TaskInput.weight`, the "peso" field in
   `task-form-dialog.tsx`, and any reference to it in `task-row.tsx` or
   `lib/data/assignments.ts`.

3. **Historical fairness metric changes from summed weight to a plain
   count**: `getHistoricalLoad` (renamed `getHistoricalTaskCount`) counts
   rows in `assignments` where `is_fixed = false` (excluding the period
   being (re-)assigned) grouped by `member_id` — no join to `tasks`
   needed anymore, since there's no weight to sum.

4. **The minimum-guarantee pass keeps its structure** (transfer one task
   from whoever currently holds the most, to any member left with zero,
   preferring a holder with slack so no one is zeroed out by the fix —
   from `assignment-eligibility`) but "most accumulated weight" becomes
   "most tasks held" — the same counter used for the main lottery.

5. **Variable-task processing order no longer sorts by weight** (nothing
   to sort by) — tasks are processed in the order given, which is already
   deterministic (stable DB query order).

6. **Data cleanup, not schema**: a one-time `UPDATE` sets `min_age = 10`
   on every task, then `min_age = 14` on the 3 "Cocinar" tasks — run
   after the `weight` column is dropped, as part of the same migration
   session. `supabase/seed.sql` is updated so a fresh install matches.

## Risks / Trade-offs

- **Adults no longer structurally "carry more"** — the previous
  ageWeight was a deliberate design choice ("adultos > menores"); removing
  it means fairness is now purely per-task-count, and any adult-should-do-
  more intent has to be expressed through `min_age` exclusions on specific
  tasks (already the direction chosen) rather than an overall bias. This
  is the explicit trade-off requested.
- **Existing task rows lose their weight value on drop** — acceptable;
  nothing reads it after this change ships, and the concept is being
  retired, not paused.

## Migration Plan

Run against Supabase (SQL Editor), in order:
```sql
alter table tasks drop column weight;
```
```sql
update tasks set min_age = 10;
update tasks set min_age = 14 where name ilike 'Cocinar%';
```
Also update `supabase/schema.sql` (remove the `weight` column) and
`supabase/seed.sql` (insert `min_age` directly) so a fresh install matches.
Rollback: re-add `weight numeric not null default 1 check (weight > 0)` and
recompute historical load by weight if ever needed — not expected.
