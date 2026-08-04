## MODIFIED Requirements

### Requirement: Read-Only Tasks List
The system SHALL display, on the "Configuración" tab, the household's real
tasks (from the `tasks` table in Supabase), and SHALL let a user create,
edit, and delete tasks (`name`, `is_daily`, `default_is_fixed`,
`default_fixed_member_id`, `min_age`).

#### Scenario: Viewing tasks in Configuración
- **WHEN** a user opens the "Configuración" tab
- **THEN** the system SHALL show each real task's name, whether it is daily
  or once-per-period, whether it is fixed (and to which member, if fixed),
  and its minimum age when one is set

#### Scenario: Creating a variable task
- **WHEN** a user submits the "Nueva tarea" form with a name and marks it
  as not fixed
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

#### Scenario: Setting a minimum age for a task
- **WHEN** a user sets a minimum age while creating or editing a task
- **THEN** the system SHALL save it as that task's `min_age`, to be
  enforced the next time the assignment algorithm runs

#### Scenario: Leaving minimum age blank
- **WHEN** a user leaves the minimum age field blank while creating or
  editing a task
- **THEN** the system SHALL save `min_age` as unset, meaning no age
  restriction applies to that task

#### Scenario: Editing a task
- **WHEN** a user edits an existing task's name, `is_daily`, `min_age`, or
  fixed status/member and submits
- **THEN** the system SHALL update that task's row in Supabase and reflect
  the new values in the list

#### Scenario: Deleting a task
- **WHEN** a user confirms deleting a task
- **THEN** the system SHALL delete the task and remove it from the list
