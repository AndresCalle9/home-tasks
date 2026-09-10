## MODIFIED Requirements

### Requirement: Review and Edit Fixed/Variable Tasks Before Assigning
Once a period exists, the system SHALL show every task with its fixed/
variable status and (if fixed) its enabled member(s), pre-filled from each
task's default (`default_is_fixed`, its default fixed members), and SHALL
let the user change either for this period only before running the sorteo.
A fixed task's enabled members SHALL be a set of one or more household
members, not necessarily just one.

#### Scenario: Defaults are pre-filled
- **WHEN** a user reaches the review step for a newly created period
- **THEN** the system SHALL show each task's fixed/variable state and its
  fixed member(s) matching that task's current default values

#### Scenario: Editing a task's fixed status for this period only
- **WHEN** a user changes a task from fixed to variable (or vice versa, and
  picks one or more members if now fixed) during review and confirms
- **THEN** the system SHALL persist that choice to `period_task_settings`
  (and its enabled members) for this period without changing the task's own
  default

#### Scenario: Marking a task fixed without any member
- **WHEN** a user marks a task as fixed but does not choose at least one
  responsible member
- **THEN** the system SHALL reject the submission and ask for at least one
  member

#### Scenario: Marking a task fixed with multiple members
- **WHEN** a user marks a task as fixed and selects more than one member
  during review
- **THEN** the system SHALL persist all of the selected members as that
  task's enabled fixed members for this period

### Requirement: Run the Weighted Assignment Algorithm
Running this algorithm — whether triggered by confirming a new period's
fixed/variable settings for the first time, or by a reroll of an already-
assigned period — SHALL require the shared security password
(`SECURITY_PASSWORD`), entered in a confirmation step and verified
server-side; the system SHALL NOT run the algorithm, and SHALL leave any
previous assignments untouched, if the password is wrong or missing.
Once fixed/variable settings are confirmed, the system SHALL assign every
variable task to exactly one member for the whole period using a lottery
balanced by how many tasks each member currently holds, where that count
starts from the member's fixed-task count for this period plus their
variable-task count from previously assigned periods: at the moment each
variable task is drawn, only members holding the strict minimum task count
among that task's eligible candidates SHALL be able to win it, with the
winner chosen uniformly at random (via the seeded RNG) among any tied
candidates. A task with a configured minimum age SHALL only be eligible for
members at or above that age; if no member meets it, the system SHALL
assign the task to the oldest household member instead of leaving it
unassigned. Age SHALL NOT otherwise influence the odds of being picked.
A fixed task SHALL be assigned to whichever of its configured enabled
members currently holds the strict minimum task count among them, with ties
broken uniformly at random the same way as the variable lottery; it SHALL
NOT enter the variable lottery itself or be reassignable by the rebalancing
pass, but SHALL count toward the winning member's initial task count for
this period's balance — historical task counts carried over from previously
assigned periods SHALL remain based on variable tasks only, so a permanent
fixed responsibility does not reduce a member's odds in future periods.
Tasks that are not daily (`is_daily = false`), whether fixed or variable,
SHALL receive that task's configured number of distinct days per week
(`times_per_week`, 1-7) as part of this same run; tasks sharing the same
non-null `day_group` SHALL always receive the identical set of days as each
other. After the lottery, the system SHALL rebalance by repeatedly
transferring one variable task from whichever member currently holds the
most tasks to whichever member holds the fewest — provided the receiving
member is eligible for that task — until the difference between the busiest
and least-busy member is at most 1, or no further eligible transfer exists.
This rebalancing SHALL only ever change which member a task is assigned
to, never its assigned day(s), and SHALL NOT touch fixed-task assignments.
The algorithm SHALL be deterministic for a given stored seed.

#### Scenario: Wrong or missing password blocks running the assignment
- **WHEN** a user confirms a period's fixed/variable settings and submits
  an incorrect password, or no password, in the confirmation step
- **THEN** the system SHALL NOT run the assignment algorithm
- **THEN** the system SHALL show an inline error and SHALL NOT create or
  change any `assignments` rows for that period

#### Scenario: Fixed tasks bypass the lottery
- **WHEN** the assignment runs for a period
- **THEN** every task marked fixed in that period's settings SHALL be
  assigned to one of its configured enabled members without going through
  the variable lottery

#### Scenario: A fixed task with multiple enabled members picks the least-loaded one
- **WHEN** the assignment runs and a fixed task has more than one enabled
  member configured for this period
- **THEN** the system SHALL assign it to whichever of those enabled members
  currently holds the strict minimum task count among them, breaking any
  tie uniformly at random via the seeded RNG

#### Scenario: A member's fixed tasks reduce their variable-task share this period
- **WHEN** the assignment runs and a member holds more fixed tasks this
  period than other members
- **THEN** that member's initial task count for the lottery and
  rebalancing pass SHALL include their fixed-task count for this period
- **THEN** that member SHALL receive proportionally fewer variable tasks
  than a member with no fixed tasks this period, all else being equal

#### Scenario: Fixed tasks never enter the lottery or the rebalancing pass
- **WHEN** the assignment runs and a member holds one or more fixed tasks
  this period
- **THEN** none of that member's fixed tasks SHALL ever be transferred by
  the rebalancing pass or offered as a candidate in the variable lottery

#### Scenario: A permanent fixed responsibility does not carry over to future periods
- **WHEN** a member has held the same fixed task across several previously
  assigned periods
- **THEN** the historical task count used to seed a new period's lottery
  SHALL NOT include those past fixed-task assignments, only that member's
  past variable-task counts

#### Scenario: Variable tasks are balanced by task count, not age
- **WHEN** the assignment runs and a household has both adult and minor
  members, all eligible for a given task
- **THEN** only the members currently holding the fewest tasks among that
  task's eligible candidates SHALL be able to win it, and age SHALL NOT
  affect which of them is picked

#### Scenario: The busiest and least-busy member never drift far apart
- **WHEN** the assignment runs for a period with any number of variable
  tasks and members
- **THEN** the difference in total task count (fixed plus variable) between
  any two members eligible for the same tasks SHALL never exceed 1 once the
  lottery and rebalancing pass finish, except where a structural constraint
  (e.g. `min_age`) makes that impossible

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

#### Scenario: A once-per-period task gets its own configured number of days
- **WHEN** the assignment runs and a task has `is_daily = false` and a
  configured `times_per_week` of N
- **THEN** the system SHALL assign that task N distinct days of the week
  (0–6) in addition to a responsible member, whether the task is fixed or
  variable

#### Scenario: Tasks in the same day group always share their days
- **WHEN** the assignment runs and two or more non-daily tasks share the
  same non-null `day_group`
- **THEN** the system SHALL assign the identical set of days to every task
  in that group, drawn using that group's shared `times_per_week`

#### Scenario: Ungrouped tasks are not forced to share days
- **WHEN** the assignment runs and a non-daily task has no `day_group` (or
  a `day_group` different from another task's)
- **THEN** the system SHALL NOT require its days to match any other
  task's days

#### Scenario: Rebalancing never changes a task's assigned days
- **WHEN** the rebalancing pass transfers a task from one member to
  another
- **THEN** the task's previously assigned day(s) SHALL remain unchanged —
  only the responsible member SHALL change

#### Scenario: Same seed reproduces the same result
- **WHEN** the algorithm runs twice with the same members, tasks, period
  task settings, historical task counts, and seed
- **THEN** the resulting assignments SHALL be identical both times

### Requirement: Reroll a Period's Assignment
Once a period has been assigned, the system SHALL let a user re-run the
weighted lottery for that same period using a newly generated seed, without
requiring the period or its fixed/variable settings to be redefined. This
SHALL require the shared security password (`SECURITY_PASSWORD`), entered
in a confirmation step and verified server-side; the system SHALL NOT
reroll, and SHALL leave the period's existing assignments untouched, if the
password is wrong or missing.

#### Scenario: Rerolling replaces the previous result
- **WHEN** a user rerolls an already-assigned period and confirms the
  security password correctly
- **THEN** the system SHALL generate a new seed, discard that period's
  previous `assignments` rows, and persist a new set of assignments
- **THEN** the period's fixed/variable settings (`period_task_settings`)
  SHALL remain unchanged

#### Scenario: Wrong or missing password blocks a reroll
- **WHEN** a user attempts to reroll an already-assigned period and submits
  an incorrect password, or no password, in the confirmation step
- **THEN** the system SHALL NOT discard or regenerate that period's
  `assignments` rows
- **THEN** the system SHALL show an inline error
