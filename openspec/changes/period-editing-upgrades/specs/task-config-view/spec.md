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
- **WHEN** a user confirms deleting a member who is not one of any task's
  enabled fixed members (default or per-period)
- **THEN** the system SHALL delete the member and remove them from the list

#### Scenario: Deleting a member who is one of a task's fixed members
- **WHEN** a user confirms deleting a member who is currently one of the
  enabled fixed members for one or more tasks (their default fixed members,
  or a period's fixed members for that task), even if other members are
  also enabled for that same task
- **THEN** the system SHALL NOT delete the member
- **THEN** the system SHALL show an inline error asking the user to remove
  them from those tasks first

### Requirement: Read-Only Tasks List
The system SHALL display, on the "Configuración" tab, the household's real
tasks (from the `tasks` table in Supabase), and SHALL let a user create,
edit, and delete tasks (`name`, `is_daily`, `default_is_fixed`, its default
fixed members, `min_age`, `day_group`, `times_per_week`).

#### Scenario: Viewing tasks in Configuración
- **WHEN** a user opens the "Configuración" tab
- **THEN** the system SHALL show each real task's name, whether it is daily
  or once-per-period, whether it is fixed (and to which member(s), if
  fixed), its minimum age when one is set, its day group when one is set,
  and its weekly frequency when the task is once-per-period

#### Scenario: Creating a variable task
- **WHEN** a user submits the "Nueva tarea" form with a name and marks it
  as not fixed
- **THEN** the system SHALL create the task in Supabase with
  `default_is_fixed = false` and no default fixed members, and show it in
  the list without a manual page refresh

#### Scenario: Creating a fixed task without selecting any member
- **WHEN** a user marks a task as fixed but does not select at least one
  responsible member
- **THEN** the system SHALL reject the submission
- **THEN** the system SHALL show an inline error asking for at least one
  responsible member

#### Scenario: Creating a fixed task with one or more selected members
- **WHEN** a user marks a task as fixed and selects one or more existing
  members
- **THEN** the system SHALL create the task with `default_is_fixed = true`
  and all of the selected members saved as its default fixed members

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

#### Scenario: Setting a day group for a task
- **WHEN** a user sets a day group while creating or editing a task
- **THEN** the system SHALL save it as that task's `day_group`, so it
  always receives the same days as any other task sharing that group the
  next time the assignment algorithm runs

#### Scenario: Leaving day group blank
- **WHEN** a user leaves the day group field blank while creating or
  editing a task
- **THEN** the system SHALL save `day_group` as unset, meaning that task's
  days are not tied to any other task's

#### Scenario: Setting a weekly frequency for a once-per-period task
- **WHEN** a user sets a value from 1 to 7 for a task marked as not daily
- **THEN** the system SHALL save it as that task's `times_per_week`, to be
  used as the number of days assigned the next time the assignment
  algorithm runs

#### Scenario: A once-per-period task requires a weekly frequency
- **WHEN** a user submits a task marked as not daily without a valid
  `times_per_week` between 1 and 7
- **THEN** the system SHALL reject the submission
- **THEN** the system SHALL show an inline error asking for a valid weekly
  frequency

#### Scenario: A daily task has no weekly frequency
- **WHEN** a user marks a task as daily
- **THEN** the system SHALL save `times_per_week` as unset for that task,
  regardless of any previously entered value

#### Scenario: Weekly frequency must match the rest of its day group
- **WHEN** a user sets a `day_group` on a task and that group already has
  another task with a different `times_per_week`
- **THEN** the system SHALL reject the submission
- **THEN** the system SHALL show an inline error naming the mismatched
  frequency

#### Scenario: Editing a task's fixed members
- **WHEN** a user edits an existing fixed task's selected members and
  submits, adding or removing one or more members
- **THEN** the system SHALL replace that task's default fixed members with
  exactly the newly selected set

#### Scenario: Editing a task
- **WHEN** a user edits an existing task's name, `is_daily`, `min_age`,
  `day_group`, `times_per_week`, or fixed status/members and submits
- **THEN** the system SHALL update that task's row in Supabase and reflect
  the new values in the list

#### Scenario: Deleting a task
- **WHEN** a user confirms deleting a task
- **THEN** the system SHALL delete the task and remove it from the list
