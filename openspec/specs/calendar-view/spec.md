# calendar-view Specification

## Purpose
TBD - created by archiving change ui-shell-mockup. Update Purpose after archive.

## Requirements

### Requirement: Weekly Calendar Grid
The system SHALL display, on the "Calendario" tab, a Monday-to-Sunday
accordion of 7 collapsible day items for the current period (the most
recent period with status `assigned`). Each day SHALL be collapsed by
default, showing only the day name. Only one day SHALL be expanded at a
time — expanding a day SHALL collapse whichever day was previously
expanded. When a day is expanded, its content SHALL be grouped by
responsible member: each member with at least one task that day SHALL
appear as a heading, with their real assigned task(s) for that day listed
under it. If no period has ever been assigned, the system SHALL show an
empty state instead of the accordion.

#### Scenario: Loading the calendar tab with an assigned period
- **WHEN** a user opens the "Calendario" tab and a current period exists
- **THEN** the system SHALL render seven day items, Monday through Sunday,
  each collapsed and showing only its day name, reflecting that period's
  real assignments

#### Scenario: Expanding a day
- **WHEN** a user clicks a collapsed day
- **THEN** the system SHALL expand that day and show, for each member with
  a real task that day, a heading with the member's name followed by their
  task(s) for that day

#### Scenario: Expanding a different day collapses the previous one
- **WHEN** a user clicks a day while a different day is already expanded
- **THEN** the system SHALL collapse the previously expanded day and expand
  the newly clicked one, so at most one day is expanded at a time

#### Scenario: No period has ever been assigned
- **WHEN** a user opens the "Calendario" tab and no period has status
  `assigned`
- **THEN** the system SHALL show an empty state explaining that no period
  has been assigned yet, instead of the day accordion

### Requirement: Assign Tasks Button Opens the Assignment Flow
The system SHALL display an "Asignar tareas" button on the "Calendario" tab
that navigates to the period-assignment flow. If the current period is
already `assigned`, the system SHALL also show a "Volver a sortear" button
that rerolls that period's assignment without leaving the "Calendario" tab.

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
  assigned
- **THEN** the system SHALL reroll that period's assignment and update the
  "Calendario" tab to reflect the new result without navigating away

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
