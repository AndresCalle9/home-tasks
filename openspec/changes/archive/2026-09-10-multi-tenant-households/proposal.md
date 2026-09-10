## Why

Home Tasks only works for a single household today: `household` is a
singleton row (`id = 1`), and every domain table (`members`, `tasks`,
`task_eligible_members`, `task_conflicts`, `assignments`) is implicitly
scoped to that one household with no isolation mechanism. To let any
household sign up and run their own independent instance of the app on the
same deployment, the app needs real accounts and per-household data
isolation.

## What Changes

- **BREAKING**: `household.id` changes from a fixed `smallint` singleton to
  a real `uuid` primary key, one row per household.
- New `household-auth` capability: anyone can sign up with an email +
  password (Supabase Auth) to create a new household; signing in loads
  that household's data. Each `household` row links 1:1 to a Supabase Auth
  user (`auth.users`) via a `user_id` column. No multi-user households, no
  invitations — one account per household, matching today's single shared
  login model but now per-household instead of app-wide.
- **BREAKING**: every domain table (`members`, `tasks`,
  `task_eligible_members`, `task_conflicts`, `assignments`) gains a
  `household_id` column (FK to `household.id`, not null), and every
  read/write in `lib/data/*.ts` is scoped by the signed-in household's id —
  no query may read or write another household's rows.
- **BREAKING**: the shared `SECURITY_PASSWORD` env var (a single value for
  the whole deployment, gating "repartir/reiniciar semana" and manual
  reassignment) is replaced by a per-household secret stored — hashed —
  in the database, settable and changeable by that household from
  Ajustes. `SECURITY_PASSWORD` is removed from `.env.example`.
- Unauthenticated visitors are redirected to a sign-in/sign-up screen;
  every existing route (`/`, `/semana`, `/equipo`, `/ajustes`) requires a
  signed-in household.
- The existing "¿Quién eres hoy?" member-profile picker (`current-member-
  provider`) is unchanged — it still operates only within the signed-in
  household's own members, with no password.
- The one real household currently in Supabase is migrated to the new
  shape (a real `uuid`, a linked Supabase Auth user, and `household_id`
  backfilled onto all of its existing rows) so no data is lost.

## Capabilities

### New Capabilities
- `household-auth`: sign-up, sign-in, sign-out, and session handling for a
  household account (Supabase Auth-backed), plus managing that household's
  own action-gating password (set/change, hashed, stored in the database)
  that replaces `SECURITY_PASSWORD`.

### Modified Capabilities
- `week-assignment`: every read/write (sorteo, reset, reassignment) is
  scoped to the signed-in household's `household_id`; the password check
  moves from `SECURITY_PASSWORD` (env var) to that household's stored
  action password.
- `calendar-view`: Inicio/Semana only ever show the signed-in household's
  own members, tasks, and assignments; the reassignment control's password
  check moves to the household's stored action password.
- `task-config-view`: Equipo/Ajustes CRUD (members, tasks, eligibility,
  household name) is scoped to the signed-in household's `household_id` —
  a household can only ever see and edit its own catalog.

## Impact

- **Schema**: `household` gets `id uuid` (was `smallint` singleton),
  `user_id uuid references auth.users` (unique), and a hashed action-
  password column; `members`, `tasks`, `task_eligible_members`,
  `task_conflicts`, `assignments` each get a `household_id uuid not null
  references household(id)`; unique constraints that assumed a single
  household (e.g. `members.name unique`, `tasks.name unique`) become
  composite with `household_id`. Ships as a hand-run migration (existing
  project convention) plus a backfill of the one real household's data.
- **Auth**: adds Supabase Auth (email/password) to the stack; adds a
  session-aware layer (middleware or per-request check in the Next.js App
  Router) that resolves the signed-in household and blocks every route and
  server action when absent.
- **Data layer**: every function in `lib/data/*.ts` gains a
  `householdId` parameter (or reads it from the request-scoped session) and
  filters/writes with it; `lib/security/password.ts` changes from an env-
  var comparison to a per-household hash lookup and verification.
- **RLS**: revisit whether `service_role`-only access (current model, RLS
  enabled with zero policies) remains sufficient now that rows are
  multi-tenant, or whether real RLS policies keyed on `auth.uid()` are
  added as defense in depth — decided in design.md.
- **UI**: new sign-up/sign-in screens; `app/layout.tsx` and every page
  gain an auth guard; a new "cambiar clave" control in Ajustes.
- **Env**: removes `SECURITY_PASSWORD` from `.env.example`; adds whatever
  Supabase Auth requires (likely already covered by `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY`, plus the anon key if client-side auth calls
  are needed — confirmed in design.md).
- **Docs**: `CLAUDE.md` and `openspec/config.yaml`'s context currently
  document "un solo hogar, sin cuentas" as the model — both need updating
  once this ships (tracked as a task, not part of this proposal's own
  scope).
