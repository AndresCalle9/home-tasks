## MODIFIED Requirements

### Requirement: Weekly Calendar Grid
The system SHALL display, on the "Calendario" tab, a Monday-to-Sunday
accordion of 7 collapsible day items. Each day SHALL be collapsed by
default, showing only the day name. Only one day SHALL be expanded at a
time — expanding a day SHALL collapse whichever day was previously
expanded. When a day is expanded, its content SHALL be grouped by
responsible member: each member with at least one task that day SHALL
appear as a heading, with their mocked task(s) for that day listed under
it.

#### Scenario: Loading the calendar tab
- **WHEN** a user opens the "Calendario" tab
- **THEN** the system SHALL render seven day items, Monday through Sunday,
  each collapsed and showing only its day name

#### Scenario: Expanding a day
- **WHEN** a user clicks a collapsed day
- **THEN** the system SHALL expand that day and show, for each member with
  a task that day, a heading with the member's name followed by their
  task(s) for that day

#### Scenario: Expanding a different day collapses the previous one
- **WHEN** a user clicks a day while a different day is already expanded
- **THEN** the system SHALL collapse the previously expanded day and expand
  the newly clicked one, so at most one day is expanded at a time
