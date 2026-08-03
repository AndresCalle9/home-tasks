## 1. Data layer (mock)

- [x] 1.1 Add `getPersonGroupsForDay(day: DaySchedule)` to `lib/mock-data.ts`,
      grouping `day.items` by member and ordering groups by each member's
      position in the `members` array. Do not change `getWeekSchedule()` or
      any existing export's shape.

## 2. New shadcn/ui primitive

- [x] 2.1 Add the `accordion` component via `npx shadcn@latest add accordion`.

## 3. Visual direction

- [x] 3.1 Apply the `frontend-design` skill to art-direct the
      expand/collapse interaction (open/close motion, how a person heading
      + their task list looks) within the existing "fridge chore chart"
      palette and type system in `app/globals.css` — no new tokens unless
      the accordion genuinely needs one.

## 4. UI: accordion calendar

- [x] 4.1 Build `components/person-task-group.tsx`: renders one member's
      heading (avatar-color dot/initial + name) followed by their task
      line(s) for a day (task name + "Fija" badge when applicable).
- [x] 4.2 Build `components/calendar-accordion.tsx` (`"use client"`): single-
      open shadcn `Accordion`, one item per day (Monday–Sunday), collapsed
      trigger shows only the day name, expanded content renders
      `getPersonGroupsForDay(day)` via `PersonTaskGroup`.
- [x] 4.3 Update `app/calendario/page.tsx` to render `CalendarAccordion`
      instead of the 7-column grid of `DayColumn`s; keep computing
      `getWeekSchedule()` server-side and pass it down as a prop.
- [x] 4.4 Delete `components/day-column.tsx` and `components/task-card.tsx`
      (superseded by `calendar-accordion.tsx` / `person-task-group.tsx`).
- [x] 4.5 Verify with the `vercel-react-best-practices` skill (client
      boundary limited to `calendar-accordion.tsx`; page and data stay
      server-side).

## 5. Verification

- [x] 5.1 Run `npm run build` and `npm run lint`.
- [x] 5.2 Manually check with `npm run dev`: all 7 days render collapsed
      showing only their name; clicking a day expands it grouped by person;
      clicking a second day collapses the first and expands the new one;
      the "Asignar tareas" button and its placeholder dialog still work
      unchanged.
- [x] 5.3 Confirm `app/configuracion`, `lib/data/`, `lib/supabase/`, and
      `app/configuracion/actions.ts` were not touched.
