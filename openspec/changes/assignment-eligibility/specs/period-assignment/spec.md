## MODIFIED Requirements

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
