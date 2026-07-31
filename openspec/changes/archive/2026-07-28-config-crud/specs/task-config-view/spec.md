## MODIFIED Requirements

### Requirement: Read-Only Members List
The system SHALL display, on the "Configuración" tab, the household's real
members (from the `members` table in Supabase) by name, and SHALL let a user
create, edit, and delete members (`name`, `age`).

#### Scenario: Viewing members in Configuración
- **WHEN** a user opens the "Configuración" tab
- **THEN** the system SHALL show each real member's name (age is not shown
  in the list; it is only used as an input for the assignment algorithm)

#### Scenario: Creating a member
- **WHEN** a user submits the "Nuevo integrante" form with a name and an age
  of 0 or greater
- **THEN** the system SHALL create the member in Supabase and show it in the
  list without a manual page refresh

#### Scenario: Creating a member with a duplicate name
- **WHEN** a user submits a name that already belongs to another member
- **THEN** the system SHALL NOT create a duplicate row
- **THEN** the system SHALL show an inline error explaining the name is
  already in use, without closing the form

#### Scenario: Creating a member with an invalid age
- **WHEN** a user submits a negative age or leaves the name empty
- **THEN** the system SHALL reject the submission before or without
  persisting it
- **THEN** the system SHALL show an inline error identifying the invalid
  field

#### Scenario: Editing a member
- **WHEN** a user edits an existing member's name or age and submits
- **THEN** the system SHALL update that member's row in Supabase and reflect
  the new values in the list

#### Scenario: Deleting a member with no references
- **WHEN** a user confirms deleting a member who is not set as any task's
  fixed responsible person
- **THEN** the system SHALL delete the member and remove them from the list

#### Scenario: Deleting a member who is a task's fixed responsible person
- **WHEN** a user confirms deleting a member who is currently set as the
  fixed responsible person for one or more tasks
- **THEN** the system SHALL NOT delete the member
- **THEN** the system SHALL show an inline error asking the user to
  reassign those tasks first

### Requirement: Read-Only Tasks List
The system SHALL display, on the "Configuración" tab, the household's real
tasks (from the `tasks` table in Supabase), and SHALL let a user create,
edit, and delete tasks (`name`, `is_daily`, `weight`, `default_is_fixed`,
`default_fixed_member_id`).

#### Scenario: Viewing tasks in Configuración
- **WHEN** a user opens the "Configuración" tab
- **THEN** the system SHALL show each real task's name, whether it is daily
  or once-per-period, and whether it is fixed (and to which member, if
  fixed)

#### Scenario: Creating a variable task
- **WHEN** a user submits the "Nueva tarea" form with a name, marks it as
  not fixed, and leaves "es diaria" and "peso" at their defaults
- **THEN** the system SHALL create the task in Supabase with
  `default_is_fixed = false` and `default_fixed_member_id = null`, and show
  it in the list without a manual page refresh

#### Scenario: Creating a fixed task without selecting a member
- **WHEN** a user marks a task as fixed but does not select a responsible
  member
- **THEN** the system SHALL reject the submission
- **THEN** the system SHALL show an inline error asking for the responsible
  member

#### Scenario: Creating a fixed task with a selected member
- **WHEN** a user marks a task as fixed and selects an existing member
- **THEN** the system SHALL create the task with `default_is_fixed = true`
  and `default_fixed_member_id` set to that member

#### Scenario: Creating a task with a duplicate name
- **WHEN** a user submits a name that already belongs to another task
- **THEN** the system SHALL NOT create a duplicate row
- **THEN** the system SHALL show an inline error explaining the name is
  already in use, without closing the form

#### Scenario: Editing a task
- **WHEN** a user edits an existing task's name, `is_daily`, `weight`, or
  fixed status/member and submits
- **THEN** the system SHALL update that task's row in Supabase and reflect
  the new values in the list

#### Scenario: Deleting a task
- **WHEN** a user confirms deleting a task
- **THEN** the system SHALL delete the task and remove it from the list
