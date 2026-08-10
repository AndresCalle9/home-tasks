## 1. Schema & migration

- [x] 1.1 Write `supabase/migrations/period-editing-upgrades.sql`: create
      `task_default_fixed_members`, `period_task_setting_fixed_members`,
      `assignment_completions` (per design.md §Migration Plan); backfill both
      join tables from the existing `default_fixed_member_id` /
      `fixed_member_id` columns; drop the `fixed_task_has_member` /
      `fixed_setting_has_member` check constraints and the two old columns;
      enable RLS (no policies) on all three new tables.
- [x] 1.2 Update `supabase/schema.sql` to reflect the new tables/columns as
      the source of truth for fresh installs (drop the two old FK columns
      and their constraints there too).
- [x] 1.3 Add `SECURITY_PASSWORD=` to `.env.example` with a comment
      explaining it's server-only, never `NEXT_PUBLIC_`, and gates running/
      rerolling the sorteo plus the calendar's member/day edit controls.
- [x] 1.4 Hand the migration SQL and an explanation to the user to run by
      hand against Supabase (do not execute automatically) — same pattern as
      every prior schema change in this project.

## 2. Algorithm: multi-member fixed tasks

- [x] 2.1 In `lib/algorithm/assign.ts`, change `PeriodTaskSetting` from
      `fixedMemberId: string | null` to `fixedMemberIds: string[]`.
- [x] 2.2 Rework the fixed-task loop to run least-loaded selection
      (`pickUniform` over the strict-minimum-`runningCount` subset of
      `fixedMemberIds`) instead of assigning the single configured member,
      per design.md §Decision 2 pseudocode; add the defensive fallback to
      `eligibleMembers(members, task)` when `fixedMemberIds` is empty.
- [x] 2.3 Update `lib/data/assignments.ts`'s `runAssignment` to map
      `period_task_settings` rows (now carrying multiple fixed members) into
      `fixedMemberIds` arrays instead of a single `fixedMemberId`.

## 3. Data layer: multi-member fixed CRUD

- [x] 3.1 In `lib/data/tasks.ts`, replace `defaultFixedMemberId: string |
      null` with `defaultFixedMemberIds: string[]` on `Task`/`TaskInput`;
      `listTasks` joins `task_default_fixed_members`; `createTask`/
      `updateTask` write the full member set to that join table (delete +
      re-insert on update, inside the same request).
- [x] 3.2 In `lib/data/periods.ts`, replace `fixedMemberId: string | null`
      with `fixedMemberIds: string[]` on `ReviewRow`; `createPeriod` seeds
      `period_task_setting_fixed_members` from each task's default fixed
      members; `listPeriodTaskSettings` joins the member set;
      `updatePeriodTaskSettings` writes the full member set per row (delete
      + re-insert per period_task_setting on update).
- [x] 3.3 In `lib/data/members.ts`'s `deleteMember`, check membership in both
      `task_default_fixed_members` and `period_task_setting_fixed_members`
      before deleting; reject with the existing "reassign those tasks first"
      error if either has a row for that member.

## 4. CRUD UI: multi-member fixed selection

- [x] 4.1 Apply the `vercel-react-best-practices` skill before touching
      `components/task-form-dialog.tsx` and `components/period-review-table.tsx`.
- [x] 4.2 In `components/task-form-dialog.tsx`, replace the single fixed-
      member `Select` with a multi-select (e.g. a checkbox list or a multi-
      value `Select`) over `members`, submitting one form field per selected
      member; require at least one when `defaultIsFixed` is on.
- [x] 4.3 In `app/configuracion/actions.ts`'s `parseTaskInput`, parse the
      submitted set of member ids for a fixed task, require at least one,
      and pass `defaultFixedMemberIds` through to `createTask`/`updateTask`.
- [x] 4.4 In `components/period-review-table.tsx`, replace the single fixed-
      member `Select` per task row with the same multi-select pattern; keep
      it seeded from `ReviewRow.fixedMemberIds`.
- [x] 4.5 In `app/calendario/asignar/actions.ts`'s `confirmAssignmentAction`,
      parse the submitted member sets per task, require at least one per
      fixed task, and pass `fixedMemberIds` through to
      `updatePeriodTaskSettings`.
- [x] 4.6 Update `components/task-row.tsx`'s fixed-member badge to list all
      enabled members (e.g. joined by comma) instead of a single name.

## 5. Security: shared password gate

- [x] 5.1 Create `lib/security/password.ts` with
      `verifySecurityPassword(submitted: string): boolean`, comparing
      against `process.env.SECURITY_PASSWORD` and failing closed (returns
      `false`) when the env var is unset — never log the value either side
      of the comparison.
- [x] 5.2 Create `components/password-gated-select.tsx`: a controlled
      `Select` wrapper (per design.md §Decision 5) that opens a confirmation
      dialog with a password `Input` on `onValueChange`, and only invokes
      the passed-in server action (with `password` added to its `FormData`)
      once the dialog is confirmed; cancelling closes the dialog without
      calling the action, and the `Select` reverts to `currentValue` since
      it's controlled by that prop, not local state.
- [x] 5.3 Create `components/password-confirm-dialog.tsx` (per design.md
      §Decision 5's two usage modes): a self-contained-form mode matching
      `components/delete-confirm-dialog.tsx`'s existing `AlertDialog`
      pattern (hidden fields + password `Input` + submit, for
      `RerollButton`), and a `getFormData`-prop mode for
      `PeriodReviewTable`'s multi-row form, where confirming reads the
      surrounding form via a `ref`, appends `password`, and calls
      `formAction(...)` directly instead of submitting natively.
- [x] 5.4 In `app/calendario/asignar/actions.ts`'s `confirmAssignmentAction`
      and `app/calendario/actions.ts`'s `rerollAction`, call
      `verifySecurityPassword` first and return an inline error (no
      mutation) on failure, per the MODIFIED `period-assignment` /
      `calendar-view` requirements.
- [x] 5.5 Apply the `vercel-react-best-practices` skill before editing
      `components/reroll-button.tsx` and `components/period-review-table.tsx`.
- [x] 5.6 Wire `components/reroll-button.tsx`'s "Volver a sortear" and
      `components/period-review-table.tsx`'s "Confirmar y asignar" through
      `PasswordConfirmDialog` instead of a bare submit `Button`.

## 6. Calendar day-override control

- [x] 6.1 In `lib/data/assignments.ts`, add
      `reassignTaskDay(periodId, taskId, dayOfWeek)`, updating the single
      `assignments` row for that `(period_id, task_id)`; reject (return an
      error `MutationResult`) if the task's `day_group` is non-null.
- [x] 6.2 In `app/calendario/actions.ts`, add `reassignTaskDayAction`:
      verify `verifySecurityPassword` first (return an inline error and do
      nothing on failure); otherwise validate the task has
      `times_per_week === 1` and no `day_group`, then call
      `reassignTaskDay` and `revalidatePath("/calendario")`.
- [x] 6.3 Update `app/calendario/actions.ts`'s existing `reassignTaskAction`
      to also call `verifySecurityPassword` first, per the MODIFIED
      requirement in `calendar-view`'s delta spec.
- [x] 6.4 Apply the `vercel-react-best-practices` skill before creating
      `components/task-day-select.tsx` and editing
      `components/person-task-group.tsx` / `components/calendar-accordion.tsx`.
- [x] 6.5 Create `components/task-day-select.tsx` on top of
      `PasswordGatedSelect`, offering the 7 `DAY_NAMES` and calling
      `reassignTaskDayAction`; render it in `components/person-task-group.tsx`
      only for items where `task.timesPerWeek === 1 && task.dayGroup ==
      null`, alongside the existing member control.
- [x] 6.6 Thread the current day's `dayOfWeek` down from
      `components/calendar-accordion.tsx` through `PersonTaskGroup` to
      `TaskDaySelect` (it needs to know which day it's currently rendered
      under, to preselect and to pass as the "from" context).
- [x] 6.7 Rewrite `components/task-member-select.tsx` on top of
      `PasswordGatedSelect` so the existing reassignment control also goes
      through the same password-confirmation flow.

## 7. Calendar completion checkboxes

- [x] 7.1 In `lib/data/assignments.ts`, add
      `toggleAssignmentCompletion(assignmentId, dayOfWeek, completed)`,
      upserting into `assignment_completions` on `(assignment_id,
      day_of_week)`.
- [x] 7.2 Update `getWeekScheduleForPeriod` to select `id` from
      `assignments` and left-join `assignment_completions`, then for each
      day's items resolve `completed` by looking up
      `(assignment_id, thatDayOfWeek)` — the rendered day, not the possibly-
      null stored `day_of_week` — defaulting to `false` when no row exists.
- [x] 7.3 Thread `id` and `completed` through `lib/calendar-schedule.ts`'s
      `DaySchedule`/`PersonGroup` item types and `getPersonGroupsForDay`.
- [x] 7.4 Add `toggleAssignmentCompletionAction` in `app/calendario/actions.ts`
      (no password check) calling `toggleAssignmentCompletion` and
      revalidating `/calendario`.
- [x] 7.5 Apply the `vercel-react-best-practices` skill before creating
      `components/task-completion-checkbox.tsx` and editing
      `components/person-task-group.tsx`.
- [x] 7.6 Create `components/task-completion-checkbox.tsx` (a `Checkbox`
      bound to `toggleAssignmentCompletionAction`, optimistic via
      `useOptimistic` or `useActionState` per the existing patterns in this
      codebase) and render it for every task item in
      `components/person-task-group.tsx`, passing the day it's rendered
      under.

## 8. Tests

- [x] 8.1 Update `lib/algorithm/assign.test.ts` fixtures: `PeriodTaskSetting`
      now carries `fixedMemberIds: string[]`.
- [x] 8.2 Add a test: a fixed task with 2+ enabled members is assigned to
      whichever currently holds the fewest tasks among them.
- [x] 8.3 Add a test: a fixed task with tied enabled members breaks the tie
      uniformly at random across seeds (same style as the existing variable-
      lottery tie-break test).
- [x] 8.4 Confirm the existing "never reassigns a fixed task" and "a
      member's fixed-task load reduces their variable share" tests still
      pass unmodified in behavior (only fixture shape changes).

## 9. Docs & verification

- [x] 9.1 Update the "Tareas fijas" bullet in `CLAUDE.md` to describe
      multiple enabled members and least-loaded selection among them,
      instead of a single fixed person.
- [x] 9.2 After implementing, verify against real Supabase data with an
      ad-hoc Node script (bypassing `server-only`, reverted after): confirm
      the migration backfilled correctly, a fixed task configured with 2
      real members actually alternates by load across periods, the day-
      override control works end-to-end against real rows, completion
      toggles persist independently per day for a real daily task, and the
      password gate actually blocks (wrong/missing password) and allows
      (correct password) all four gated actions — reassign member, reassign
      day, confirm-and-assign, reroll.
- [x] 9.3 Run `grep -rl "SUPABASE_SERVICE_ROLE_KEY" .next/static/chunks/`
      after a build to confirm no server-only secret leaked into the client
      bundle, per this project's established practice.
