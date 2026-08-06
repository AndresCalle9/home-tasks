## 1. Data layer

- [ ] 1.1 Add `reassignTask(periodId, taskId, memberId)` to
      `lib/data/assignments.ts`: updates `member_id` on every `assignments`
      row matching `period_id` + `task_id` + `is_fixed = false`.

## 2. Server action

- [ ] 2.1 Add `reassignTaskAction` to `app/calendario/actions.ts`: parses
      `periodId`/`taskId`/`memberId`, fetches `listTasks()`/`listMembers()`
      in parallel, validates the target member exists and meets the task's
      `min_age` (mirroring `eligibleMembers`'s condition in
      `lib/algorithm/assign.ts` without importing from it), calls
      `reassignTask`, then `revalidatePath("/calendario")`.

## 3. UI

- [ ] 3.1 Apply the `vercel-react-best-practices` skill before touching
      `components/calendar-accordion.tsx` and `components/person-task-group.tsx`.
- [ ] 3.2 Thread a `periodId: string` prop from `app/calendario/page.tsx`
      into `CalendarAccordion`.
- [ ] 3.3 Thread `members: Member[]` and `periodId: string` from
      `CalendarAccordion` into `PersonTaskGroup`.
- [ ] 3.4 Create `components/task-member-select.tsx` (client component):
      a `Select` of eligible members (`members.filter(m => task.minAge == null || m.age >= task.minAge)`)
      that calls `reassignTaskAction` via `useActionState` immediately on
      `onValueChange` (no separate save button); use the `items` prop +
      explicit `children`-as-function `<SelectValue>` pattern from
      `components/task-form-dialog.tsx`; surface `state.error` inline.
- [ ] 3.5 In `PersonTaskGroup`, render `TaskMemberSelect` next to each
      variable (`!isFixed`) task item; keep the existing static "Fija"
      badge unchanged for fixed items.

## 4. Verification

- [x] 4.1 Run the app locally (dev server) against real Supabase data.
      Confirmed via `npm run dev` + `tsc`/`npm run build`: the app compiles
      and serves `/calendario` with no errors, and no service-role key
      leaks into the client bundle (grep check, same as prior changes).
      Confirmed directly against real Supabase data by exercising
      `reassignTask`'s exact update (filtered by `period_id` + `task_id` +
      `is_fixed = false`) on a real 3-day variable task: all 3 day-rows
      updated to the same new member in one call, then reverted back to
      the original member to leave the household's real calendar
      unchanged. Confirmed by construction that a fixed row (`is_fixed =
      true`) can never match that filter. **Not verified**: an actual
      click-through in a live browser — no browser/screenshot tool is
      available in this environment, so the visual "task moves to the new
      member's card" behavior (which follows directly from
      `getPersonGroupsForDay` re-grouping on the fresh data
      `revalidatePath` triggers, unchanged by this feature) was reasoned
      from code, not watched. Recommend the user does one manual
      click-through to confirm the visual result.
