# calendar-view Specification

## Purpose
TBD - created by archiving change ui-shell-mockup. Update Purpose after archive.

## Requirements

### Requirement: Weekly Calendar Grid
The system SHALL display a Monday-to-Sunday grid on the "Calendario" tab
showing, for each day, the mocked tasks scheduled that day and the member
responsible for each one.

#### Scenario: Loading the calendar tab
- **WHEN** a user opens the "Calendario" tab
- **THEN** the system SHALL render seven day cells, Monday through Sunday, each
  showing the mock tasks assigned to that day and the responsible member's name

### Requirement: Assign Tasks Button Is a Non-Functional Placeholder
The system SHALL display an "Asignar tareas" button on the "Calendario" tab
that does not perform any real assignment, period definition, or Supabase/API
call in this change.

#### Scenario: Clicking the button in this change
- **WHEN** a user clicks the "Asignar tareas" button
- **THEN** the system SHALL NOT run any assignment logic and SHALL NOT call
  Supabase or any API route
- **THEN** the system MAY show a placeholder state (e.g. a disabled button or
  an empty modal) instead of a functional flow
