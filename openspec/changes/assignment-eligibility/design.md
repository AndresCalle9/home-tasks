## Context

`lib/algorithm/assign.ts` (from `period-assignment`) already weights every
variable task's lottery by `ageWeight(age) / (1 + runningLoad)`, but every
member is eligible for every task — age only lowers the odds, never
excludes. Real gap: a household member young enough that a task is unsafe
(cooking) can still occasionally win it, and a consistently low-weight
member (a young child) can end a whole period with zero variable tasks
purely by chance. `tasks` (`supabase/schema.sql`) has no per-task
eligibility field today.

## Goals / Non-Goals

**Goals:**
- A task can declare a minimum age; members below it never win that task's
  lottery.
- Every active member ends a period's variable-task lottery with at least
  one task, provided at least one eligible task exists for them.
- Both changes are deterministic given the same seed (the guarantee pass
  is a deterministic reassignment rule, not a second random draw).

**Non-Goals:**
- Deciding what minimum age to set on any specific real task (e.g.
  "Cocinar Cena") — that's a per-household editorial choice made from
  Configuración, not something this change hardcodes.
- Multiple eligibility dimensions beyond age (e.g. per-member task
  blocklists) — only `min_age` is in scope.
- Changing `ageWeight` itself or the load-balance formula.

## Decisions

1. **Schema**: `tasks.min_age smallint` (nullable, `null` = no
   restriction), `check (min_age is null or min_age >= 0)`.

2. **Eligibility filter, applied before the weighted pick**:
   ```
   eligible(task) = members.filter(m => task.minAge == null or m.age >= task.minAge)
   ```
   If `eligible(task)` is empty (no one in the household meets the
   minimum — e.g. a household with only kids and a task requiring 18+),
   fall back to the oldest member in the household rather than fail to
   assign the task at all.

3. **Minimum-guarantee pass, run once after the normal lottery**:
   ```
   for member in members (in household order):
     if member has zero variable-task wins:
       candidates = variable-task results where member is eligible for that task
       if candidates is empty: continue  # nothing safe to give them; leave as-is
       # take the task from whoever currently holds the most accumulated load,
       # among tasks this member is actually eligible for
       target = candidates sorted by (current holder's runningLoad) descending, first
       runningLoad[target.currentHolder] -= target.task.weight
       runningLoad[member] += target.task.weight
       target.memberId = member.id
   ```
   This only reassigns already-decided results in place — no new random
   draw, so a reroll's determinism is unaffected. Processing members in a
   fixed order (the same order as the `members` array) makes the pass
   itself deterministic when more than one member needs a top-up.

4. **`task-form-dialog.tsx` gains an optional "Edad mínima" number input.**
   Blank submits `null`. `task-row.tsx` shows a small badge (e.g. "12+")
   when set, alongside the existing Diaria/Puntual and Fija/Variable
   badges.

## Risks / Trade-offs

- **A single reassignment pass could theoretically leave the task's
  previous holder at zero** (only plausible in a household with very few
  members and few variable tasks — not this household's scale) → Accepted;
  not worth a recursive fixup for a household-sized dataset.
- **The "steal from the most-loaded eligible holder" rule could clash with
  that member's own fixed tasks being untouched** → Not a conflict: fixed
  tasks are never candidates for reassignment (already excluded from
  `runningLoad`/the variable-task pool).
- **Setting a `min_age` that excludes everyone but one adult concentrates
  that task on them every period** → Inherent to the feature (that's what
  "requires an adult" means); the household controls this via the field
  they set, not something the algorithm can fix.

## Migration Plan

```sql
alter table tasks add column min_age smallint check (min_age is null or min_age >= 0);
```
Run once against Supabase (SQL Editor), same as previous migrations. No
data migration — existing tasks default to `null` (no restriction) until
edited from Configuración.
