## ADDED Requirements

### Requirement: Read-Only Members List
The system SHALL display, on the "Configuración" tab, a read-only list of
household members using mock data shaped like the `members` table (`name`,
`age`).

#### Scenario: Viewing members in Configuración
- **WHEN** a user opens the "Configuración" tab
- **THEN** the system SHALL show each mock member's name and age
- **THEN** the system SHALL NOT show any create, edit, or delete control for
  members in this change

### Requirement: Read-Only Tasks List
The system SHALL display, on the "Configuración" tab, a read-only list of
tasks using mock data shaped like the `tasks` table (`name`, `is_daily`,
`default_is_fixed`, `default_fixed_member_id`).

#### Scenario: Viewing tasks in Configuración
- **WHEN** a user opens the "Configuración" tab
- **THEN** the system SHALL show each mock task's name, whether it is daily or
  once-per-period, and whether it is fixed (and to which member, if fixed)
- **THEN** the system SHALL NOT show any create, edit, or delete control for
  tasks in this change
