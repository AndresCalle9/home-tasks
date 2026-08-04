## 1. Database

- [x] 1.1 Add `day_group text` nullable column to `tasks` in
      `supabase/schema.sql`.
- [x] 1.2 Relax the `assignments` unique constraint from
      `unique (period_id, task_id)` to
      `unique (period_id, task_id, day_of_week)` in `supabase/schema.sql`.
- [x] 1.3 Write migration + backfill SQL (handed to the user to run against
      the live database, not executed automatically): the `ALTER TABLE`
      for both changes above, plus
      `UPDATE tasks SET day_group = 'laundry' WHERE name IN ('Lavar ropa', 'Extender ropa', 'Doblar ropa')`.
      (User confirmed it ran.)
- [x] 1.4 Update `supabase/seed.sql` so fresh installs seed `day_group` on
      the 3 laundry tasks and reflect the relaxed `assignments` constraint.

## 2. Algorithm

- [x] 2.1 Add `pickDistinctDays(rng, count)` to `lib/algorithm/rng.ts`
      (rejection-sampling loop over the existing `pickDay`, returns `count`
      distinct sorted days).
- [x] 2.2 In `lib/algorithm/assign.ts`: add `dayGroup: string | null` to
      `AlgorithmTask`; change `AssignmentResult.dayOfWeek` from
      `number | null` to `number[] | null`.
- [x] 2.3 Add a `dayGroupCache: Map<string, number[]>` local to
      `assignPeriod`, shared across the fixed and variable loops. Replace
      the `task.isDaily ? null : pickDay(rng)` day computation in both
      loops with a lookup/populate against this cache, keyed by
      `task.dayGroup ?? task.id`, drawing 3 distinct days via
      `pickDistinctDays` the first time a group is encountered.
- [x] 2.4 Confirm the rebalancing pass needs no changes — it only reads/
      writes `taskId`/`memberId`, never `dayOfWeek`. (Confirmed by
      inspection — unchanged.)

## 3. Data layer

- [x] 3.1 In `lib/data/tasks.ts`, add `dayGroup: string | null` to
      `Task`/`TaskInput`, update `toTask`/`createTask`/`updateTask` for the
      `day_group` column.
- [x] 3.2 In `lib/data/assignments.ts`'s `runAssignment`, change the insert
      step to `flatMap` each result into one row per day (or one row with
      `day_of_week: null` for daily tasks) instead of a 1:1 map. Update the
      call site that builds `AlgorithmTask[]` to pass `dayGroup`.
- [x] 3.3 Confirm `getWeekScheduleForPeriod` and `lib/calendar-schedule.ts`
      need no changes — they already read one day per row. (Confirmed by
      inspection — unchanged.)

## 4. UI (Configuración task form)

- [x] 4.1 Apply the `vercel-react-best-practices` skill before touching
      `components/task-form-dialog.tsx`.
- [x] 4.2 Add an optional "Grupo de día" text input to the task form, with
      helper text explaining tasks sharing the value always land on the
      same days. (Only shown when the task is not daily.)
- [x] 4.3 In `app/configuracion/actions.ts`'s `parseTaskInput`, parse and
      trim the new field (empty string → null).
- [x] 4.4 Show the day group as a badge on `components/task-row.tsx` when
      set.

## 5. Tests

- [x] 5.1 Update the existing "assigns a dayOfWeek in range for non-daily
      tasks and null for daily tasks" test in `lib/algorithm/assign.test.ts`
      for the new array shape: non-daily tasks get an array of exactly 3
      distinct values in 0–6; daily tasks get `null`.
- [x] 5.2 Add a test: two tasks sharing a `dayGroup` always receive the
      identical 3-day array, across many seeds — and can still end up with
      different members, proving grouping ties only days, not people.
- [x] 5.3 Add a test: tasks with no `dayGroup` (or different groups) are
      NOT forced to share days.
- [x] 5.4 Same seed reproduces the same day arrays. (Already covered by the
      existing "is deterministic for a given seed" test — it does a deep
      `toEqual` on the full result, which now includes `dayOfWeek` arrays;
      no separate test needed.)
- [x] 5.5 Confirm the rebalancing pass never changes a transferred task's
      `dayOfWeek` — only `memberId`. (Covered by 5.2's assertion that
      grouped tasks can end up with different members while keeping
      identical days — demonstrates day computation and member assignment,
      including any rebalancing, are fully decoupled.)
- [x] 5.6 Run `npm test` and confirm 0 failures. (16/16 passing.)

## 6. Verification against real data

- [x] 6.1 After the user runs the migration/backfill (task 1.3), re-run the
      assignment against the real Supabase data and confirm: every
      non-daily task gets 3 days; "Lavar ropa", "Extender ropa", and
      "Doblar ropa" land on the identical 3 days. (Confirmed across 3
      seeds: every puntual task got exactly 3 distinct days; the 3 laundry
      tasks shared identical days each time, even when assigned to
      different members.)
