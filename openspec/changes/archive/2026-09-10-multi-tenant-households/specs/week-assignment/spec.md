## MODIFIED Requirements

### Requirement: Trigger the Weekly Sorteo Manually
The system SHALL let a signed-in household replace their own current
week's assignments by pressing "Repartir nuestra semana" on the "Ajustes"
tab. This action SHALL require that household's own action password
(stored hashed in `household.action_password_hash`, verified server-side),
and SHALL be rejected without changing any data if the password is wrong
or missing. There is no automatic or scheduled trigger.

#### Scenario: Running the sorteo with the correct password
- **WHEN** a signed-in household presses "Repartir nuestra semana" and
  confirms their own correct action password
- **THEN** the system SHALL delete every row in `assignments` belonging to
  that household and insert a freshly generated set for that household's
  active tasks only

#### Scenario: Wrong or missing password blocks the sorteo
- **WHEN** a signed-in household submits the action with an incorrect or
  empty action password
- **THEN** the system SHALL NOT modify that household's `assignments`
- **THEN** the system SHALL show an inline error

#### Scenario: A household's action password never unlocks another household's sorteo
- **WHEN** a signed-in household submits its own correct action password
- **THEN** the system SHALL only ever affect its own household's
  `assignments`, never another household's, regardless of the password
  supplied

### Requirement: Generate the Schedule Deterministically
Given the same members, active tasks (with their `eligibleMemberIds` and
`effort`), task conflicts, and seed — all belonging to one household — the
system SHALL always produce the same set of assignments
(`lib/algorithm/schedule.ts`). For each day of the week (Monday=0..Sunday=6)
and each of that household's active tasks that occurs on that day — every
day for a `diario` task, its configured `days` otherwise — the system
SHALL assign exactly one member from that same household, chosen among
that task's eligible members who do not already hold, on that same day, a
task the system flags as conflicting with it (`task_conflicts`, scoped to
the same household). Among the remaining eligible members, the system
SHALL pick uniformly at random (via the seeded RNG) among whichever hold
the strictly lowest running load so far in this same run, where each
task's contribution to the winner's load equals its `effort` weight
(`ligera`=1, `media`=2, `alta`=3). If no eligible member remains for a
(task, day) after excluding same-day conflicts, the system SHALL record
that assignment with a null member instead of leaving it out of the
result. The algorithm itself has no notion of household — it is the
caller's responsibility to source its members/tasks/conflicts inputs from
exactly one household.

#### Scenario: Same seed reproduces the same result
- **WHEN** the algorithm runs twice with the same household's members,
  active tasks, conflicts, and seed
- **THEN** the resulting assignments SHALL be identical both times

#### Scenario: A task's day is chosen among its configured days only
- **WHEN** the algorithm runs for a task with `freq = "dias"` or `"semanal"`
- **THEN** the system SHALL only create assignment rows for that task on
  the days listed in its `days` array (or every day, for `freq = "diario"`)

#### Scenario: The least-loaded eligible member wins
- **WHEN** the algorithm assigns a (task, day) and more than one eligible
  member is tied for the lowest running load
- **THEN** the system SHALL pick among exactly those tied members uniformly
  at random via the seeded RNG

#### Scenario: Conflicting tasks never land on the same person the same day
- **WHEN** two tasks are linked via `task_conflicts` and both occur on the
  same day
- **THEN** the system SHALL NOT assign both to the same member that day

#### Scenario: No eligible member available for a (task, day)
- **WHEN** every member eligible for a task already holds a conflicting
  task that same day (or the task has no eligible members)
- **THEN** the system SHALL record that assignment with `member_id = null`
  and status `sin-responsable`, instead of skipping it

#### Scenario: A task keeps one member across every day it occurs
- **WHEN** a task occurs on more than one day within the same sorteo run
- **THEN** each day's assignment for that task is drawn independently and
  MAY end up with different members — the algorithm does not force a
  single member across a task's days within one run

#### Scenario: A sorteo run never draws a member or task from another household
- **WHEN** the algorithm runs for one household
- **THEN** every member and task considered SHALL belong to that same
  household — the caller SHALL NOT pass in another household's rows, and
  the resulting `assignments` rows SHALL all carry that household's
  `household_id`

### Requirement: Reset the Week's Completion Status
The system SHALL let a signed-in household reset every one of their own
assignments' `status` back to `pending` (or `sin-responsable` for
assignments with no member) without changing who is responsible for what.
This action SHALL require that household's own action password, verified
server-side.

#### Scenario: Resetting with the correct password
- **WHEN** a signed-in household presses "Reiniciar semana" and confirms
  their own correct action password
- **THEN** every `assignments` row belonging to that household SHALL have
  its `status` reset to `pending` (or `sin-responsable` if its `member_id`
  is null)
- **THEN** no row's `task_id`, `member_id`, or `day_of_week` SHALL change,
  and no other household's rows SHALL be affected

#### Scenario: Wrong or missing password blocks the reset
- **WHEN** a signed-in household submits the reset with an incorrect or
  empty action password
- **THEN** the system SHALL NOT change any assignment's status

### Requirement: Manually Reassign an Assignment's Member
The system SHALL let a signed-in household change the responsible member
of a single assignment belonging to their own household, directly from its
task detail sheet (opened from "Inicio" or "Semana"), choosing among the
members eligible for that task within the same household
(`task_eligible_members`). This action SHALL require that household's own
action password, verified server-side, and SHALL leave the assignment
unchanged if the password is wrong or missing.

#### Scenario: Reassigning to an eligible member with the correct password
- **WHEN** a signed-in household picks a different eligible member (from
  their own household) for one of their own assignments and confirms their
  own correct action password
- **THEN** the system SHALL update that assignment's `member_id` and set
  its `status` to `pending`

#### Scenario: Wrong or missing password blocks the reassignment
- **WHEN** a signed-in household submits the reassignment with an
  incorrect or empty action password
- **THEN** the system SHALL NOT change that assignment's `member_id`
- **THEN** the system SHALL show an inline error

#### Scenario: Only eligible members are offered
- **WHEN** a signed-in household opens the reassignment control for one of
  their own assignments
- **THEN** the system SHALL only offer members belonging to that same
  household and listed in that task's `task_eligible_members`, excluding
  the current member
