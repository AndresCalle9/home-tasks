## 1. Migration

- [x] 1.1 Add `min_age` to `tasks` in `supabase/schema.sql`, and run the
      matching `alter table tasks add column min_age smallint check
      (min_age is null or min_age >= 0)` against the real Supabase project
      (guide the user through the SQL Editor).

## 2. Algorithm

- [x] 2.1 Update `lib/algorithm/assign.ts`: add `minAge: number | null` to
      `AlgorithmTask`. Filter each variable task's eligible members by
      `minAge`; if none are eligible, fall back to the oldest member.
- [x] 2.2 Add the minimum-guarantee pass to `assignPeriod`: after the
      weighted lottery, for each member with zero variable-task wins (in
      household order), transfer one eligible task from the currently
      highest-`runningLoad` holder, per design.md's rule. Skip a member if
      they have no eligible variable task at all.
- [x] 2.3 Extend `lib/algorithm/assign.test.ts`: a task with `minAge`
      excludes a too-young member across many seeds; the no-eligible-member
      fallback picks the oldest member; the minimum-guarantee pass gives
      every member at least one variable task when enough eligible tasks
      exist; the reassignment doesn't change the total number of
      assignments (still one row per task) or duplicate a task.

## 3. Data access & CRUD

- [x] 3.1 Update `lib/data/tasks.ts`: `Task`/`TaskInput` gain
      `minAge: number | null`; `listTasks`/`createTask`/`updateTask` read/
      write `min_age`.
- [x] 3.2 Update `app/configuracion/actions.ts`'s task parsing to accept an
      optional `minAge` field (blank/absent → `null`, otherwise a
      non-negative integer, rejecting negative values).
- [x] 3.3 Update `lib/data/assignments.ts`'s `runAssignment` to pass
      `minAge` through to `assignPeriod`.

## 4. UI

- [x] 4.1 Add an optional "Edad mínima" number input to
      `components/task-form-dialog.tsx` (blank submits nothing/`null`).
- [x] 4.2 Show a small badge (e.g. "12+") in `components/task-row.tsx` when
      a task has `min_age` set.
- [x] 4.3 Verify with the `vercel-react-best-practices` skill.

## 5. Verification

- [x] 5.1 Run `npm run test`, `npm run build`, and `npm run lint`.
- [x] 5.2 Manually check with `npm run dev` against the real Supabase
      project: set a minimum age on one task, confirm it's respected across
      several reassignments/rerolls; confirm a member with no variable
      tasks after a run ends up with at least one once enough eligible
      tasks exist.
- [x] 5.3 Confirm `app/calendario`'s day/date logic and `lib/data/periods.ts`
      were not modified.
- [x] 5.4 Update `BACKLOG.md`: move the two related "Abiertos" items to
      "Resueltos" once this ships.
