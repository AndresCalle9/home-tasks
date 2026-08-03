## Context

`app/calendario/page.tsx` renders `getWeekSchedule()` (from `lib/mock-data.ts`)
into a CSS grid of `DayColumn` components, each a plain list of `TaskCard`s
(task name + responsible member, in day order). The user wants a vertical
accordion of 7 days instead, collapsed to just the day name by default, one
open at a time, and — the actual product win here — content grouped by
**person** instead of by task when a day is open.

## Goals / Non-Goals

**Goals:**
- Single-open accordion, Monday→Sunday, collapsed-by-default, only the day
  name visible when collapsed.
- Expanded day content grouped by person (each responsible member as a
  heading, their tasks listed under it), not a flat task list.
- Keep the existing "fridge chore chart" visual system (palette, per-person
  color tagging, Fredoka/Karla) — this changes structure, not the design
  language.

**Non-Goals:**
- No changes to `lib/mock-data.ts`'s data shape, to Supabase, or to
  Configuración.
- No multi-open accordion mode (explicitly rejected in favor of single-open).
- No collapsed-state preview (avatars/counts) — collapsed rows show only the
  day name, per explicit decision.

## Decisions

1. **Use shadcn/ui's `accordion` primitive** (new, add via
   `npx shadcn add accordion`) instead of hand-rolling open/close state.
   It's built on the same `@base-ui/react` family already used throughout
   this project, gives single-open (`type="single" collapsible`) for free,
   and handles keyboard nav / ARIA correctly.
   *Alternative considered*: a plain `useState<number | null>` for "which
   day index is open" with manual conditional rendering. Rejected — more
   code for a worse a11y result than the primitive already installed.

2. **The accordion is a Client Component; the page stays a Server
   Component.** `app/calendario/page.tsx` still computes
   `getWeekSchedule()` server-side and passes the plain data down as props
   to a new `components/calendar-accordion.tsx` (`"use client"`), which
   owns the open/close state. This keeps `lib/mock-data.ts` access
   server-side and the client bundle limited to the interactive shell.

3. **New grouping helper, additive to `lib/mock-data.ts`**:
   `getPersonGroupsForDay(day: DaySchedule): { member: Member; items: Array<{ task: Task; isFixed: boolean }> }[]`,
   grouping `day.items` by `member.id` and ordering groups by each member's
   position in the `members` array (same order used for person-color
   assignment, so the accordion's grouping order matches the color legend
   elsewhere). This is additive — `getWeekSchedule()` and its existing
   return shape are untouched, so nothing else that reads it breaks.

4. **`components/task-card.tsx` is replaced by two smaller pieces**: a
   `components/person-task-group.tsx` (person heading: avatar + name in
   their tagging color) and a plain per-task line underneath (task name +
   "Fija" badge when applicable) — the avatar/name no longer needs to repeat
   per task now that a person heading exists. `day-column.tsx` is removed;
   its job (rendering one day's content) moves into the accordion item.

## Risks / Trade-offs

- **Losing the whole-week-at-a-glance overview** the grid gave for free →
  Mitigation: the collapsed accordion still shows all 7 day names in order,
  so the weekly structure is still visible; only per-day detail requires a
  click, which is the explicit trade-off requested.
- **Single-open means no side-by-side day comparison** → Accepted
  trade-off, explicitly chosen over independent multi-open.
