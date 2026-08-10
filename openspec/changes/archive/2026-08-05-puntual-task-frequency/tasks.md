## 1. Database

- [x] 1.1 Add `times_per_week smallint` nullable column to `tasks` in
      `supabase/schema.sql`, with check constraint
      `times_per_week is null or (times_per_week between 1 and 7)`.
- [x] 1.2 Write migration + backfill SQL (handed to the user to run against
      the live database, not executed automatically): the `ALTER TABLE`
      above, plus `UPDATE tasks SET times_per_week = 3 WHERE is_daily = false`.
      (User confirmed it ran; verified 0 non-daily tasks missing a value.)
- [x] 1.3 Update `supabase/seed.sql` so fresh installs seed `times_per_week`
      on every non-daily task (matching the current per-task defaults —
      3 for most, keep the laundry group consistent with each other).

## 2. Algorithm

- [x] 2.1 Remove `DAYS_PER_WEEK_FOR_NON_DAILY_TASK` from
      `lib/algorithm/assign.ts`; add `timesPerWeek: number | null` to
      `AlgorithmTask`.
- [x] 2.2 Update the `daysFor` helper to call
      `pickDistinctDays(rng, task.timesPerWeek ?? 3)` instead of the
      removed constant. Leave `dayGroupCache`'s keying/sharing logic
      unchanged.
- [x] 2.3 Update the call site in `lib/data/assignments.ts` (`runAssignment`)
      that maps `tasks` into `AlgorithmTask[]` to pass through
      `timesPerWeek`.

## 3. Data layer

- [x] 3.1 In `lib/data/tasks.ts`, add `timesPerWeek: number | null` to
      `Task`/`TaskInput`, update `toTask`/`createTask`/`updateTask` for the
      `times_per_week` column.

## 4. UI (Configuración task form)

- [x] 4.1 Apply the `vercel-react-best-practices` skill before touching
      `components/task-form-dialog.tsx`.
- [x] 4.2 Add a "Veces por semana" number input (1-7) to the task form,
      shown only when the task is not daily (same conditional-visibility
      pattern as the existing `day_group` field).
- [x] 4.3 In `app/configuracion/actions.ts`'s `parseTaskInput`: require a
      valid 1-7 `timesPerWeek` when `isDaily` is false (reject otherwise);
      force it to `null` when `isDaily` is true.
- [x] 4.4 In the same parsing/validation step, when `dayGroup` is set,
      fetch the household's other tasks (`listTasks()`) and reject the
      save if any other task sharing that `dayGroup` has a different
      `timesPerWeek`, naming the mismatch in the error.
- [x] 4.5 Show the configured frequency on the task row badge in
      `components/task-row.tsx`, alongside the existing `day_group` badge.

## 5. Documentation

- [x] 5.1 Reword the stale "reciben un día específico" sentence in
      `CLAUDE.md` to reflect that puntual tasks now have a per-task
      configurable weekly frequency.

## 6. Tests

- [x] 6.1 Update `AlgorithmTask` fixtures in `lib/algorithm/assign.test.ts`
      with `timesPerWeek`.
- [x] 6.2 Add a test: a task with `timesPerWeek = 1` gets exactly 1 day.
- [x] 6.3 Add a test: a task with `timesPerWeek = 5` gets exactly 5 distinct
      days.
- [x] 6.4 Confirm the existing day_group-sharing test still holds when the
      grouped tasks share a non-default (not 3) frequency.
- [x] 6.5 Run `npm test` and confirm 0 failures.

## 7. Verification against real data

- [x] 7.1 After the user runs the backfill (task 1.2) and sets specific
      frequencies via Configuración (e.g. "Lavar Baño" → 1), re-run the
      assignment against the real Supabase data and confirm each task gets
      exactly its configured number of days, not always 3. (Confirmed:
      backfill applied to all non-daily tasks, 0 missing; with
      "Lavar Baño Principal" forced to `times_per_week = 1`, it got
      exactly 1 day across seeds while the "laundry" day_group stayed at
      its configured 3 shared days.)
