## 1. Migration & data cleanup

- [x] 1.1 Remove `weight` from `tasks` in `supabase/schema.sql`, and run
      `alter table tasks drop column weight;` against the real Supabase
      project (guide the user through the SQL Editor).
- [x] 1.2 Run a data cleanup against the real project: `update tasks set
      min_age = 10;` then `update tasks set min_age = 14 where name ilike
      'Cocinar%';`. Update `supabase/seed.sql` so a fresh install inserts
      `min_age` directly (10 default, 14 for the 3 "Cocinar" tasks) instead
      of leaving it null.

## 2. Algorithm

- [x] 2.1 Update `lib/algorithm/assign.ts`: remove `weight` from
      `AlgorithmTask` and `ageWeight` from the selection formula. New
      formula: `1 / (1 + tasksHeld(member))` over members eligible per
      `minAge`. Remove the weight-based sort of variable tasks (nothing to
      sort by).
- [x] 2.2 Update the minimum-guarantee pass to steal based on task count
      (whoever currently holds the most tasks) instead of accumulated
      weight, keeping the "prefer a holder with slack" rule.
- [x] 2.3 Rewrite `lib/algorithm/assign.test.ts` for the new formula:
      same seed → identical result; fixed tasks don't enter the lottery or
      count; `minAge` exclusion and oldest-member fallback still hold;
      across many seeds, task counts stay close for equally-eligible
      members (no age-based skew); the minimum-guarantee pass still gives
      every eligible member at least one task; exactly one assignment per
      task.

## 3. Data access & CRUD

- [x] 3.1 Update `lib/data/tasks.ts`: remove `weight` from `Task`/
      `TaskInput`, the select list, and insert/update payloads.
- [x] 3.2 Update `lib/data/assignments.ts`: rename `getHistoricalLoad` to
      `getHistoricalTaskCount`, counting `assignments` rows (`is_fixed =
      false`, excluding the period being (re-)assigned) grouped by
      `member_id` — no join to `tasks` needed. Update `runAssignment` to
      pass counts instead of weight-sums and to build `AlgorithmTask`
      without `weight`.
- [x] 3.3 Remove the "peso"/`weight` parsing from
      `app/configuracion/actions.ts`'s task input handling.

## 4. UI

- [x] 4.1 Remove the "Peso (dificultad relativa)" input from
      `components/task-form-dialog.tsx`.
- [x] 4.2 Remove any `weight` reference from `components/task-row.tsx` (it
      currently only shows daily/fixed/min-age badges — confirm nothing
      else needs to change).
- [x] 4.3 Verify with the `vercel-react-best-practices` skill.

## 5. Verification

- [x] 5.1 Run `npm run test`, `npm run build`, and `npm run lint`.
- [x] 5.2 Manually check with `npm run dev` against the real Supabase
      project: confirm the task form no longer shows "Peso"; confirm
      `min_age` defaults show as 10 (14 for Cocinar tasks) in the existing
      catalog; run/reroll an assignment and confirm task counts per member
      are close to even among equally-eligible members (not skewed by age).
- [x] 5.3 Confirm `app/calendario`'s accordion/grouping UI and
      `lib/data/periods.ts` were not modified.
- [x] 5.4 Update `BACKLOG.md` if this addresses or changes the framing of
      any open item.
