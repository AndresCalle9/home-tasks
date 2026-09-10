## 1. Dependencies & Supabase project setup

- [x] 1.1 Add `@supabase/ssr` to `package.json` (no other new runtime
      dependencies needed — hashing uses Node's built-in `node:crypto`).
- [x] 1.2 Done manually by the user in the Supabase dashboard: email/
      password Auth provider confirmed enabled, "Confirm email" turned
      OFF under Authentication → Providers → Email.
- [x] 1.3 Add `SUPABASE_ANON_KEY` usage docs to `.env.example` (the var
      already exists but is unused): document that it is now used
      server-side only, for Supabase Auth session handling — never
      `NEXT_PUBLIC_`, never imported by a `"use client"` file. Remove the
      `SECURITY_PASSWORD` entry entirely (see Task 10.2 for the removal
      timing).

## 2. Schema & migration

- [x] 2.1 Write `supabase/migration_v3_multi_tenant.sql` (hand-run,
      transactional, following `migration_v2.sql`'s `begin;/commit;`
      style) per design.md's Migration Plan: alter `household` (add
      `user_id uuid not null unique references auth.users(id) on delete
      cascade`, add `action_password_hash text not null`, convert `id`
      from `smallint` to `uuid`); add `household_id uuid not null
      references household(id) on delete cascade` to `members`, `tasks`,
      `task_eligible_members`, `task_conflicts`, `assignments`; backfill
      every existing row with the one real household's new id; replace
      `members`/`tasks`'s bare `unique(name)` with composite
      `unique(household_id, name)`.
- [x] 2.2 In the same migration, add the RLS policies from design.md's
      Decision 2 to every table (`household`, `members`, `tasks`,
      `task_eligible_members`, `task_conflicts`, `assignments`): select/
      insert/update/delete scoped via a `household_id_for_current_user()`
      helper function (and, for `household` itself, scoped to
      `user_id = auth.uid()`).
- [x] 2.3 Update `supabase/schema.sql` to the new target shape (fresh-
      install source of truth): `household` with `id uuid`, `user_id`,
      `action_password_hash`; `household_id` + composite unique
      constraints on the domain tables; the RLS policies from 2.2.
- [x] 2.4 Update `supabase/seed.sql` to seed a `household` row (with
      placeholders the operator fills in: a real Auth user id, and a
      hash of the chosen action password) and tag every seeded row with
      that household's id.
- [x] 2.5 Migration SQL and step-by-step instructions are written and
      embedded as comments at the top of `migration_v3_multi_tenant.sql`
      (backup first, disable email confirmation, create the Auth user,
      hash the existing action password) — **running it against the real
      Supabase project remains a manual step for the user**, same
      established pattern as `migration_v2.sql`; this environment has no
      Supabase project access to run it directly.

## 3. Auth infrastructure (server-only)

- [x] 3.1 Create `lib/supabase/server-auth-client.ts`: builds a
      `@supabase/ssr` `createServerClient` using `SUPABASE_URL` +
      `SUPABASE_ANON_KEY` and the Next.js `cookies()` adapter, for use in
      Server Actions and Server Components (read-only cookie access in the
      latter).
- [x] 3.2 Create `middleware.ts` at the repo root: runs
      `supabase.auth.getUser()` via the SSR client on every request to
      refresh/persist the session cookie, and redirects unauthenticated
      requests for any path other than `/login` and `/signup` to
      `/login`.
- [x] 3.3 Create `lib/auth/session.ts` with `getCurrentHousehold()`
      (wrapped in `React.cache()`, matching `lib/data/members.ts`'s
      pattern): reads the session via 3.1's client, selects the
      `household` row where `user_id = session.user.id`, and returns
      `{ id, name }` — throws/redirects if no session or no matching
      household.
- [x] 3.4 **Consolidated into 3.1 during implementation**: `@supabase/ssr`'s
      `createServerClient` already carries the signed-in user's access
      token on every request it makes — including `.from()` table
      queries, not just `.auth.*` calls — once the session cookie is
      present. A second, separately-built client adding the same token
      manually would have been redundant, so `lib/data/*.ts` (Task 5) uses
      `createServerAuthClient()` directly for RLS-enforced household
      queries; there is no separate `session-client.ts` file.

## 4. Security: per-household action password

- [x] 4.1 Rewrite `lib/security/password.ts`: replace the
      `process.env.SECURITY_PASSWORD` comparison with
      `hashActionPassword(password): string` and
      `verifyActionPassword(password, storedHash): boolean`, implemented
      with `node:crypto`'s `scrypt`/`scryptSync` (random 16-byte salt per
      hash, stored as `salt:hash` hex, compared with
      `crypto.timingSafeEqual`) per design.md's Decision 4.
- [x] 4.2 Add `changeActionPassword(householdId, currentPassword,
      newPassword)` to `lib/data/household.ts`: verifies
      `currentPassword` against the stored hash before replacing it: reuse
      the `mapDbError`-style `MutationResult` return shape used elsewhere
      in `lib/data/*.ts`. Also added `verifyHouseholdActionPassword`
      (shared by every gated action) and `createHousehold` (sign-up).

## 5. Data layer: household scoping

- [x] 5.1 Update `lib/data/household.ts`: `updateHouseholdName` takes the
      resolved household id (from `getCurrentHousehold()`) instead of the
      hardcoded `id = 1`, and uses `createServerAuthClient()`.
      **Adjusted from the original task**: dropped a separate
      `getHouseholdName` — every caller already has `{ id, name }` from
      `getCurrentHousehold()`, so a second read was redundant.
- [x] 5.2 Update `lib/data/members.ts`: `listMembers`, `createMember`,
      `renameMember`, `deleteMember` all take/scope by `householdId` and
      use the session-scoped client; `createMember`'s insert includes
      `household_id`.
- [x] 5.3 Update `lib/data/tasks.ts`: `listTasks`, `listTaskConflicts`,
      `createTask`, `updateTask`, `setTaskActive`, `deleteTask`,
      `toggleTaskEligibility` all take/scope by `householdId` and use the
      session-scoped client; inserts include `household_id` (including on
      `task_eligible_members`, which also carries its own `household_id`
      column per design.md's Decision 2/Migration Plan).
- [x] 5.4 Update `lib/data/assignments.ts`: `listAssignments`,
      `replaceWeek`, `resetWeekStatuses`, `setCompletion`,
      `reassignMember`, `swapAssignmentMembers` all take/scope by
      `householdId` and use the session-scoped client; `replaceWeek`'s
      insert includes `household_id` per row.
- [x] 5.5 Confirmed `lib/supabase/server-client.ts` (service-role client)
      is no longer imported by any file under `app/` or `lib/data/`
      (`grep -rl "supabase/server-client" app lib components` returns
      nothing) — it remains in place only for hand-run maintenance
      scripts.

## 6. Server actions: wire household id + new password check

- [x] 6.1 Update `app/actions.ts` (`toggleCompleteAction`,
      `reassignMemberAction`, `resolveDuelAction`): call
      `getCurrentHousehold()` first and pass its id into the `lib/data/*`
      calls; `reassignMemberAction` verifies the password via
      `verifyHouseholdActionPassword` against that household's stored hash
      instead of `verifySecurityPassword`.
- [x] 6.2 Update `app/equipo/actions.ts` and `app/ajustes/actions.ts`
      analogously: every action resolves `getCurrentHousehold()` first and
      threads `householdId` through; `generateWeekAction` and
      `resetWeekAction` verify against the household's stored action
      password.
- [x] 6.3 Add `changeActionPasswordAction` to `app/ajustes/actions.ts`,
      calling `changeActionPassword` from Task 4.2.
- [x] 6.4 Create `app/(auth)/actions.ts` with `signUpAction`,
      `signInAction`, `signOutAction`: use the Task 3.1 server client for
      Supabase Auth calls, and (for sign-up) insert the new `household` row
      with a hashed action password via Task 4.1's `hashActionPassword`.

## 7. UI: sign-up / sign-in / sign-out

- [x] 7.1 Applied the `vercel-react-best-practices` skill before creating
      any of the components/pages in this section.
- [x] 7.2 Create `app/(auth)/login/page.tsx` and
      `components/login-view.tsx`: email + account password form wired to
      `signInAction` via `useActionState`, matching this codebase's
      existing form patterns (e.g. `components/ajustes-view.tsx`).
- [x] 7.3 Create `app/(auth)/signup/page.tsx` and
      `components/signup-view.tsx`: email + account password + action
      password form wired to `signUpAction`.
- [x] 7.4 Add a "Cerrar sesión" control to `components/ajustes-view.tsx`,
      wired to `signOutAction`.
- [x] 7.5 Add a "Cambiar clave de acciones" control to
      `components/ajustes-view.tsx` (current password + new password),
      wired to `changeActionPasswordAction` from Task 6.3.

## 8. Wire the auth guard into existing pages

- [x] 8.1 **Adjusted from the original task**: moved the four pages into a
      new `app/(app)/` route group (`app/(app)/page.tsx`,
      `app/(app)/semana/page.tsx`, `app/(app)/equipo/page.tsx`,
      `app/(app)/ajustes/page.tsx`) so a dedicated `app/(app)/layout.tsx`
      can own the guarded shell (member fetch, `CurrentMemberProvider`,
      `BottomNav`) separately from the new `app/(auth)/layout.tsx` (no
      bottom nav) — the root `app/layout.tsx` now only holds the font/
      `ToastProvider`. Each page calls `getCurrentHousehold()` first and
      passes the resolved `householdId`/`householdName` into the
      corresponding `lib/data/*` calls.
- [x] 8.2 Confirmed `middleware.ts`'s matcher covers every path except
      `_next/static`, `_next/image`, `favicon.ico`, and common image
      extensions, and explicitly exempts `/login` and `/signup` from the
      redirect-to-login check (and redirects an already-signed-in visitor
      away from those two back to `/`).

## 9. Tests

- [x] 9.1 **Adjusted from the original task**: this environment has no
      reachable Supabase project, so the two-household RLS-enforcement
      test described in the task (seeding real rows and hitting live
      Postgres policies) can't run here — that verification is deferred
      to Task 11.2 against the real migrated project. Instead, added
      `lib/data/members.test.ts`, `lib/data/tasks.test.ts`, and
      `lib/data/assignments.test.ts` (plus a shared
      `lib/data/test-utils/mock-supabase-client.ts` fake query builder)
      asserting the *application-level* `household_id` scoping —
      confirms every read/write in the data layer still passes the
      right filter/tag, the defense-in-depth layer described in
      design.md's Decision 2. Also added a `resolve.alias` for `@/*` to
      `vitest.config.mts`, which had none (only relative-path test
      imports existed before this change).
- [x] 9.2 Add unit tests for `lib/security/password.ts`'s
      `hashActionPassword`/`verifyActionPassword`: correct password
      verifies, wrong password fails, two hashes of the same password
      differ (distinct salts), malformed/missing hash fails closed.
- [x] 9.3 Confirmed `lib/algorithm/schedule.test.ts` needs no changes (the
      algorithm itself has no household concept, per design.md) — full
      `vitest run` passes (23/23, across all 6 test files including this
      one, unmodified).

## 10. Docs & env cleanup

- [x] 10.1 Update `CLAUDE.md` and `openspec/config.yaml`'s `context` to
      describe the multi-tenant model (household accounts, `household_id`
      on every domain table, per-household action password) instead of
      "un solo hogar, sin cuentas."
- [x] 10.2 Removed `SECURITY_PASSWORD` from `.env.example` (Task 1.3).
      **Requires manual action, not doable from this environment**:
      removing it from Vercel's project environment variables — do this
      only after confirming in production that the DB-backed action
      password works end-to-end (Task 11.1).
- [x] 10.3 Ran `grep -rn "SECURITY_PASSWORD\|verifySecurityPassword"`
      (excluding `openspec/changes/archive/`): zero references left in
      `app/`, `lib/`, or `components/` — every remaining hit is either
      this change's own planning artifacts (proposal/design/tasks, where
      it's expected) or the migration SQL's comments (intentionally
      referencing the old env var so the operator knows which value to
      re-hash).

## 11. Verification against real Supabase

- [x] 11.1 Done manually by the user: ran the migration against the real
      Supabase project, signed in as the migrated household, confirmed its
      members/tasks/current week are intact, ran the sorteo with the
      migrated action password, and confirmed "cambiar clave de acciones"
      works.
- [x] 11.2 Done manually by the user: created a second, brand-new
      household via sign-up, confirmed it starts empty, and confirmed
      neither household can see or affect the other's data — the real
      end-to-end confirmation that RLS (not just the app-level filters
      tested in Task 9.1) actually isolates households.
- [x] 11.3 Ran `grep -rl "SUPABASE_SERVICE_ROLE_KEY\|SUPABASE_ANON_KEY"
      .next/static/` after a production build (`npm run build`, after
      renaming `middleware.ts` to `proxy.ts` per Next.js 16's current file
      convention — the old name/export triggered a deprecation warning
      during the build) — no matches for either variable name, and none
      for the actual secret values read from `.env` either. Full
      `npx tsc --noEmit` and `npx eslint .` also both pass clean.
