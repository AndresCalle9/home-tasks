## 1. Project Scaffold

- [x] 1.1 Initialize the Next.js project (App Router, TypeScript, npm) at the
      repo root, without touching `openspec/`, `supabase/`, `.env*`, or
      `CLAUDE.md`.
- [x] 1.2 Install and configure Tailwind CSS.
- [x] 1.3 Initialize shadcn/ui and add the primitives needed for this change
      (button, nav/tabs link, card).
- [x] 1.4 Set base app metadata (title "Home Tasks", `lang="es"`).

## 2. Shared Layout & Navigation

- [x] 2.1 Create the root layout with global styles and `lang="es"`.
- [x] 2.2 Build a top navigation component with two tabs, **Calendario** and
      **Configuración**, linking to `/calendario` and `/configuracion` and
      highlighting the active route.
- [x] 2.3 Make `/` redirect to `/calendario`.
- [x] 2.4 Apply the `frontend-design` skill to settle on the visual direction
      (typography, spacing, color) for a minimalist, modern look.

## 3. Mock Data Layer

- [x] 3.1 Create `lib/mock-data.ts` with `Member`, `Task`, and `Assignment`
      types mirroring the columns in `supabase/schema.sql`.
- [x] 3.2 Seed the mock `members` and `tasks` arrays with the real household
      data (Lizeth, Yuliet, Andres, Maria Jose, Antonia) and the task catalog
      from `supabase/seed.sql`.
- [x] 3.3 Hand-craft a static mock weekly `assignments` array (Monday-Sunday)
      for the calendar to render — no algorithm, just representative data.

## 4. Calendario Tab (UI)

- [x] 4.1 Build the `/calendario` page as a Server Component rendering the
      seven-day grid from the mock assignments.
- [x] 4.2 Build a day-cell/task-card component showing task name + responsible
      member.
- [x] 4.3 Add the "Asignar tareas" button as a non-functional placeholder
      (disabled state, or opens an empty modal) — no click handler performs
      real assignment logic or calls any API.
- [x] 4.4 Verify with the `vercel-react-best-practices` skill (correct
      Server/Client component boundaries, no unnecessary `"use client"`).

## 5. Configuración Tab (UI)

- [x] 5.1 Build the `/configuracion` page as a Server Component rendering the
      read-only members list (name, age) from mock data.
- [x] 5.2 Render the read-only tasks list (name, daily/once-per-period, fixed
      status + assigned member if fixed) from mock data.
- [x] 5.3 Verify with the `vercel-react-best-practices` skill.

## 6. Verification

- [x] 6.1 Run `npm run build` and `npm run lint` to confirm the scaffold
      builds cleanly.
- [x] 6.2 Manually check both tabs with `npm run dev`: the calendar grid shows
      the mock week, the config lists show mock members/tasks, nav highlights
      the active tab, and the "Asignar tareas" button performs no real action.
- [x] 6.3 Confirm no Supabase client, env var usage, or API route was
      introduced in this change.
