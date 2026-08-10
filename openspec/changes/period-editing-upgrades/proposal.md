## Why

Real usage of the current period-assignment and calendar flows surfaced four
gaps: (1) a "fixed" task can only ever belong to exactly one person, even
when several household members could reasonably cover it, which removes any
balancing flexibility for that task; (2) once-a-week tasks land on a random
day with no way to pin them to a specific weekday that actually fits the
household's routine; (3) there's no way to track which assigned tasks were
actually done day by day; and (4) nothing protects the actions that change a
period's outcome — running the sorteo for the first time, rerolling it, or
manually reassigning a task's member or day — anyone with access to the
calendar can trigger them, which invites accidental edits. All four were
raised together as one work session and are addressed together here.

## What Changes

- Fixed tasks (both the task-level default and the per-period setting) can
  now have **one or more** enabled members instead of exactly one. At sorteo
  time, the winner among a fixed task's enabled members is chosen with the
  same least-loaded selection already used for variable tasks (ties broken
  uniformly at random); the result still behaves like today's fixed tasks
  afterward (excluded from rebalancing and from cross-period historical
  balance, but seeds this period's running load).
- Once-a-week tasks (`times_per_week = 1`) get an inline edit control on the
  Calendario page to manually pick which weekday they fall on, alongside the
  existing responsible-member control. Tasks with more than one day per week
  are out of scope for this control (picking "the day" would be ambiguous).
- Each assigned task on the Calendario page gets a completion checkbox,
  persisted per task/member/day. No restriction on who can check it, and it
  does not require the security password below.
- **BREAKING**: Every action that changes a period's outcome — running the
  initial sorteo, rerolling an already-assigned period, reassigning a task's
  responsible member, or changing its execution day — now requires entering
  a shared `SECURITY_PASSWORD` (a new server-only env var) in a confirmation
  step before the action runs; wrong or missing password leaves the previous
  state unchanged. This does not affect the completion checkboxes or any
  Configuración CRUD.

## Capabilities

### New Capabilities

(none — every change here modifies requirements of existing capabilities)

### Modified Capabilities

- `period-assignment`: fixed tasks can be configured with multiple enabled
  members; the sorteo selects the winner among them via least-loaded
  selection instead of trusting a single fixed member.
- `task-config-view`: task defaults and per-period settings for a fixed task
  now capture a set of enabled members instead of a single one.
- `calendar-view`: adds a per-task weekday-override control for once-a-week
  tasks, adds per-task completion checkboxes, and gates the existing
  member-reassignment control, the new weekday-override control, and the
  existing "Volver a sortear" reroll button behind a shared security
  password.

## Impact

- **Schema**: `tasks.default_fixed_member_id` and
  `period_task_settings.fixed_member_id` (single FK columns) are replaced by
  a multi-member representation; a new `assignment_completions` table tracks
  per-day completion without touching `assignments`' row-counting semantics
  (see design.md for why). Ships as a hand-run SQL migration + backfill
  script, not applied automatically.
- **Algorithm**: `lib/algorithm/assign.ts`'s fixed-task loop changes from
  "assign the configured member" to "least-loaded pick among the configured
  members" — no change to the variable-task lottery or the rebalancing pass.
- **CRUD**: `components/task-form-dialog.tsx` and
  `components/period-review-table.tsx` switch their fixed-member control
  from a single `Select` to a multi-select.
- **Calendar**: `components/person-task-group.tsx` gains a weekday-select
  control (once-a-week tasks only) and a completion checkbox. The existing
  reassignment control and the new weekday control get wrapped with a
  password-confirmation dialog; `components/period-review-table.tsx`'s
  "Confirmar y asignar" submit and `components/reroll-button.tsx`'s "Volver
  a sortear" submit each gain a password confirmation step too. All four
  are backed by the same new server-side check against `SECURITY_PASSWORD`.
- **Env**: adds `SECURITY_PASSWORD` to `.env.example` (server-side only, not
  `NEXT_PUBLIC_`, never logged).
