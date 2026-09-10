# household-auth Specification

## Purpose
TBD - created by archiving change multi-tenant-households. Update Purpose after archive.
## Requirements
### Requirement: Sign Up as a New Household
The system SHALL let a visitor create a new household account by
submitting an email, an account password, and an initial "clave de
acciones" (action password) used to gate outcome-changing actions in
`week-assignment` and `calendar-view`. On success, the system SHALL create
exactly one `household` row linked to a new Supabase Auth user, and SHALL
sign the visitor in immediately.

#### Scenario: Successful sign-up
- **WHEN** a visitor submits a valid, not-already-registered email, an
  account password meeting Supabase Auth's minimum requirements, and a
  non-empty action password
- **THEN** the system SHALL create a Supabase Auth user, a `household` row
  linked to it (`user_id`) with a hashed `action_password_hash`, and start
  a signed-in session for that household

#### Scenario: Email already registered
- **WHEN** a visitor submits an email that already has a household account
- **THEN** the system SHALL NOT create a second household
- **THEN** the system SHALL show an inline error and SHALL NOT reveal
  whether the account differs by email vs. password (generic error)

#### Scenario: Missing or empty action password
- **WHEN** a visitor submits the sign-up form without an action password
- **THEN** the system SHALL reject the submission before creating any
  account or household row

### Requirement: Sign In to an Existing Household
The system SHALL let a returning user sign in with their email and account
password, resolving to their own household and no other.

#### Scenario: Correct credentials
- **WHEN** a user submits the email and account password matching an
  existing household's linked Supabase Auth user
- **THEN** the system SHALL start a signed-in session scoped to that
  household

#### Scenario: Incorrect credentials
- **WHEN** a user submits an email/password combination that does not
  match any household
- **THEN** the system SHALL NOT start a session
- **THEN** the system SHALL show a generic inline error that does not
  reveal whether the email exists

### Requirement: Every Page Requires a Signed-In Household
The system SHALL require an active session to access any page other than
sign-in/sign-up, redirecting unauthenticated visitors to sign-in.

#### Scenario: Unauthenticated visit to a protected page
- **WHEN** a visitor with no active session requests "/", "/semana",
  "/equipo", or "/ajustes"
- **THEN** the system SHALL redirect them to the sign-in page instead of
  rendering any household data

#### Scenario: Authenticated visit
- **WHEN** a signed-in user requests any protected page
- **THEN** the system SHALL render it using only that user's own
  household's data

### Requirement: Sign Out
The system SHALL let a signed-in user end their session from within the
app (e.g. from "Ajustes").

#### Scenario: Signing out
- **WHEN** a signed-in user chooses "Cerrar sesión"
- **THEN** the system SHALL end their session and redirect to the sign-in
  page
- **THEN** a subsequent request to any protected page SHALL redirect to
  sign-in again, per the previous requirement

### Requirement: A Household's Data Is Isolated from Every Other Household
The system SHALL ensure that no household can read or write another
household's `members`, `tasks`, `task_eligible_members`, `task_conflicts`,
or `assignments` rows, enforced at the database level (not solely by
application-level filtering).

#### Scenario: Reading only ever returns the signed-in household's rows
- **WHEN** a signed-in household's session performs any read against
  `members`, `tasks`, `task_eligible_members`, `task_conflicts`, or
  `assignments`
- **THEN** the system SHALL return only rows whose `household_id` matches
  that household, even if application code omits an explicit
  `household_id` filter

#### Scenario: Writing to another household's row is rejected
- **WHEN** a signed-in household's session attempts to insert, update, or
  delete a row whose `household_id` does not match its own household
- **THEN** the system SHALL reject the operation

### Requirement: Change the Action Password
The system SHALL let a signed-in household replace its action password
from "Ajustes", requiring the current action password to confirm the
change, and SHALL store only a salted hash — never the plaintext value.

#### Scenario: Changing with the correct current password
- **WHEN** a signed-in household submits its correct current action
  password along with a new one
- **THEN** the system SHALL replace `action_password_hash` with a hash of
  the new value
- **THEN** every subsequent gated action SHALL require the new value

#### Scenario: Changing with an incorrect current password
- **WHEN** a signed-in household submits an incorrect current action
  password
- **THEN** the system SHALL NOT change `action_password_hash`
- **THEN** the system SHALL show an inline error

