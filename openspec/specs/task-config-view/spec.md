# task-config-view Specification

## Purpose
Defines the CRUD surfaces for the household's setup data: the "Equipo" tab
(members and their per-task eligibility) and the "Ajustes" tab (household
name and the task catalog). Neither surface requires the shared security
password — it only gates actions that change the current week's assignment
outcome (see `week-assignment`).

## Requirements

### Requirement: Manage Members on Equipo
The system SHALL display, on the "Equipo" tab, every real member (from
`members`) with their name, how many assignments they hold this week, and
for how many tasks they are eligible, and SHALL let a user create, rename,
and delete members.

#### Scenario: Viewing members on Equipo
- **WHEN** a user opens the "Equipo" tab
- **THEN** the system SHALL show each member's name, current-week
  assignment count, and eligible-task count

#### Scenario: Creating a member
- **WHEN** a user submits "Añadir integrante" with a name and a color
- **THEN** the system SHALL create the member in `members` and show it in
  the list without a manual page refresh

#### Scenario: Creating a member with a duplicate name
- **WHEN** a user submits a name that already belongs to another member
- **THEN** the system SHALL NOT create a duplicate row
- **THEN** the system SHALL show an inline error explaining the name is
  already in use

#### Scenario: Renaming a member
- **WHEN** a user edits an existing member's name from their member sheet
- **THEN** the system SHALL update that member's `name` and reflect it
  everywhere it's displayed

#### Scenario: Deleting a member with no task eligibility
- **WHEN** a user confirms deleting a member who is not marked eligible for
  any task
- **THEN** the system SHALL delete the member

#### Scenario: Deleting a member who is still eligible for a task
- **WHEN** a user confirms deleting a member who is still listed in
  `task_eligible_members` for one or more tasks
- **THEN** the system SHALL NOT delete the member
- **THEN** the system SHALL show an inline error asking the user to remove
  them from those tasks first

### Requirement: Edit a Member's Task Eligibility from Their Sheet
The system SHALL let a user toggle, from a member's own sheet on "Equipo",
which tasks that member is eligible to receive in the sorteo, writing
directly to `task_eligible_members`.

#### Scenario: Marking a member eligible for a task
- **WHEN** a user checks a task in a member's sheet
- **THEN** the system SHALL add a `task_eligible_members` row for that
  (task, member) pair

#### Scenario: Marking a member ineligible for a task
- **WHEN** a user unchecks a previously-checked task in a member's sheet
- **THEN** the system SHALL remove that (task, member) row

### Requirement: Manage the Household Name on Ajustes
The system SHALL let a user view and edit the household's display name
(the single `household` row) from the "Ajustes" tab.

#### Scenario: Editing the household name
- **WHEN** a user edits the household name field and it loses focus with a
  non-empty, changed value
- **THEN** the system SHALL update `household.name` and reflect it
  throughout the app (e.g. the "Inicio" greeting)

#### Scenario: Leaving the household name unchanged or empty
- **WHEN** a user leaves the field unchanged, or clears it and it loses
  focus
- **THEN** the system SHALL NOT persist an empty name and SHALL revert the
  field to the last saved value

### Requirement: Manage the Task Catalog on Ajustes
The system SHALL display, on "Ajustes", every task (from `tasks`) with its
icon, schedule (derived from `freq`/`days`), and effort level, and SHALL
let a user create, edit, activate/deactivate, and delete tasks. A task's
editable fields are its name, icon, `effort` (ligera/media/alta), `freq`
(`diario`/`dias`/`semanal`) with its associated `days`, and its eligible
members.

#### Scenario: Viewing tasks on Ajustes
- **WHEN** a user opens the "Ajustes" tab
- **THEN** the system SHALL list every task with its icon, name, schedule
  label, and effort level, visually dimmed when inactive

#### Scenario: Creating a task
- **WHEN** a user submits "Crear tarea" with a name, a valid effort, a
  valid frequency (with at least one day unless `diario`), and at least one
  eligible member
- **THEN** the system SHALL create the task in `tasks` and its
  `task_eligible_members` rows, and show it in the list without a manual
  page refresh

#### Scenario: Creating a task with a duplicate name
- **WHEN** a user submits a name that already belongs to another task
- **THEN** the system SHALL NOT create a duplicate row
- **THEN** the system SHALL show an inline error explaining the name is
  already in use

#### Scenario: A "dias" or "semanal" task requires at least one day
- **WHEN** a user submits a task with `freq = "dias"` and no day selected,
  or `freq = "semanal"` with a day count other than exactly one
- **THEN** the system SHALL reject the submission and show an inline error

#### Scenario: A task requires at least one eligible member
- **WHEN** a user submits a task with no member marked eligible
- **THEN** the system SHALL reject the submission and show an inline error

#### Scenario: Editing a task
- **WHEN** a user edits an existing task's name, icon, effort, frequency,
  days, or eligible members and submits
- **THEN** the system SHALL update the task's row and its
  `task_eligible_members` set to match

#### Scenario: Activating or deactivating a task
- **WHEN** a user toggles a task's active switch
- **THEN** the system SHALL update its `active` flag; an inactive task
  SHALL be excluded from the next sorteo but SHALL remain visible (dimmed)
  in the catalog

#### Scenario: Deleting a task
- **WHEN** a user confirms deleting a task
- **THEN** the system SHALL delete the task, cascading its
  `task_eligible_members` and `task_conflicts` rows, and remove it from the
  list
