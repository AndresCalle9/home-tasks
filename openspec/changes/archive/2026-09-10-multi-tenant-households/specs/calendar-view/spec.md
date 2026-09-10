## MODIFIED Requirements

### Requirement: Reassign an Assignment from Its Detail Sheet
The system SHALL let a signed-in household change one of their own
assignment's responsible member from its detail sheet, offering only
members of that same household eligible for that task other than the
current one, gated behind that household's own action password (stored
hashed in `household.action_password_hash`) entered inline.

#### Scenario: Reassigning with the correct password
- **WHEN** a signed-in household picks a different eligible member (from
  their own household) and enters their own correct action password in the
  detail sheet's reassignment step
- **THEN** the system SHALL update that assignment's member and close the
  sheet

#### Scenario: Wrong or missing password
- **WHEN** a signed-in household enters an incorrect or empty action
  password
- **THEN** the system SHALL NOT change the assignment and SHALL show an
  inline error, keeping the sheet open

#### Scenario: No reassignment control when there are no other eligible members
- **WHEN** an assignment's task has no other eligible member, within the
  same household, besides the current one
- **THEN** the system SHALL NOT show the "Cambiar responsable" option
