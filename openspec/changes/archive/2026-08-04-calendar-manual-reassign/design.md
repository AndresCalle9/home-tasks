## Context

`app/calendario/page.tsx` renders `CalendarAccordion` (client component),
which groups each day's `assignments` rows by responsible member via
`getPersonGroupsForDay` (`lib/calendar-schedule.ts`, pure/Supabase-free) and
renders each group with `PersonTaskGroup`. Reassignment today only happens
through `rerollAction` (regenerates everything) or editing a task's
default in Configuración (affects only future periods, not the current
one). This change adds a way to change a single variable task's member for
the *current* period only, in place.

**Supabase tables involved:** none change. `assignments.member_id` is
already a plain, unconstrained-beyond-FK mutable column — updating it for
an existing row (or rows) needs no schema change.

## Goals / Non-Goals

**Goals:**
- Change one variable task's responsible member for the current period,
  without affecting any other task or re-running the lottery.
- Never allow assigning to a member the lottery itself couldn't have
  picked (`min_age` still enforced).
- Keep a multi-day task's rows consistent (same member across all its
  days).

**Non-Goals:**
- Editing fixed tasks from the calendar — unchanged, out of scope.
- Any change to the lottery, rebalancing pass, or historical balance
  calculation.
- Bulk reassignment UI (swap two people's whole workload, etc.) — this is
  a single-task-at-a-time control.

## Decisions

### Data layer: update by (`period_id`, `task_id`), not by row id

```ts
// lib/data/assignments.ts
export async function reassignTask(
  periodId: string,
  taskId: string,
  memberId: string
): Promise<MutationResult> {
  const { error } = await supabase
    .from("assignments")
    .update({ member_id: memberId })
    .eq("period_id", periodId)
    .eq("task_id", taskId)
    .eq("is_fixed", false);
  if (error) return { error: mapDbError(error, "asignación") };
  return { ok: true };
}
```

Matching on `(period_id, task_id, is_fixed = false)` rather than a specific
row id updates every day-row a non-daily task has in one statement, and the
`is_fixed = false` guard means this function can never touch a fixed row
even if a caller passed a fixed task's id by mistake — defense in depth on
top of the UI simply not rendering a control for fixed tasks.

**Alternative considered — take a list of assignment row ids from the
client and update each one.** Rejected: the client would need to know
every day-row's id for a task, and nothing about "these N ids are the same
task" — matching by `(period_id, task_id)` server-side is simpler and is
the invariant we actually want to enforce (one member per task), not an
incidental detail of how many day-rows happen to exist.

### Server action: reuse `listTasks()`/`listMembers()` for validation

```ts
// app/calendario/actions.ts
export async function reassignTaskAction(_prevState, formData) {
  const periodId = String(formData.get("periodId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  if (!periodId || !taskId || !memberId) return { error: "Faltan datos." };

  const [tasks, members] = await Promise.all([listTasks(), listMembers()]);
  const task = tasks.find((t) => t.id === taskId);
  const member = members.find((m) => m.id === memberId);
  if (!task || !member) return { error: "Tarea o integrante no válido." };
  if (task.minAge != null && member.age < task.minAge) {
    return { error: `Esta tarea requiere ${task.minAge}+ años.` };
  }

  const result = await reassignTask(periodId, taskId, memberId);
  if ("error" in result) return result;
  revalidatePath("/calendario");
  return {};
}
```

**Alternative considered — a lighter targeted query** (fetch just the one
task and one member by id instead of the full lists). Rejected for this
household's scale: `listTasks()`/`listMembers()` already exist, are cheap
(a handful of rows), and are already called elsewhere on every
`/calendario` render — reusing them keeps this action's code identical in
shape to every other action in this file (`rerollAction`,
`confirmAssignmentAction`) rather than introducing a new one-off query
pattern for a marginal cost saving that doesn't matter at this scale.

The eligibility check mirrors `eligibleMembers`'s core condition in
`lib/algorithm/assign.ts` (`task.minAge == null || member.age >= task.minAge`)
without importing from the algorithm module — that module has no Supabase
access and should stay that way; duplicating one boolean condition across a
UI validation and a pure algorithm function is simpler than adding a
cross-module dependency for a single comparison.

### UI: thread `periodId` + `members` through, new `TaskMemberSelect`

`CalendarAccordion` gains a `periodId: string` prop (from `page.tsx`, which
already has `period.id`). `PersonTaskGroup` gains a `members: Member[]` and
`periodId: string` prop, passed through from `CalendarAccordion`.

For each item where `!isFixed`, `PersonTaskGroup` renders:

```tsx
<TaskMemberSelect
  periodId={periodId}
  task={task}
  currentMemberId={group.member.id}
  eligibleMembers={members.filter(
    (m) => task.minAge == null || m.age >= task.minAge
  )}
/>
```

`TaskMemberSelect` (new, `components/task-member-select.tsx`, client
component) renders a `Select` whose `onValueChange` immediately builds a
`FormData` and calls the `useActionState`-returned dispatch function for
`reassignTaskAction` — no separate "save" button, matching the instant-
persist feel of `RerollButton`/the `Switch` toggles elsewhere in this app.
Follows the project's established `<SelectValue>` pattern (`items` prop
**and** an explicit `children`-as-function) — the `items` prop alone was
previously found insufficient with an uncontrolled `defaultValue` (see
`components/task-form-dialog.tsx`).

**Alternative considered — a native `<select>` with `onChange` calling a
plain async function (no `useActionState`).** Rejected: this app
consistently uses `useActionState` for every server-action-backed control
(dialogs, switches, the reroll button) so errors have a uniform place to
surface (`state.error`) and pending state is handled the same way
everywhere; a one-off native select would be inconsistent for no benefit.

## Risks / Trade-offs

- **[Risk] A user reassigns a task, then rerolls — the manual edit is
  lost.** → Expected and acceptable: reroll's whole purpose is "start over
  randomly"; it already discards and replaces every row. Not a regression
  this change introduces.
- **[Risk] Race between two people editing the same task at once.** → Out
  of scope for this single-household MVP (no concurrent-edit protection
  exists anywhere else in this app either, e.g. `runAssignment`'s
  delete-then-insert has the same non-atomicity risk, already tracked in
  `BACKLOG.md`).

No Supabase credentials are touched by this change — confirmed: the new
data function and action live in the existing server-only
`lib/data/assignments.ts` / `"use server"` `app/calendario/actions.ts`
modules; `TaskMemberSelect` only imports types and calls the server action,
never touching Supabase directly from the client.

## Migration Plan

No data migration — pure application-layer change. Deploy the code; the
new control appears on the next `/calendario` render. Rollback: revert the
commit.
