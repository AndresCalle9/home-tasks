## Context

Home Tasks is a single-tenant internal tool today: `household` is a
`smallint` singleton (`id = 1`), and `members`, `tasks`,
`task_eligible_members`, `task_conflicts`, `assignments` have no tenant
column at all — every query in `lib/data/*.ts` implicitly operates on "the
only household that exists." Access control today is: no user accounts at
all (anyone who has the URL is "in"), plus one shared `SECURITY_PASSWORD`
(env var) gating a handful of destructive actions (see
`openspec/specs/week-assignment/spec.md`). All Supabase access goes through
`lib/supabase/server-client.ts`, a single service-role client used
server-side only (RLS is enabled on every table but has zero policies —
the service-role key bypasses RLS entirely regardless of policies, so
today RLS is a formality, not an enforcement layer).

Turning this into a self-serve multi-tenant product means: (a) real
accounts so a household can only ever open its own data, and (b) every
domain row tagged with which household it belongs to. Because this is the
first time the app has any notion of an authenticated identity, this is
also the first point where Postgres RLS can become a *real* security
boundary instead of a no-op — which changes how `lib/data/*.ts` should talk
to Supabase, not just what columns exist.

## Goals / Non-Goals

**Goals:**
- Any visitor can sign up (email + password) and get their own isolated
  household: own members, tasks, eligibility, conflicts, and current week.
- A household can never read or write another household's rows, enforced
  at the database level (not only by application code remembering to
  filter).
- The existing shared "action password" (today `SECURITY_PASSWORD`, a
  single deployment-wide env var) becomes per-household, stored hashed in
  the database, changeable by that household.
- The one real household currently in Supabase is migrated with zero data
  loss.
- No change to the sorteo algorithm itself (`lib/algorithm/schedule.ts`
  stays a pure function over members/tasks/conflicts arrays); only its
  callers change to source those arrays from the signed-in household.

**Non-Goals:**
- Multiple user accounts per household, invitations, or per-member
  permissions — still exactly one login per household (see proposal
  "Impact"/scope).
- Billing/plans, admin/superadmin tooling, marketing/onboarding pages.
- Changing the "¿Quién eres hoy?" member-profile picker — it keeps working
  exactly as today, scoped to whichever household is signed in.

## Decisions

### Decision 1: Supabase Auth (email + password), driven entirely from Server Actions

Use Supabase Auth's built-in email/password provider instead of hand-rolled
credentials. Sign-up, sign-in, sign-out, and session refresh are performed
via `@supabase/ssr`'s `createServerClient`, called only from Server Actions
and `middleware.ts` — never from a `"use client"` component calling
`supabase.auth.*` directly in the browser.

This means the Supabase anon/publishable key (`SUPABASE_ANON_KEY`, already
present but unused in `.env.example`) stays a **server-only** env var, same
as the service-role key today — it is read by the server-side auth client
inside Server Actions/middleware to issue and refresh session cookies, and
is never sent to the browser or given a `NEXT_PUBLIC_` prefix. Forms stay
the same shape as every existing form in this codebase: a `<form
action={formAction}>` posting to a `"use server"` action
(`useActionState`), consistent with `app/ajustes/actions.ts` and friends.

`middleware.ts` runs `supabase.auth.getUser()` on every request to refresh
the access token and rewrite the session cookie (the standard
`@supabase/ssr` Next.js App Router pattern) — this is the one place a
cookie can be silently refreshed outside of a Server Action, since Server
Components can read cookies but not write them.

**Alternatives considered:**
- *Client-side `signInWithPassword` from a browser Supabase client*: the
  more common Supabase tutorial pattern, but it requires exposing the anon
  key to the browser (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and introduces the
  first-ever direct client→Supabase call in this codebase, breaking the
  "client never talks to Supabase directly" rule from `CLAUDE.md`. Rejected
  to keep that boundary intact — the anon key is technically safe to
  expose (it's designed to be, RLS is what protects data), but there's no
  need to widen the app's security surface when Server Actions work fine.
- *Hand-rolled credentials table + own session cookies*: what the user
  initially sketched (household name + password). Rejected per the earlier
  decision to use Supabase Auth — reinventing password hashing, session
  cookies, brute-force protection, and password reset is meaningfully more
  risk for no real benefit over a first-party, already-audited provider.

### Decision 2: RLS (`auth.uid()`-keyed) becomes the real tenant boundary, not just app-level filtering

Today's data layer would normally just grow a `householdId` parameter and
an `.eq("household_id", householdId)` on every query, keeping the existing
service-role client. That's the simplest diff, but it provides **no
database-level backstop**: the service-role key bypasses RLS entirely, so
a single forgotten filter in any one of `lib/data/*.ts`'s ~20 query sites
silently leaks every household's rows through that one code path, and nothing
in Postgres would stop it.

Instead: introduce RLS policies on every domain table keyed on the
household resolved from `auth.uid()`, and switch `lib/data/*.ts` to run
household-scoped queries through a **session-scoped Supabase client**
(anon key + the signed-in user's access token) instead of the service-role
client. With this client, Postgres enforces `household_id` matching via
RLS regardless of what the application code does — a missing `.eq()` in
application code degrades to "RLS silently returns zero rows for the
un-owned rows," not "returns another household's data."

```sql
-- Example shape (see Migration Plan for the full policy set)
create policy "select own household tasks" on tasks
  for select using (
    household_id = (select id from household where user_id = auth.uid())
  );
-- ...and matching insert/update/delete policies per table.
```

The service-role client (`lib/supabase/server-client.ts`) is kept, but its
use shrinks to nothing in the request path after this change — every
runtime read/write a household performs on its own data goes through the
new session-scoped client. It remains available only for one-off
maintenance/migration scripts run by hand (same pattern as
`supabase/migration_v2.sql`), never imported by application code that
serves a request.

Application code still explicitly passes/filters by `householdId` (it's
needed for `insert` statements' payload, and it keeps intent obvious when
reading the code) — RLS is the enforcement backstop, not a replacement for
readable code.

**Alternatives considered:**
- *App-level filtering only, keep the service-role client*: simplest to
  write, but as above, the service-role key bypassing RLS means a single
  missed filter anywhere is a full cross-tenant data leak with no
  second line of defense. Rejected given this is now a public multi-tenant
  product, not an internal tool.
- *Add RLS policies but keep using the service-role client "for
  simplicity, policies as documentation"*: rejected — policies that are
  never actually enforced (because the querying role bypasses them) are
  worse than no policies, since they create false confidence.

### Decision 3: `household` schema — one row per tenant, linked 1:1 to `auth.users`

```sql
create table household (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'Nuestro hogar',
  action_password_hash text not null
);
```

- `user_id` is `unique` — exactly one household per Supabase Auth user
  (matches the non-goal of multiple logins per household).
- `action_password_hash` is set at sign-up time (the sign-up form collects
  email, account password, and a separate "clave de acciones" used for
  gating — see Decision 4) so it's never null/unset; this preserves today's
  fail-closed behavior (`verifySecurityPassword` returns `false` if
  nothing is configured) without needing a nullable transitional state in
  the steady state.
- Every other domain table gains `household_id uuid not null references
  household(id) on delete cascade`, and every unique constraint that
  assumed a single household becomes composite:
  `members(household_id, name)` unique, `tasks(household_id, name)`
  unique (both replacing today's bare `unique` on `name`).

### Decision 4: hash the action password with Node's built-in `scrypt`, no new dependency

`lib/security/password.ts` changes from comparing against
`process.env.SECURITY_PASSWORD` to looking up the signed-in household's
`action_password_hash` and verifying with a KDF. Use Node's built-in
`node:crypto` `scrypt` (random 16-byte salt per household, stored as
`salt:hash` hex, timing-safe compare via `crypto.timingSafeEqual`) instead
of adding `bcrypt`/`bcryptjs` as a dependency — `scrypt` is a
well-regarded, memory-hard KDF and ships in Node with zero extra install,
consistent with this project's generally lean `package.json`.

```
hash(password, salt=randomBytes(16)) -> scryptSync(password, salt, 64)
store: `${salt.toString("hex")}:${derivedKey.toString("hex")}`
verify(password, stored): split stored, scryptSync(password, salt, 64),
  timingSafeEqual(candidate, storedKey)
```

A new "Cambiar clave de acciones" action in Ajustes re-hashes and replaces
`action_password_hash`, requiring the current action password to confirm
(same UX shape as today's password-confirm dialogs).

**Note:** this only concerns the *action* password (gates sorteo/reset/
reassign). The household's *account* password (used to sign in) is handled
entirely by Supabase Auth and is never touched by this project's code —
Supabase already hashes and stores it.

### Decision 5: session → household resolution

A single server-only helper, `getCurrentHousehold()` (in a new
`lib/auth/session.ts`), wraps `React.cache()` (same pattern as
`lib/data/members.ts`'s `listMembers`) so it resolves once per request: it
reads the session via the server Supabase client, then selects the
`household` row where `user_id = session.user.id`. Every page
(`app/page.tsx`, `app/semana/page.tsx`, etc.) and every Server Action calls
this first and uses its `householdId` explicitly when calling into
`lib/data/*.ts` — the dependency stays visible at each call site instead of
being buried as ambient global state.

`middleware.ts` handles the coarse guard (redirect to `/login` if no
session at all, for every route except `/login` and `/signup`); pages/
actions still call `getCurrentHousehold()` themselves for the actual
household id, since middleware can't easily short-circuit into arbitrary
data lookups without adding a DB round-trip to every single request
including static assets.

### Algorithm impact: none

`lib/algorithm/schedule.ts` does not change — it already takes members,
tasks, and conflicts as plain arrays with no notion of household. Only
`generateWeekAction` (in `app/ajustes/actions.ts`) changes: it fetches
those arrays already scoped to the signed-in household (via the
session-scoped client) and inserts the result rows with that household's
`household_id`, exactly as it fetches them unscoped today.

### Credential exposure check

No credential is exposed to the client by this design: the service-role
key's usage only shrinks (maintenance scripts only); the anon key moves
from "unused, present in `.env.example`" to "used server-side only, inside
Server Actions and `middleware.ts`," never in a `"use client"` file and
never prefixed `NEXT_PUBLIC_`. `SECURITY_PASSWORD` is removed entirely
(replaced by the per-household hashed column). No new env var needs
`NEXT_PUBLIC_`.

## Risks / Trade-offs

- **[Risk]** A future query in `lib/data/*.ts` forgets to scope by
  household → **Mitigation**: RLS (Decision 2) makes this fail safe
  (returns nothing) instead of leaking; add an integration test that seeds
  two households and asserts every `lib/data/*.ts` read/write is isolated.
- **[Risk]** Migrating the one real household is a one-shot, hand-run
  operation against production data → **Mitigation**: take a Supabase
  backup (Dashboard → Database → Backups, or `pg_dump`) immediately before
  running the migration; wrap the migration in a transaction (matching
  `migration_v2.sql`'s existing `begin;/commit;` convention).
- **[Risk]** The action password (short, human-memorable) is guessable by
  brute force with no rate limiting → **Mitigation**: out of scope for this
  change to fully solve, but flagged as an Open Question below; at minimum
  keep it separate from the account password so a leaked action password
  never grants sign-in access.
- **[Risk]** Introducing `middleware.ts` session refresh adds a Supabase
  Auth round-trip to every request → **Mitigation**: accepted cost,
  standard for this auth pattern; Supabase Auth's `getUser()` validates the
  JWT locally when possible and only round-trips on refresh.

## Migration Plan

1. In Supabase Dashboard, enable the email/password Auth provider (on by
   default) and manually create the Auth user for the one real household
   (using the email its owner provides), noting the resulting `user_id`.
2. Take a full backup (Dashboard → Backups or `pg_dump`) before touching
   anything.
3. Write `supabase/migration_v3_multi_tenant.sql` (hand-run, transactional,
   following `migration_v2.sql`'s style) that:
   - Alters `household`: adds `user_id` (backfilled with the `user_id` from
     step 1) and `action_password_hash` (backfilled by hashing the current
     `SECURITY_PASSWORD` value with the Decision 4 scheme, so the one real
     household keeps its existing action password); converts `id` from
     `smallint` to `uuid` (generate a new uuid for the existing row, update
     it in place — trivial with exactly one row) and adjusts any assumed
     `id = 1` references.
   - Adds `household_id uuid not null references household(id) on delete
     cascade` to `members`, `tasks`, `task_eligible_members` (via `tasks`/
     `members`'s own household — or directly, for query simplicity),
     `task_conflicts`, `assignments`; backfills every existing row with the
     one household's new id (a single `update ... set household_id =
     '<uuid>'` per table, since only one household's data exists).
   - Replaces `members_name_key`/`tasks_name_key` with composite unique
     constraints including `household_id`.
   - Adds the RLS policies from Decision 2 to every table.
4. Update `supabase/schema.sql` to the new target shape (fresh-install
   source of truth, same convention as the v1→v2 migration).
5. Ship the application code (auth pages, `middleware.ts`,
   `getCurrentHousehold()`, updated `lib/data/*.ts` and
   `lib/security/password.ts`, sign-up/login/logout UI, "cambiar clave de
   acciones" in Ajustes).
6. Remove `SECURITY_PASSWORD` from Vercel's environment variables and from
   `.env.example` only after confirming the DB-backed action password works
   end-to-end in production.
7. **Rollback**: redeploy the previous release and restore the pre-
   migration backup if anything is found broken — there is no automated
   rollback tooling in this project beyond standard Vercel/Supabase
   mechanisms.

## Open Questions

- ~~Should Supabase's email-confirmation-required setting be turned on for
  sign-up, or disabled for lower friction given the small expected initial
  user base?~~ **Resolved during implementation**: disabled. `signUpAction`
  needs an active session immediately after `signUp()` to create the
  `household` row (its RLS policy requires an authenticated request), so
  "Confirm email" must be OFF in the Supabase project's Auth settings — if
  it's left ON, sign-up still creates the Auth user but returns an error
  asking the visitor to confirm and sign in, and no household is created,
  which would need a follow-up "provision household on first confirmed
  sign-in" flow if this default is ever revisited.
- Should there be any rate-limiting/lockout on repeated wrong action-
  password or sign-in attempts? Not designed here; flagged as a likely
  fast-follow rather than blocking this change.
- Should "cambiar clave de acciones" require re-entering the current
  action password to confirm (recommended default), or just the account
  password? Assumed: current action password, to be confirmed during
  `tasks`/implementation if it turns out to be worse UX.
