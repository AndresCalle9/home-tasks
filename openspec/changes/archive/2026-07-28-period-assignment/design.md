## Context

`supabase/schema.sql` already has `periods`, `period_task_settings`, and
`assignments`, unused until now. `lib/data/members.ts` / `lib/data/tasks.ts`
already give real, RLS-bypassing server-only access to the catalog. This
change is the first to write to `periods`/`period_task_settings`/
`assignments`, and the first to read them back for Calendario.

Real household data point that matters for the algorithm: ages are 34, 50,
34, 16, 10 — two clear minors (10 and 16), three adults. The weighting must
meaningfully reduce the 10-year-old's share without excluding them (they
still have one fixed task, "Organizar habitación Antonia").

## Goals / Non-Goals

**Goals:**
- Deterministic assignment given a stored seed (same seed + same inputs →
  same output), so the algorithm is unit-testable.
- Age-weighted, load-balanced random assignment of variable tasks.
- Fixed tasks bypass the lottery entirely and don't count toward balance.
- Re-running the lottery for the same period ("volver a sortear") is
  possible and produces a different, still-deterministic result.
- Calendario reads the real current period once one exists.

**Non-Goals:**
- Multi-week planning ahead, or editing a period's dates after creation.
- Manually dragging/editing individual assignment results after the sorteo
  (only re-roll or redo the fixed/variable review is in scope).
- Any change to `app/configuracion`.
- Optimizing day-of-week spread for once-per-period tasks (e.g. avoiding 5
  tasks landing on the same day) — noted as a future improvement, not
  required now.

## Decisions

### 1. Schema change: `periods.seed`

```sql
alter table periods add column seed bigint not null default (
  (extract(epoch from clock_timestamp()) * 1000)::bigint
);
```

Stores the seed used for the most recent run of that period's lottery.
"Volver a sortear" generates a new random seed, re-runs the algorithm, and
overwrites both `periods.seed` and that period's rows in `assignments`.
`period_task_settings` (which tasks are fixed, and to whom) is untouched by
a re-roll — only the variable-task lottery and the once-per-period day
draws are redone.

### 2. A period is always exactly one Monday-to-Sunday week

`day_of_week` (0–6) on `assignments` only makes sense for a single week, and
Calendario is already a fixed Monday–Sunday view. Rather than accept
arbitrary start/end dates, the "define period" step only asks for a Monday
(a native `<input type="date">` constrained/validated to Monday); the end
date is always computed as `start_date + 6 days` and not user-editable.

### 3. Age weight: discrete tiers

```
ageWeight(age) =
  0.2  if age < 12
  0.6  if 12 <= age < 18
  1.0  if age >= 18
```

Applied to every variable-task draw (member 10y/o → 0.2, 16y/o → 0.6, the
three adults → 1.0).

### 4. Load balance: sum of `tasks.weight` for past variable assignments

`historicalLoad(memberId)` = sum of `tasks.weight` for all rows in
`assignments` where `member_id = memberId`, `is_fixed = false`, joined to
`periods` with `status = 'assigned'`, **excluding the period currently being
(re-)assigned** (so re-rolling a period doesn't count its own prior attempt
against itself). Zero history (first period ever) means everyone starts at
0 — the lottery falls back to pure age-weighting for that first run.

### 5. Selection weight combines both, per draw

```
selectionWeight(member) = ageWeight(member.age) / (1 + runningLoad(member))
```

`runningLoad` starts at `historicalLoad` and is incremented in-memory by
`task.weight` every time that member wins a task **within the same
lottery run**, so a run of many variable tasks self-balances instead of
only reacting to history from previous periods.

### 6. Deterministic seeded RNG: mulberry32

A tiny (~5 line) seeded PRNG (mulberry32) seeded from `periods.seed`,
advanced once per random draw, in a fixed processing order — no external
dependency needed for this. Lives in `lib/algorithm/rng.ts`, covered
directly by unit tests (same seed → same sequence).

### 7. Processing order: variable tasks sorted by `weight` desc, then `name`

Heavier/harder tasks are placed first, while `runningLoad` is closest to
the historical baseline — arguably the placement that matters most for
fairness gets the least-noisy signal. Order is otherwise fully determined
by task data, not iteration order from the DB.

### 8. Algorithm pseudocode

```
function assignPeriod(members, tasks, periodTaskSettings, historicalLoad, seed):
  rng = mulberry32(seed)
  runningLoad = copy(historicalLoad)  # memberId -> number, default 0
  results = []  # {taskId, memberId, dayOfWeek | null, isFixed}

  fixed = tasks where periodTaskSettings[task.id].isFixed
  variable = tasks where not periodTaskSettings[task.id].isFixed
  variable.sortDescendingBy(task => [task.weight, task.name])  # stable

  for task in fixed:
    memberId = periodTaskSettings[task.id].fixedMemberId
    dayOfWeek = task.isDaily ? null : pickDay(rng)
    results.push({taskId: task.id, memberId, dayOfWeek, isFixed: true})

  for task in variable:
    weights = members.map(m => ageWeight(m.age) / (1 + (runningLoad[m.id] ?? 0)))
    memberId = weightedPick(rng, members, weights).id
    runningLoad[memberId] = (runningLoad[memberId] ?? 0) + task.weight
    dayOfWeek = task.isDaily ? null : pickDay(rng)
    results.push({taskId: task.id, memberId, dayOfWeek, isFixed: false})

  return results

function pickDay(rng): return floor(rng() * 7)  # 0..6, one draw

function weightedPick(rng, items, weights):
  total = sum(weights)
  r = rng() * total
  for i in range(items.length):
    if r < weights[i]: return items[i]
    r -= weights[i]
  return items[last]  # float rounding fallback
```

`assignPeriod` is a pure function (`lib/algorithm/assign.ts`) — no Supabase
import, no Date.now(), no Math.random(). `lib/data/assignments.ts` wraps it:
loads inputs, calls it, deletes any existing rows for that period, inserts
the results, updates `periods.seed`/`status`.

### 9. UI flow: dedicated route, not a modal

`app/calendario/asignar/page.tsx`, a small client-side wizard (2 steps: date
→ review) backed by Server Actions, per the earlier decision (26 task rows
don't fit a dialog well). "Volver a sortear" lives as a second button
directly on Calendario once a period is `assigned` (no need to revisit the
wizard — it reuses the existing `period_task_settings`).

### 10. "Current period" for Calendario

The most recent period with `status = 'assigned'`, ordered by `start_date`
descending. If none exists, Calendario renders an empty state ("Aún no se
ha asignado ningún periodo") with a link into the wizard, instead of an
error.

### 11. Data-access additions

- `lib/data/periods.ts`: `createPeriod(startDate)`, `getCurrentPeriod()`,
  `listPeriodTaskSettings(periodId)`, `updatePeriodTaskSettings(periodId, rows)`.
- `lib/data/assignments.ts`: `getHistoricalLoad(excludePeriodId)`,
  `runAssignment(periodId)`, `rerollAssignment(periodId)`,
  `listAssignmentsForPeriod(periodId)` (joined with task/member for
  Calendario's rendering).
- All server-only, same pattern as `lib/data/members.ts` — no
  `SUPABASE_SERVICE_ROLE_KEY` access outside `lib/supabase/server-client.ts`,
  no new client-exposed credential.

## Risks / Trade-offs

- **A period longer/shorter than a week is impossible by design** →
  Accepted: matches the existing Monday–Sunday calendar and the
  `day_of_week` column; revisit only if the product ever needs multi-week
  periods.
- **Day-of-week for once-per-period tasks can cluster** (e.g. several
  landing on Saturday) → Accepted for now (Non-Goal); a future pass could
  spread them via round-robin instead of independent draws.
- **Re-rolling ignores this period's own prior attempt when computing
  historical load** → Intentional (Decision 4), otherwise re-rolling would
  be biased against whoever "won" the discarded attempt.

## Migration Plan

Run once against Supabase (SQL Editor, same as before):
```sql
alter table periods add column seed bigint not null default (
  (extract(epoch from clock_timestamp()) * 1000)::bigint
);
```
Also add the same column to `supabase/schema.sql` so a fresh install
matches. No data migration needed — `periods` has no rows yet. Rollback is
`alter table periods drop column seed;` (safe, no dependents).
