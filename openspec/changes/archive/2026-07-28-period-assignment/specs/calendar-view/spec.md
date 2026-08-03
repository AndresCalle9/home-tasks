## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Assign Tasks Button Is a Non-Functional Placeholder
**Reason**: the assignment flow now exists; the button is no longer a
placeholder.
**Migration**: see the new "Assign Tasks Button Opens the Assignment Flow"
requirement below.

## ADDED Requirements

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
