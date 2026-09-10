# calendar-view Specification

## Purpose
Defines the two read/interact surfaces built on top of the current week's
`assignments`: the "Inicio" tab (today's view, per-member profile switcher)
and the "Semana" tab (the full Monday-to-Sunday calendar, by day or by
person). Both share the same task detail sheet, completion toggle, and
duel-swap entry point.

## Requirements

### Requirement: Choose a Current Profile on Inicio
The system SHALL let a user pick, on the "Inicio" tab, which household
member they currently are, from a horizontally scrollable list of pills.
The choice SHALL persist on that device (not tied to any account or
password) and SHALL drive which assignments count as "mine" across the app
until changed.

#### Scenario: Selecting a profile
- **WHEN** a user taps a member's pill under "¿Quién eres hoy?"
- **THEN** the system SHALL remember that member as the current profile on
  this device and highlight their pill as active

#### Scenario: No profile selected yet
- **WHEN** no member has been chosen on this device
- **THEN** the system SHALL treat no assignment as "mine" (the duel entry
  point stays tied to whichever assignment's sheet is open, not a global
  "my day" filter)

### Requirement: Show Today's Tasks and Team Progress on Inicio
The system SHALL show, on "Inicio", how many of today's assignments are
pending versus completed household-wide, the current profile's own tasks
for today ("Tu misión de hoy"), and a per-member summary of today's
completed-vs-total count ("Así va el equipo").

#### Scenario: Today has assignments
- **WHEN** the current day of the week has one or more rows in
  `assignments`
- **THEN** the system SHALL list the current profile's own tasks for today,
  and show every member's today completed/total count

#### Scenario: The current profile has nothing today
- **WHEN** the current profile holds no assignment for today
- **THEN** the system SHALL show an empty-state message instead of a task
  list, without treating it as an error

### Requirement: Weekly Calendar Grid on Semana
The system SHALL display, on the "Semana" tab, the current week's
assignments in two switchable views: "Por día" (a horizontally scrollable
Monday-to-Sunday day picker, showing every member with at least one task
that day, grouped under their name) and "Por persona" (a horizontally
scrollable member picker, showing that member's tasks grouped under each
day they have one). Assignments with no responsible member SHALL still be
shown (in "Por día") flagged visually as unassigned, instead of being
hidden.

#### Scenario: Viewing a day in "Por día"
- **WHEN** a user selects a day pill in "Por día"
- **THEN** the system SHALL show, for that day, every member who holds at
  least one assignment, each followed by their task(s), plus any
  unassigned task for that day

#### Scenario: Viewing a member in "Por persona"
- **WHEN** a user selects a member pill in "Por persona"
- **THEN** the system SHALL show every day of the week that member holds at
  least one assignment, each followed by their task(s) for that day

### Requirement: Open a Task's Detail Sheet
The system SHALL let a user open any assignment shown on "Inicio" or
"Semana" to see its task name, icon, day, and current responsible member
(or an explicit "nadie todavía" state), and from there mark it complete,
reassign it, or start a duel.

#### Scenario: Opening an assignment's detail
- **WHEN** a user taps an assignment row on either tab
- **THEN** the system SHALL open its detail sheet showing the task, the
  day, and the current responsible member (or the unassigned state)

### Requirement: Mark an Assignment's Completion
The system SHALL let a user toggle any assignment's completion status from
its detail sheet, independently of every other assignment, without
requiring the shared security password and without restricting who is
allowed to do it.

#### Scenario: Marking an assignment done
- **WHEN** a user taps "Marcar como hecha" on a pending assignment's detail
  sheet
- **THEN** the system SHALL set that assignment's `status` to `completed`
  and close the sheet

#### Scenario: Unmarking a completed assignment
- **WHEN** a user taps "Marcar como pendiente" on a completed assignment's
  detail sheet
- **THEN** the system SHALL set that assignment's `status` back to
  `pending`

#### Scenario: Completing requires no password
- **WHEN** a user toggles an assignment's completion
- **THEN** the system SHALL NOT prompt for `SECURITY_PASSWORD`

### Requirement: Reassign an Assignment from Its Detail Sheet
The system SHALL let a user change an assignment's responsible member from
its detail sheet, offering only members eligible for that task other than
the current one, gated behind the shared security password entered inline.

#### Scenario: Reassigning with the correct password
- **WHEN** a user picks a different eligible member and enters the correct
  password in the detail sheet's reassignment step
- **THEN** the system SHALL update that assignment's member and close the
  sheet

#### Scenario: Wrong or missing password
- **WHEN** a user enters an incorrect or empty password
- **THEN** the system SHALL NOT change the assignment and SHALL show an
  inline error, keeping the sheet open

#### Scenario: No reassignment control when there are no other eligible members
- **WHEN** an assignment's task has no other eligible member besides the
  current one
- **THEN** the system SHALL NOT show the "Cambiar responsable" option

### Requirement: Start a Duel to Swap Two Assignments
The system SHALL offer a "Retar por intercambio" action, only on an
assignment held by the current profile, that lets the user pick another
eligible same-day, same-effort assignment held by someone else and resolve
who keeps which task via a shared-device rock-paper-scissors game, with no
password required.

#### Scenario: Duel option available
- **WHEN** the current profile opens the detail sheet of their own
  assignment and at least one valid duel candidate exists
- **THEN** the system SHALL show an enabled "✌️ Retar por intercambio"
  button

#### Scenario: No valid duel candidates
- **WHEN** no other assignment matches the same day, same effort, not
  completed, and requester-eligible criteria
- **THEN** the system SHALL show the duel button disabled with an
  explanatory hint instead of hiding it

#### Scenario: Duel resolves in the requester's favor
- **WHEN** the rock-paper-scissors result favors the requester
- **THEN** the system SHALL swap the two assignments' responsible members
  and close the duel overlay

#### Scenario: Duel does not resolve in the requester's favor
- **WHEN** the requester loses, or ties and declines a rematch
- **THEN** the system SHALL close the duel overlay without changing either
  assignment
