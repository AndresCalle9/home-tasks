## Context

Four independent gaps in the current period-assignment/calendar flows, raised
together by the household:

1. `tasks.default_fixed_member_id` / `period_task_settings.fixed_member_id`
   are single FK columns — a fixed task can only ever go to exactly one
   person.
2. Once-a-week tasks (`times_per_week = 1`) get a random weekday from
   `pickDistinctDays`, with no way to pin them to a day that fits the
   household's routine.
3. `assignments` has no notion of "done" — the calendar is a plan, not a
   tracker.
4. The two edits that change an already-assigned period's outcome
   (`reassignTaskAction` for the responsible member; a new action for the
   day) have no protection today — anyone with the page open can change them.

All four ship together in this change per explicit user decision, even
though they touch different layers (schema, algorithm, CRUD, calendar UI).

## Goals / Non-Goals

**Goals:**
- Let a fixed task be configured with 1+ enabled members; sorteo picks the
  least-loaded one among them, same tie-break rule as variable tasks.
- Let a once-a-week task's day be manually overridden from the calendar.
- Track per-day completion for every assigned task, daily or not, without
  touching the balance/historical-count math the algorithm depends on.
- Gate every action that changes a period's outcome — running the initial
  sorteo, rerolling it, the responsible-member edit, and the new day edit —
  behind a shared password, verified server-side only.

**Non-Goals:**
- No change to the variable-task lottery, the busiest/neediest rebalancing
  pass, or `getHistoricalTaskCount`'s semantics (rows counted = tasks held).
- No day-override control for tasks with `times_per_week > 1` (ambiguous
  which of N days to change) — out of scope, same reasoning the household
  already accepted when scoping `puntual-task-frequency`.
- No password gate on the completion checkboxes or on any Configuración CRUD
  — only the two calendar edits named above.
- No real user accounts/roles — the password is a single shared secret, not
  per-member auth (unchanged "no login" scope for the whole app).

## Decisions

### 1. Multi-member fixed tasks: join tables, not array columns

Replace the two single-FK columns with join tables:

```sql
create table task_default_fixed_members (
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references members(id),
  primary key (task_id, member_id)
);

create table period_task_setting_fixed_members (
  period_task_setting_id uuid not null references period_task_settings(id) on delete cascade,
  member_id uuid not null references members(id),
  primary key (period_task_setting_id, member_id)
);
```

**Alternative considered**: a `uuid[]` column on each table
(`default_fixed_member_ids`, `fixed_member_ids`). Rejected because Postgres
can't enforce a foreign key on individual array elements — the existing
"can't delete a member who's a task's fixed responsible person" behavior
would need to be reimplemented by hand in application code with no DB
backstop, and Supabase's typed client makes array-of-FK joins awkward to
select alongside the parent row. A join table gets FK integrity for free and
matches how `period_task_settings` itself already relates to `periods`/
`tasks`.

**Trade-off accepted**: the current DB-level check constraint
(`fixed_task_has_member` / `fixed_setting_has_member`, "a fixed task/setting
must have a member") can't be expressed as a table check constraint against
a join table's row count. This becomes an app-level invariant only, enforced
in `parseTaskInput` (task-config-view) and `confirmAssignmentAction`
(period-assignment) — consistent with how every other cross-row validation
in this app (duplicate names, day-group frequency consistency) is already
app-level only, not DB-level.

**Deletion check**: "member is fixed-responsible for some task" now means
"member appears in `task_default_fixed_members` OR
`period_task_setting_fixed_members`" — `deleteMember` gets both checks
instead of one.

**No new eligibility filtering**: the fixed-member multi-select in both
`task-form-dialog.tsx` and `period-review-table.tsx` keeps offering the full
member list, unfiltered by the task's `min_age` — this matches today's
single-select behavior exactly (it does not filter by `min_age` either), so
nothing new is introduced here.

### 2. Fixed-task selection: least-loaded among configured members

`PeriodTaskSetting.fixedMemberIds: string[]` replaces `fixedMemberId: string
| null`. The fixed loop in `assignPeriod` changes from "assign the one
configured member" to the same least-loaded selection the variable loop
already uses, restricted to the configured pool:

```
for task in fixedTasks:
  candidates = configuredMembers(task)          // no min_age filter — same as today
  minCount = min(runningCount[m] for m in candidates)
  leastLoaded = [m in candidates if runningCount[m] == minCount]
  winner = pickUniform(rng, leastLoaded)
  runningCount[winner] += 1
  results.push({ taskId, memberId: winner, dayOfWeek: daysFor(task), isFixed: true })
```

Everything downstream is unchanged: the winner still never enters the
rebalancing pass (`variableResults` filter stays `!r.isFixed`), and
`getHistoricalTaskCount` still only counts `is_fixed = false` rows, so a
permanent fixed responsibility still doesn't affect future-period odds.

**Defensive fallback**: if a fixed task somehow has zero configured members
(should be impossible once the CRUD enforces at least one), fall back to
`eligibleMembers(members, task)` — the same "don't crash, degrade to the
full pool" pattern already used for `DEFAULT_TIMES_PER_WEEK`.

**Processing order** stays the array order of `tasks` (unchanged) — a fixed
task processed earlier in the loop sees a lower `runningCount` than one
processed later, exactly like today.

### 3. Once-a-week day override: reuse the reassignment pattern, for day instead of member

New action, symmetric to `reassignTask`/`reassignTaskAction`:

```ts
reassignTaskDay(periodId: string, taskId: string, dayOfWeek: number): MutationResult
```

Applies to **any** task with `times_per_week === 1`, fixed or variable —
the day is a "when", not a "who", so there's no reason to restrict it to
variable tasks the way the existing member-reassignment control is
restricted. Updates the single `assignments` row for
`(period_id, task_id)` (there's exactly one, since `times_per_week === 1`).
Tasks with `times_per_week > 1` or `is_daily = true` never render this
control — same one-day-only scope decided for this feature.

**Interaction with `day_group`**: a once-a-week task sharing a `day_group`
with other tasks already forces them to share the same day (per
`puntual-task-scheduling`). Overriding one member of that group's day would
silently desync the rest of the group. `reassignTaskDayAction` rejects the
edit with an inline error when the task's `day_group` is non-null, instead
of silently breaking the shared-day guarantee or cascading the change to
every task in the group (cascading was rejected — it would let one person's
edit change unrelated tasks' days without their own confirmation dialog).

### 4. Completion tracking: a separate table keyed by (assignment, day), not a column on `assignments`

```sql
create table assignment_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (assignment_id, day_of_week)
);
```

**Alternative considered**: add `completed boolean` directly to
`assignments`. Rejected because a daily task has exactly **one**
`assignments` row that applies to all 7 days (`day_of_week = null`) — a
single `completed` column on that row could only track one shared
completion state for the whole week, not "did we cook breakfast on Tuesday"
independently of Monday. Expanding daily tasks to 7 day-specific rows (like
non-daily tasks already have) was considered instead, but rejected: it would
multiply how many rows `getHistoricalTaskCount` counts for a daily task from
1 to 7, silently 7x-ing that task's weight in the cross-period balance
calculation relative to before — a regression to the exact "balance por
cantidad de tareas" correctness the household has repeatedly needed fixed
in this project. A separate table sidesteps this entirely: `assignments`
and its row-counting semantics (and therefore the balance algorithm) are
untouched.

**Lookup key is always the *rendered* day, not the stored one**: for a
non-daily task, the rendered day equals its stored `day_of_week`. For a
daily task (stored `day_of_week = null`), the calendar renders it once per
weekday (0-6) from `getPersonGroupsForDay`'s per-day loop — each of those 7
renders looks up `(assignment_id, thatWeekday)` independently, so "cooked
breakfast Monday" and "cooked breakfast Tuesday" are naturally separate
rows, no null-day special case needed anywhere in the completion logic.

**No restriction on who toggles it** and **no password required** — matches
the app's no-auth household model and the user's explicit scoping (only
member/day edits are gated).

### 5. Password gate: server-verified, per-edit confirmation dialog

`SECURITY_PASSWORD` (new, server-only env var, added to `.env.example`) is
checked in a small helper:

```ts
// lib/security/password.ts
export function verifySecurityPassword(submitted: string): boolean {
  const expected = process.env.SECURITY_PASSWORD;
  if (!expected) return false; // fail closed if unset — never silently allow
  return submitted === expected;
}
```

Four actions call this, all before touching Supabase, all returning an
inline error and performing no mutation on a mismatch (or unset env var):
the existing `reassignTaskAction`, the new `reassignTaskDayAction`, the
existing `confirmAssignmentAction` (the initial sorteo run — gating it here
covers `runAssignment` regardless of whether it's the first run or a
reroll's underlying call), and the existing `rerollAction`.

Two UI shapes need gating, so two small client components share the same
verified-server-action contract:

- **`PasswordGatedSelect`** wraps a `Select` (member-reassign, day-override)
  and owns its own confirmation dialog. It renders the `Select` as
  **controlled** (`value={currentValue}`, the prop from the server — not
  `defaultValue`), so an unconfirmed or cancelled change visually reverts on
  its own once the dialog closes, with no extra state to reset. On
  `onValueChange`, it stores the pending new value and opens a dialog asking
  for the password; confirming builds the `FormData` (including `password`)
  and calls the passed-in server action; cancelling just closes the dialog
  (the `Select` already shows `currentValue`, unchanged). Both
  `TaskMemberSelect` (existing, now rewritten on top of this) and the new
  `TaskDaySelect` use it, so the dialog/FormData/revert logic exists once.
- **`PasswordConfirmDialog`** wraps a plain submit button (confirm-and-
  assign, reroll), modeled on `components/delete-confirm-dialog.tsx`'s
  existing `AlertDialog`, but it has to support two shapes of the thing it
  gates:
  - `RerollButton`'s form is trivial (one hidden `periodId` field), so there
    the dialog works exactly like `DeleteConfirmDialog`: its own self-
    contained `<form>` with the hidden field plus a password `Input`,
    submitted directly.
  - `PeriodReviewTable` already wraps its *entire* multi-row task list in
    one `<form action={action}>` (every row contributes its own hidden
    `taskId`/`isFixed-<id>`/`fixedMemberId(s)-<id>` fields to that single
    form) — nesting a second `<form>` inside a dialog would orphan all of
    that from the password field. So for this case
    `PasswordConfirmDialog` takes a `getFormData: () => FormData` prop: the
    "Confirmar y asignar" button becomes `type="button"` (not `submit`),
    opens the dialog, and on confirm reads the surrounding form via a
    `ref` (`new FormData(formRef.current)`), appends `password`, and calls
    `formAction(...)` directly — the same manual-FormData-building pattern
    `components/task-member-select.tsx` already uses in this codebase,
    rather than relying on native form submission.

Both components hit the same failure mode the same way: wrong or missing
password → inline error from the action's returned state, no mutation, no
navigation.

**Alternative considered**: "unlock once per calendar visit" (enter the
password once, edit freely afterward). Rejected — explicitly decided against
by the user in favor of a per-edit prompt, trading a bit of convenience for
tighter protection against an accidental change days after someone typed the
password once.

## Risks / Trade-offs

- [Losing the DB-level "fixed task must have ≥1 member" guarantee] →
  Mitigated by keeping the check in both places that write these rows
  (task CRUD, period review confirm) — consistent with how this app already
  handles every other cross-row invariant.
- [`reassignTaskDayAction` rejecting day_group tasks outright may surprise a
  user who doesn't remember a task is grouped] → Mitigated by naming the
  group in the inline error, same pattern used for the day_group/
  `times_per_week` mismatch error in task-config-view.
- [`SECURITY_PASSWORD` unset in an environment (e.g. a fresh Vercel deploy
  before the env var is configured)] → Fails closed (every gated action is
  rejected) rather than failing open — safer default for a security control.
- [Gating the sorteo/reroll on top of the two edit controls means one wrong
  password entry now blocks four different actions, not two — a bit more
  friction] → Accepted: the whole point is these are exactly the actions
  that change a period's outcome; leaving any of them ungated would defeat
  the feature.
- [No credential ever reaches the client]: the password travels only in a
  server-action `FormData` POST already scoped to Next.js's own request/
  response cycle (same trust boundary as every other server action here);
  `SECURITY_PASSWORD` itself is read only inside the gated server actions,
  never logged, never sent to the client as a prop.

## Migration Plan

Ships as a hand-run SQL script (`supabase/migrations/period-editing-upgrades.sql`,
not auto-executed — the user runs it in the Supabase SQL editor, per this
project's established pattern):

1. Create `task_default_fixed_members`, `period_task_setting_fixed_members`,
   `assignment_completions`.
2. Backfill: copy every non-null `default_fixed_member_id` /
   `fixed_member_id` into the new join tables.
3. Drop `fixed_task_has_member` / `fixed_setting_has_member` check
   constraints and the two old columns.
4. Enable RLS (no policies) on the three new tables, matching every existing
   table.
5. Add `SECURITY_PASSWORD=` to `.env.example` with a comment (the user sets
   the real value in their own `.env` / Vercel project settings — no default
   shipped in code).

Rollback: re-add the dropped columns, backfill from the join tables (only
lossy if a task ended up with >1 fixed member in the meantime — acceptable
since rollback is only expected before this feature sees real multi-member
usage).

## Open Questions

None outstanding — the four forks that needed a decision (fixed-pool
selection rule, day-edit location, password UX, OpenSpec scoping) were
resolved with the user before this design was written.
