# period-assignment Specification

## Purpose
TBD - created by syncing change period-assignment. Update Purpose after archive.

## Requirements

### Requirement: Define a Period
The system SHALL let a user start a new assignment by choosing a Monday as
the period's start date; the end date SHALL always be computed as that
Monday plus six days (the following Sunday) and SHALL NOT be independently
editable.

#### Scenario: Choosing a valid Monday
- **WHEN** a user picks a Monday as the start date and continues
- **THEN** the system SHALL create a `periods` row with that Monday as
  `start_date`, the following Sunday as `end_date`, and status `draft`

#### Scenario: Choosing a non-Monday date
- **WHEN** a user picks a start date that is not a Monday
- **THEN** the system SHALL reject the submission and show an inline error
  asking for a Monday

### Requirement: Review and Edit Fixed/Variable Tasks Before Assigning
Once a period exists, the system SHALL show every task with its fixed/
variable status and (if fixed) responsible member, pre-filled from each
task's default (`default_is_fixed`, `default_fixed_member_id`), and SHALL
let the user change either for this period only before running the sorteo.

#### Scenario: Defaults are pre-filled
- **WHEN** a user reaches the review step for a newly created period
- **THEN** the system SHALL show each task's fixed/variable state and fixed
  member matching that task's current default values

#### Scenario: Editing a task's fixed status for this period only
- **WHEN** a user changes a task from fixed to variable (or vice versa, and
  picks a member if now fixed) during review and confirms
- **THEN** the system SHALL persist that choice to `period_task_settings`
  for this period without changing the task's own default

#### Scenario: Marking a task fixed without a member
- **WHEN** a user marks a task as fixed but does not choose a responsible
  member
- **THEN** the system SHALL reject the submission and ask for a member

### Requirement: Run the Weighted Assignment Algorithm
Once fixed/variable settings are confirmed, the system SHALL assign every
variable task to exactly one member for the whole period using a lottery
weighted by each member's age tier (child under 12, teen 12–17, adult 18+)
and by each member's accumulated task weight from previously assigned
periods (excluding the period being assigned), such that lower accumulated
weight increases the chance of being picked. A task with a configured
minimum age SHALL only be eligible for members at or above that age; if no
member meets it, the system SHALL assign the task to the oldest household
member instead of leaving it unassigned. After the weighted lottery, the
system SHALL ensure every member has at least one variable-task assignment
by transferring one eligible task from whichever member currently holds
the most accumulated weight, for any member left with none. Fixed tasks
SHALL be assigned directly to their configured member and SHALL NOT enter
the lottery or count toward accumulated weight. Tasks that are not daily
(`is_daily = false`), whether fixed or variable, SHALL also receive a
specific day (Monday–Sunday) as part of this same run. The algorithm SHALL
be deterministic for a given stored seed.

#### Scenario: Fixed tasks bypass the lottery
- **WHEN** the assignment runs for a period
- **THEN** every task marked fixed in that period's settings SHALL be
  assigned to its configured member without going through the weighted
  lottery

#### Scenario: Variable tasks are weighted by age and accumulated load
- **WHEN** the assignment runs and a household has both adult and minor
  members
- **THEN** members with a lower age tier SHALL have a proportionally lower
  chance of being picked for a given variable task than adult members with
  the same accumulated load

#### Scenario: A task's minimum age excludes younger members
- **WHEN** the assignment runs and a variable task has a configured minimum
  age
- **THEN** the system SHALL NOT assign that task to any member below that
  minimum age

#### Scenario: No member meets a task's minimum age
- **WHEN** the assignment runs and no household member meets a task's
  configured minimum age
- **THEN** the system SHALL assign that task to the oldest household
  member rather than leave it unassigned

#### Scenario: A member with no variable tasks after the lottery gets one
- **WHEN** the weighted lottery finishes and a member has zero variable-
  task assignments, and at least one variable task exists that this member
  is eligible for
- **THEN** the system SHALL transfer one such task from the member
  currently holding the most accumulated weight to the member with none

#### Scenario: Once-per-period tasks get a day
- **WHEN** the assignment runs and a task has `is_daily = false`
- **THEN** the system SHALL assign that task a day of the week (0–6) in
  addition to a responsible member

#### Scenario: Same seed reproduces the same result
- **WHEN** the algorithm runs twice with the same members, tasks, period
  task settings, historical load, and seed
- **THEN** the resulting assignments SHALL be identical both times

### Requirement: Reroll a Period's Assignment
Once a period has been assigned, the system SHALL let a user re-run the
weighted lottery for that same period using a newly generated seed, without
requiring the period or its fixed/variable settings to be redefined.

#### Scenario: Rerolling replaces the previous result
- **WHEN** a user rerolls an already-assigned period
- **THEN** the system SHALL generate a new seed, discard that period's
  previous `assignments` rows, and persist a new set of assignments
- **THEN** the period's fixed/variable settings (`period_task_settings`)
  SHALL remain unchanged
