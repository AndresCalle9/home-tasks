## MODIFIED Requirements

### Requirement: Assign Tasks Button Opens the Assignment Flow
The system SHALL display an "Asignar tareas" button on the "Calendario" tab
that navigates to the period-assignment flow. If the current period is
already `assigned`, the system SHALL also show a "Volver a sortear" button
that rerolls that period's assignment without leaving the "Calendario" tab.
Rerolling SHALL require the shared security password (`SECURITY_PASSWORD`),
entered in a confirmation step and verified server-side.

#### Scenario: No current period exists
- **WHEN** a user clicks "Asignar tareas" and no period is currently
  assigned
- **THEN** the system SHALL navigate to the period-assignment flow's define-
  period step

#### Scenario: A current period already exists
- **WHEN** a user clicks "Asignar tareas" and a period is currently assigned
- **THEN** the system SHALL navigate to the period-assignment flow to
  define a new period

#### Scenario: Rerolling from Calendario
- **WHEN** a user clicks "Volver a sortear" while a period is currently
  assigned and confirms the security password correctly
- **THEN** the system SHALL reroll that period's assignment and update the
  "Calendario" tab to reflect the new result without navigating away

#### Scenario: Wrong or missing password blocks rerolling from Calendario
- **WHEN** a user clicks "Volver a sortear" and enters an incorrect
  password, or submits without one, in the confirmation step
- **THEN** the system SHALL NOT reroll that period's assignment
- **THEN** the system SHALL show an inline error and the "Calendario" tab
  SHALL keep showing the previous assignment

### Requirement: Manually Reassign a Variable Task
The system SHALL let a user change, directly from the "Calendario" tab, the
responsible member of any variable task in the current period, without
re-running the lottery or affecting any other task's assignment. Only
household members eligible for that task (per its `min_age`, if any) SHALL
be selectable. Fixed tasks SHALL NOT be editable this way. If the task has
more than one day assigned, reassigning it SHALL update the member for all
of its days at once. This edit SHALL require the shared security password
(`SECURITY_PASSWORD`), entered in a confirmation dialog and verified
server-side; the system SHALL NOT apply the change if the password is wrong
or missing, and the responsible-member control SHALL keep showing the
previous member until a correct password is confirmed.

#### Scenario: Reassigning a variable task to an eligible member
- **WHEN** a user selects a different, eligible member for a variable
  task's responsible-member control and confirms the security password
  correctly
- **THEN** the system SHALL update that task's `assignments` row(s) for the
  current period to the newly selected member
- **THEN** the calendar SHALL show that task under the new member's group
  without a full page reload

#### Scenario: Wrong or missing password blocks the reassignment
- **WHEN** a user selects a different member for a variable task and enters
  an incorrect password, or submits without one, in the confirmation dialog
- **THEN** the system SHALL NOT change that task's responsible member
- **THEN** the system SHALL show an inline error and the control SHALL
  keep displaying the previous member

#### Scenario: Ineligible members are not selectable
- **WHEN** a user opens the responsible-member control for a task with a
  configured minimum age
- **THEN** the system SHALL only offer members at or above that age

#### Scenario: A multi-day task keeps one member across all its days
- **WHEN** a user reassigns a variable task that occurs on more than one
  day in the current period
- **THEN** the system SHALL update every day's assignment for that task to
  the same newly selected member

#### Scenario: Fixed tasks have no reassignment control
- **WHEN** a user views a fixed task on the "Calendario" tab
- **THEN** the system SHALL show its static fixed-member badge and SHALL
  NOT offer a control to change it

#### Scenario: Reassigning does not affect other tasks or trigger a reroll
- **WHEN** a user reassigns one variable task
- **THEN** every other task's assignment for the current period SHALL
  remain unchanged

## ADDED Requirements

### Requirement: Manually Override a Once-a-Week Task's Day
The system SHALL let a user change, directly from the "Calendario" tab,
which day of the week a task with `times_per_week = 1` falls on for the
current period, whether that task is fixed or variable. Tasks with
`times_per_week` greater than 1, and daily tasks, SHALL NOT offer this
control. A task that shares a non-null `day_group` with other tasks SHALL
NOT be editable this way, since changing its day alone would break the
group's shared-day guarantee. This edit SHALL require the shared security
password (`SECURITY_PASSWORD`), entered in a confirmation dialog and
verified server-side; the system SHALL NOT apply the change if the password
is wrong or missing.

#### Scenario: Changing a once-a-week task's day
- **WHEN** a user picks a different weekday for a task with
  `times_per_week = 1` and confirms the security password correctly
- **THEN** the system SHALL update that task's single `assignments` row for
  the current period to the newly selected day
- **THEN** the calendar SHALL show that task under the new day without a
  full page reload

#### Scenario: Wrong or missing password blocks the day change
- **WHEN** a user picks a different day for a once-a-week task and enters
  an incorrect password, or submits without one, in the confirmation dialog
- **THEN** the system SHALL NOT change that task's day
- **THEN** the system SHALL show an inline error and the task SHALL remain
  on its previous day

#### Scenario: Tasks with more than one day per week have no day control
- **WHEN** a user views a task with `times_per_week` greater than 1 on the
  "Calendario" tab
- **THEN** the system SHALL NOT offer a control to change its day

#### Scenario: A day-grouped task has no day control
- **WHEN** a user views a `times_per_week = 1` task that shares a non-null
  `day_group` with another task
- **THEN** the system SHALL NOT offer a control to change its day on the
  "Calendario" tab

### Requirement: Mark a Task's Daily Completion
The system SHALL let a user mark, directly from the "Calendario" tab,
whether a task was completed on a given day, independently of every other
day that same task appears on — including a daily task, whose completion
SHALL be tracked separately for each day of the week even though it shares
a single underlying assignment. This action SHALL NOT require the security
password and SHALL NOT be restricted to any particular member.

#### Scenario: Marking a task done for a specific day
- **WHEN** a user checks the completion checkbox for a task shown under a
  given day
- **THEN** the system SHALL persist that day's task as completed without
  affecting the completion state of that same task on any other day

#### Scenario: Unmarking a completed task
- **WHEN** a user unchecks a previously completed task's checkbox for a
  given day
- **THEN** the system SHALL persist that day's task as not completed

#### Scenario: A daily task's completion is tracked per day
- **WHEN** a user marks a daily task as completed under Monday
- **THEN** the same task shown under Tuesday through Sunday SHALL remain
  unaffected, each independently markable

#### Scenario: Completing a task requires no password
- **WHEN** a user toggles a task's completion checkbox
- **THEN** the system SHALL NOT prompt for the security password
