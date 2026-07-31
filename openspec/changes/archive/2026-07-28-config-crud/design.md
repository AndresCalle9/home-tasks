## Context

`app/configuracion/page.tsx` (change `ui-shell-mockup`, archived) currently
reads `members` and `tasks` from `lib/mock-data.ts` and renders read-only
lists. The real tables already exist in Supabase (`supabase/schema.sql`,
already applied to the project's database):

- `members(id uuid pk, name text unique not null, age smallint not null check (age >= 0), created_at)`
- `tasks(id uuid pk, name text unique not null, is_daily boolean, weight numeric default 1, default_is_fixed boolean, default_fixed_member_id uuid references members(id), created_at)`
  with `check (default_is_fixed = false or default_fixed_member_id is not null)`.

Both tables have RLS enabled with **no policies** — only a client created
with the `service_role` key can read/write them (see `CLAUDE.md` §Seguridad).
No schema changes are needed for this change.

## Goals / Non-Goals

**Goals:**
- Configuración reads and writes real rows in `members` and `tasks`.
- Create/edit/delete for both, with the same fields already modeled in
  `supabase/schema.sql` (including `weight`, currently unused by the UI).
- Friendly, in-place error messages for constraint violations (duplicate
  name, invalid age, fixed task without a member, deleting a member/task
  still referenced elsewhere).
- Zero client-side exposure of the service role key.

**Non-Goals:**
- The assignment algorithm, `periods`, `period_task_settings`, or
  `assignments` tables — untouched.
- `app/calendario` and its components — stay on `lib/mock-data.ts` until the
  algorithm change lands.
- Auth/login, multi-hogar.
- A form-library dependency (react-hook-form, zod) — native `<form>` +
  Server Actions is enough for forms this small.

## Decisions

1. **Supabase access confined to a server-only module.**
   `lib/supabase/server-client.ts` exports a single module-level
   `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` instance. The file
   has no `"use client"` directive and is never imported by a client
   component — only by the data-access functions below and by Server
   Actions. This is the only place the service role key is read from
   `process.env`.

   *Alternative considered*: a Route Handler (`app/api/...`) calling
   Supabase instead of Server Actions. Rejected — Server Actions avoid
   hand-rolling request parsing/response shaping for simple form mutations,
   and CLAUDE.md already frames "capa de API de Next.js" broadly enough to
   include them.

2. **Thin data-access layer, one file per table.**
   `lib/data/members.ts` and `lib/data/tasks.ts` export plain async
   functions (`listMembers`, `createMember`, `updateMember`, `deleteMember`,
   and the `tasks` equivalents) that wrap Supabase calls and translate
   Postgres error codes into typed results (see #4). Server Components call
   `list*` directly; Server Actions call the mutation functions.

3. **Server Actions co-located at `app/configuracion/actions.ts`
   (`"use server"`), invoked via `useActionState`.**
   Each dialog/form is a small Client Component that imports the relevant
   action and drives it with React 19's `useActionState`, so pending/error
   state comes from the framework instead of hand-rolled `useState` +
   `fetch`. On success the action calls `revalidatePath("/configuracion")`;
   the dialog closes itself once the action reports success.

   *Alternative considered*: a single generic `mutateMember`/`mutateTask`
   action handling create+update+delete by a `mode` field. Rejected — one
   action per operation keeps each Server Action's input shape simple and
   avoids a `switch` that would need its own validation branching.

4. **Error mapping: DB constraint violations → Spanish, actionable
   messages, not a crash.** The data-access layer inspects the Postgres
   error code returned by `@supabase/supabase-js`:
   - `23505` (unique violation on `name`) → "Ya existe un/a {integrante|tarea}
     con ese nombre."
   - `23503` (foreign key violation — e.g. deleting a member who is set as
     `default_fixed_member_id` on a task) → "No se puede eliminar: sigue
     asignado/a como responsable fijo de una tarea. Reasígnala primero."
   - `23514` (check violation — negative age, fixed task without member) →
     surfaced as the specific field message; also validated client-side
     first so this path is a backstop, not the primary UX.
   Every Server Action returns `{ error: string } | { ok: true }` rather
   than throwing, so the dialog can render the message inline.

5. **`weight` (peso) is included in the task form** as an optional numeric
   input defaulting to `1`, since the column already exists in the schema
   and is otherwise permanently stuck at its default with no way to adjust
   it. `is_daily` and `default_is_fixed` are switches; when
   `default_is_fixed` is on, a member `select` becomes required (mirrors
   the DB check constraint).

6. **New shadcn/ui primitives**: `input`, `label`, `select`, `switch`,
   `alert-dialog` (delete confirmation). No `form` (react-hook-form)
   component — plain native forms.

## Risks / Trade-offs

- **Deleting a referenced member/task fails at the DB level** (FK
  violation) → Mitigation: caught and surfaced as the specific message in
  Decision #4, instead of a raw 500.
- **Double-submit could race the unique constraint** → Mitigation: DB
  unique index is the real source of truth; the resulting `23505` is
  caught the same way as a normal validation error.
- **Service role key leaking into a client bundle by accident** →
  Mitigation: only `lib/supabase/server-client.ts` reads the env var, it
  has no `"use client"`, and nothing re-exports the client instance itself
  (only functions that use it internally are exported from
  `lib/data/*.ts`). No credential is ever passed as a prop or serialized to
  a Client Component.

## Migration Plan

No database migration needed — `members`/`tasks` already match this change's
needs. Steps: `npm install @supabase/supabase-js`; confirm `.env` already has
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (it does, from earlier setup);
implement and ship. Rollback is a plain revert (no destructive data
operations are part of this change).
