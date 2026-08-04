## MODIFIED Requirements

### Requirement: Run the Weighted Assignment Algorithm
Once fixed/variable settings are confirmed, the system SHALL assign every
variable task to exactly one member for the whole period using a lottery
balanced only by how many tasks each member currently holds (in this
period and in previously assigned periods): at the moment each variable
task is drawn, only members holding the strict minimum task count among
that task's eligible candidates SHALL be able to win it, with the winner
chosen uniformly at random (via the seeded RNG) among any tied candidates.
A task with a configured minimum age SHALL only be eligible for members at
or above that age; if no member meets it, the system SHALL assign the task
to the oldest household member instead of leaving it unassigned. Age SHALL
NOT otherwise influence the odds of being picked. Fixed tasks SHALL be
assigned directly to their configured member and SHALL NOT enter the
lottery or count toward any member's task count. Tasks that are not daily
(`is_daily = false`), whether fixed or variable, SHALL also receive a
specific day (Monday–Sunday) as part of this same run. After the lottery,
the system SHALL rebalance by repeatedly transferring one variable task
from whichever member currently holds the most tasks to whichever member
holds the fewest — provided the receiving member is eligible for that
task — until the difference between the busiest and least-busy member is
at most 1, or no further eligible transfer exists. The algorithm SHALL be
deterministic for a given stored seed.

#### Scenario: Fixed tasks bypass the lottery
- **WHEN** the assignment runs for a period
- **THEN** every task marked fixed in that period's settings SHALL be
  assigned to its configured member without going through the weighted
  lottery

#### Scenario: Variable tasks are balanced by task count, not age
- **WHEN** the assignment runs and a household has both adult and minor
  members, all eligible for a given task
- **THEN** only the members currently holding the fewest tasks among that
  task's eligible candidates SHALL be able to win it, and age SHALL NOT
  affect which of them is picked

#### Scenario: The busiest and least-busy member never drift far apart
- **WHEN** the assignment runs for a period with any number of variable
  tasks and members
- **THEN** the difference in variable-task count between any two members
  eligible for the same tasks SHALL never exceed 1 once the lottery
  finishes

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
- **WHEN** the lottery finishes and a member has zero variable-task
  assignments, and at least one variable task exists that this member is
  eligible for
- **THEN** the rebalancing pass SHALL transfer one such task from the
  member currently holding the most tasks to the member with none

#### Scenario: Exclusion-only tasks clustered together still rebalance
- **WHEN** several variable tasks that all exclude the same member (via
  `min_age`) are assigned consecutively, leaving that member more than 1
  task behind another member
- **THEN** the rebalancing pass SHALL transfer tasks from the ahead member
  to the behind member until the gap is at most 1, or stop only if no
  remaining task assigned to an ahead member is one the behind member is
  eligible for

#### Scenario: Once-per-period tasks get a day
- **WHEN** the assignment runs and a task has `is_daily = false`
- **THEN** the system SHALL assign that task a day of the week (0–6) in
  addition to a responsible member

#### Scenario: Same seed reproduces the same result
- **WHEN** the algorithm runs twice with the same members, tasks, period
  task settings, historical task counts, and seed
- **THEN** the resulting assignments SHALL be identical both times
