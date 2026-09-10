# week-assignment Specification

## Purpose
Defines how the current week's task assignments are generated and changed:
the manually-triggered sorteo that fills the `assignments` table, the
password gate on outcome-changing actions, and the two ways a member can
change a specific assignment afterward (direct reassignment, and the
duel/swap mini-game).

## Requirements

### Requirement: Trigger the Weekly Sorteo Manually
The system SHALL let a user replace the entire current week's assignments
by pressing "Repartir nuestra semana" on the "Ajustes" tab. This action
SHALL require the shared security password (`SECURITY_PASSWORD`), verified
server-side, and SHALL be rejected without changing any data if the
password is wrong or missing. There is no automatic or scheduled trigger.

#### Scenario: Running the sorteo with the correct password
- **WHEN** a user presses "Repartir nuestra semana" and confirms the correct
  `SECURITY_PASSWORD`
- **THEN** the system SHALL delete every row in `assignments` and insert a
  freshly generated set for all active tasks

#### Scenario: Wrong or missing password blocks the sorteo
- **WHEN** a user submits the action with an incorrect or empty password
- **THEN** the system SHALL NOT modify `assignments`
- **THEN** the system SHALL show an inline error

### Requirement: Generate the Schedule Deterministically
Given the same members, active tasks (with their `eligibleMemberIds` and
`effort`), task conflicts, and seed, the system SHALL always produce the
same set of assignments (`lib/algorithm/schedule.ts`). For each day of the
week (Monday=0..Sunday=6) and each active task that occurs on that day —
every day for a `diario` task, its configured `days` otherwise — the system
SHALL assign exactly one member, chosen among that task's eligible members
who do not already hold, on that same day, a task the system flags as
conflicting with it (`task_conflicts`). Among the remaining eligible
members, the system SHALL pick uniformly at random (via the seeded RNG)
among whichever hold the strictly lowest running load so far in this same
run, where each task's contribution to the winner's load equals its
`effort` weight (`ligera`=1, `media`=2, `alta`=3). If no eligible member
remains for a (task, day) after excluding same-day conflicts, the system
SHALL record that assignment with a null member instead of leaving it out
of the result.

#### Scenario: Same seed reproduces the same result
- **WHEN** the algorithm runs twice with the same members, active tasks,
  conflicts, and seed
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

### Requirement: Reset the Week's Completion Status
The system SHALL let a user reset every assignment's `status` back to
`pending` (or `sin-responsable` for assignments with no member) without
changing who is responsible for what. This action SHALL require the shared
security password, verified server-side.

#### Scenario: Resetting with the correct password
- **WHEN** a user presses "Reiniciar semana" and confirms the correct
  password
- **THEN** every `assignments` row SHALL have its `status` reset to
  `pending` (or `sin-responsable` if its `member_id` is null)
- **THEN** no row's `task_id`, `member_id`, or `day_of_week` SHALL change

#### Scenario: Wrong or missing password blocks the reset
- **WHEN** a user submits the reset with an incorrect or empty password
- **THEN** the system SHALL NOT change any assignment's status

### Requirement: Manually Reassign an Assignment's Member
The system SHALL let a user change the responsible member of a single
assignment directly from its task detail sheet (opened from "Inicio" or
"Semana"), choosing among the members eligible for that task
(`task_eligible_members`). This action SHALL require the shared security
password, verified server-side, and SHALL leave the assignment unchanged if
the password is wrong or missing.

#### Scenario: Reassigning to an eligible member with the correct password
- **WHEN** a user picks a different eligible member for an assignment and
  confirms the correct password
- **THEN** the system SHALL update that assignment's `member_id` and set
  its `status` to `pending`

#### Scenario: Wrong or missing password blocks the reassignment
- **WHEN** a user submits the reassignment with an incorrect or empty
  password
- **THEN** the system SHALL NOT change that assignment's `member_id`
- **THEN** the system SHALL show an inline error

#### Scenario: Only eligible members are offered
- **WHEN** a user opens the reassignment control for an assignment
- **THEN** the system SHALL only offer members listed in that task's
  `task_eligible_members`, excluding the current member

### Requirement: Resolve a Duel by Swapping Two Assignments' Members
The system SHALL let the member currently holding an assignment ("the
requester") propose swapping it for another assignment held by someone
else, restricted to assignments on the same day and with the same `effort`
level as the requester's own task, and for which the requester is
themselves eligible. The swap SHALL be resolved client-side via a
rock-paper-scissors mini-game shared on one device; if the requester wins,
the system SHALL swap the `member_id` of the two assignments. This action
SHALL NOT require the shared security password.

#### Scenario: Valid duel candidates
- **WHEN** a user opens the duel flow for their own assignment
- **THEN** the system SHALL only offer other members' assignments that
  share the same `day_of_week`, share the same task `effort`, are not
  `completed`, and belong to a task the requester is eligible for

#### Scenario: Requester wins the duel
- **WHEN** the rock-paper-scissors result favors the requester
- **THEN** the system SHALL swap the `member_id` of the requester's
  assignment and the challenged assignment, leaving both `status` values
  and `day_of_week` values unchanged

#### Scenario: Requester loses or ties and does not rematch
- **WHEN** the requester loses the duel, or ties and chooses not to
  rematch
- **THEN** the system SHALL NOT change either assignment's `member_id`

#### Scenario: Resolving a duel requires no password
- **WHEN** a duel resolves in the requester's favor
- **THEN** the system SHALL apply the swap without prompting for
  `SECURITY_PASSWORD`
