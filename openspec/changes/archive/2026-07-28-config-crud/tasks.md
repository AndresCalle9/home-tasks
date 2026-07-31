## 1. Supabase client & data-access layer

- [x] 1.1 Install `@supabase/supabase-js`.
- [x] 1.2 Create `lib/supabase/server-client.ts`: a module-level Supabase
      client built from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (no
      `"use client"`, never re-exported to a client component).
- [x] 1.3 Create `lib/data/members.ts`: `listMembers`, `createMember`,
      `updateMember`, `deleteMember`, each returning `{ error: string } | { ok: true, ... }`
      and mapping Postgres error codes 23505 (duplicate name) / 23503
      (still referenced by a task) / 23514 (invalid age) to Spanish
      messages per design.md Decision 4.
- [x] 1.4 Create `lib/data/tasks.ts`: `listTasks`, `createTask`,
      `updateTask`, `deleteTask`, with the same error-mapping approach
      (23505 duplicate name, 23514 fixed-task-without-member/invalid
      weight).

## 2. Server Actions

- [x] 2.1 Create `app/configuracion/actions.ts` (`"use server"`) with
      `createMemberAction`, `updateMemberAction`, `deleteMemberAction`,
      `createTaskAction`, `updateTaskAction`, `deleteTaskAction`. Each
      validates its own inputs (required name, age/weight are valid
      numbers, fixed task has a member) before calling the data-access
      layer, then calls `revalidatePath("/configuracion")` on success.

## 3. New shadcn/ui primitives

- [x] 3.1 Add `input`, `label`, `select`, `switch`, and `alert-dialog` via
      `npx shadcn@latest add`.

## 4. UI: Members CRUD

- [x] 4.1 Build `components/member-form-dialog.tsx` (client component):
      one dialog reused for create and edit, name + age fields, driven by
      `useActionState` over the matching Server Action, showing the
      action's error inline and closing itself on success.
- [x] 4.2 Build `components/delete-confirm-dialog.tsx` (client component,
      generic enough to reuse for tasks too): an `alert-dialog` that calls
      a passed-in delete action and shows its error inline instead of
      closing on failure.
- [x] 4.3 Update `components/member-chip.tsx` (or wrap it) to add edit and
      delete triggers per member row.
- [x] 4.4 Update `app/configuracion/page.tsx` to read members via
      `listMembers()` instead of `lib/mock-data.ts`, and add a "Nuevo
      integrante" button opening the create dialog.
- [x] 4.5 Verify with the `vercel-react-best-practices` skill (Server
      Component page, minimal client boundary limited to the dialogs).

## 5. UI: Tasks CRUD

- [x] 5.1 Build `components/task-form-dialog.tsx` (client component): name,
      "es diaria" switch, "es fija" switch that reveals a required member
      `select` when on, optional "peso" number input (default 1), driven
      by `useActionState` over the matching Server Action.
- [x] 5.2 Update `components/task-row.tsx` to add edit and delete triggers
      per task row (reusing `delete-confirm-dialog.tsx` from 4.2).
- [x] 5.3 Update `app/configuracion/page.tsx` to read tasks via
      `listTasks()` instead of `lib/mock-data.ts`, and add a "Nueva tarea"
      button opening the create dialog.
- [x] 5.4 Verify with the `vercel-react-best-practices` skill.

## 6. Verification

- [x] 6.1 Run `npm run build` and `npm run lint`.
- [x] 6.2 Manually check with `npm run dev` against the real Supabase
      project: create, edit, and delete a member; create, edit, and delete
      a task; trigger a duplicate-name error on both; trigger the
      fixed-task-without-member error; trigger the delete-blocked error by
      attempting to delete a member set as a task's fixed responsible
      person.
- [x] 6.3 Confirm `app/calendario`, `components/day-column.tsx`,
      `components/task-card.tsx`, and `lib/mock-data.ts`'s `assignments`
      export were not modified.
- [x] 6.4 Grep the diff for `SUPABASE_SERVICE_ROLE_KEY` and confirm it only
      appears in `lib/supabase/server-client.ts` and `.env`/`.env.example`.
