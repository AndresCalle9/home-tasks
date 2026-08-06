## ADDED Requirements

### Requirement: Manually Reassign a Variable Task
The system SHALL let a user change, directly from the "Calendario" tab, the
responsible member of any variable task in the current period, without
re-running the lottery or affecting any other task's assignment. Only
household members eligible for that task (per its `min_age`, if any) SHALL
be selectable. Fixed tasks SHALL NOT be editable this way. If the task has
more than one day assigned, reassigning it SHALL update the member for all
of its days at once.

#### Scenario: Reassigning a variable task to an eligible member
- **WHEN** a user selects a different, eligible member for a variable
  task's responsible-member control
- **THEN** the system SHALL update that task's `assignments` row(s) for the
  current period to the newly selected member
- **THEN** the calendar SHALL show that task under the new member's group
  without a full page reload

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
