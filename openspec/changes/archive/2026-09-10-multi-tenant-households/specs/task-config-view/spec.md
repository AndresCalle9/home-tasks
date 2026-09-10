## MODIFIED Requirements

### Requirement: Manage Members on Equipo
The system SHALL display, on the "Equipo" tab, every real member of the
signed-in household (from `members`, filtered by `household_id`) with
their name, how many assignments they hold this week, and for how many
tasks they are eligible, and SHALL let a user create, rename, and delete
members belonging only to their own household.

#### Scenario: Viewing members on Equipo
- **WHEN** a signed-in household opens the "Equipo" tab
- **THEN** the system SHALL show each of that household's members' name,
  current-week assignment count, and eligible-task count, and no other
  household's members

#### Scenario: Creating a member
- **WHEN** a signed-in household submits "Añadir integrante" with a name
  and a color
- **THEN** the system SHALL create the member in `members` tagged with
  that household's `household_id` and show it in the list without a
  manual page refresh

#### Scenario: Creating a member with a duplicate name
- **WHEN** a signed-in household submits a name that already belongs to
  another member of that same household
- **THEN** the system SHALL NOT create a duplicate row
- **THEN** the system SHALL show an inline error explaining the name is
  already in use

#### Scenario: Two different households may reuse the same member name
- **WHEN** a household submits a member name that already exists in a
  different household
- **THEN** the system SHALL create the member normally, since uniqueness is
  scoped per household, not global

#### Scenario: Renaming a member
- **WHEN** a signed-in household edits one of their own member's name from
  their member sheet
- **THEN** the system SHALL update that member's `name` and reflect it
  everywhere it's displayed

#### Scenario: Deleting a member with no task eligibility
- **WHEN** a signed-in household confirms deleting one of their own
  members who is not marked eligible for any task
- **THEN** the system SHALL delete the member

#### Scenario: Deleting a member who is still eligible for a task
- **WHEN** a signed-in household confirms deleting one of their own
  members who is still listed in `task_eligible_members` for one or more
  of that household's tasks
- **THEN** the system SHALL NOT delete the member
- **THEN** the system SHALL show an inline error asking the user to remove
  them from those tasks first

### Requirement: Manage the Household Name on Ajustes
The system SHALL let a signed-in household view and edit their own
household's display name (their own `household` row, resolved from their
session) from the "Ajustes" tab.

#### Scenario: Editing the household name
- **WHEN** a signed-in household edits their household name field and it
  loses focus with a non-empty, changed value
- **THEN** the system SHALL update that household's `household.name` and
  reflect it throughout the app (e.g. the "Inicio" greeting), without
  affecting any other household's name

#### Scenario: Leaving the household name unchanged or empty
- **WHEN** a user leaves the field unchanged, or clears it and it loses
  focus
- **THEN** the system SHALL NOT persist an empty name and SHALL revert the
  field to the last saved value

### Requirement: Manage the Task Catalog on Ajustes
The system SHALL display, on "Ajustes", every task belonging to the
signed-in household (from `tasks`, filtered by `household_id`) with its
icon, schedule (derived from `freq`/`days`), and effort level, and SHALL
let a user create, edit, activate/deactivate, and delete tasks belonging
only to their own household. A task's editable fields are its name, icon,
`effort` (ligera/media/alta), `freq` (`diario`/`dias`/`semanal`) with its
associated `days`, and its eligible members (drawn only from that same
household's members).

#### Scenario: Viewing tasks on Ajustes
- **WHEN** a signed-in household opens the "Ajustes" tab
- **THEN** the system SHALL list every task belonging to that household
  with its icon, name, schedule label, and effort level, visually dimmed
  when inactive, and no other household's tasks

#### Scenario: Creating a task
- **WHEN** a signed-in household submits "Crear tarea" with a name, a
  valid effort, a valid frequency (with at least one day unless
  `diario`), and at least one eligible member from their own household
- **THEN** the system SHALL create the task in `tasks` tagged with that
  household's `household_id` and its `task_eligible_members` rows, and
  show it in the list without a manual page refresh

#### Scenario: Creating a task with a duplicate name
- **WHEN** a signed-in household submits a name that already belongs to
  another task of that same household
- **THEN** the system SHALL NOT create a duplicate row
- **THEN** the system SHALL show an inline error explaining the name is
  already in use

#### Scenario: Two different households may reuse the same task name
- **WHEN** a household submits a task name that already exists in a
  different household
- **THEN** the system SHALL create the task normally, since uniqueness is
  scoped per household, not global

#### Scenario: A "dias" or "semanal" task requires at least one day
- **WHEN** a user submits a task with `freq = "dias"` and no day selected,
  or `freq = "semanal"` with a day count other than exactly one
- **THEN** the system SHALL reject the submission and show an inline error

#### Scenario: A task requires at least one eligible member
- **WHEN** a user submits a task with no member marked eligible
- **THEN** the system SHALL reject the submission and show an inline error

#### Scenario: Editing a task
- **WHEN** a signed-in household edits one of their own existing task's
  name, icon, effort, frequency, days, or eligible members and submits
- **THEN** the system SHALL update the task's row and its
  `task_eligible_members` set to match

#### Scenario: Activating or deactivating a task
- **WHEN** a user toggles one of their own task's active switch
- **THEN** the system SHALL update its `active` flag; an inactive task
  SHALL be excluded from that household's next sorteo but SHALL remain
  visible (dimmed) in the catalog

#### Scenario: Deleting a task
- **WHEN** a signed-in household confirms deleting one of their own tasks
- **THEN** the system SHALL delete the task, cascading its
  `task_eligible_members` and `task_conflicts` rows, and remove it from
  the list
