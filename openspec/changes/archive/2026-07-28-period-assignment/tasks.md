## 1. Migration

- [x] 1.1 Add `seed` to `periods` in `supabase/schema.sql`, and run the
      matching `alter table periods add column seed bigint not null
      default (...)` against the real Supabase project (guide the user
      through the SQL Editor, same as previous migrations).

## 2. Pure algorithm (data layer, no Supabase)

- [x] 2.1 Add `vitest` as a dev dependency and a minimal `npm run test`
      script (no other test infra exists yet).
- [x] 2.2 Create `lib/algorithm/rng.ts`: `mulberry32(seed)` seeded PRNG,
      `weightedPick(rng, items, weights)`, `pickDay(rng)`.
- [x] 2.3 Create `lib/algorithm/assign.ts`: `ageWeight(age)` (tiers per
      design.md), `assignPeriod(members, tasks, periodTaskSettings,
      historicalLoad, seed)` implementing the design.md pseudocode. Pure —
      no Supabase import, no `Date.now()`/`Math.random()`.
- [x] 2.4 Write `lib/algorithm/assign.test.ts`: same seed → identical
      result; fixed tasks never enter the lottery and don't affect
      `runningLoad`; a member with higher `historicalLoad` has a lower
      selection weight than one with less (assert on the computed weights,
      not statistical sampling); non-daily tasks always get a `dayOfWeek`
      in range, daily tasks always get `null`.

## 3. Data access

- [x] 3.1 Create `lib/data/periods.ts`: `createPeriod(startDate)` (validates
      Monday, creates the period + seeds `period_task_settings` from every
      task's `default_is_fixed`/`default_fixed_member_id`), `getCurrentPeriod()`
      (latest `status = 'assigned'`, or `null`), `listPeriodTaskSettings(periodId)`
      (joined with task name/isDaily for display), `updatePeriodTaskSettings(periodId, rows)`.
- [x] 3.2 Create `lib/data/assignments.ts`: `getHistoricalLoad(excludePeriodId)`,
      `runAssignment(periodId)` (loads inputs, calls `assignPeriod`, deletes
      then inserts that period's `assignments`, sets `status = 'assigned'`
      and the new `seed`), `rerollAssignment(periodId)` (same as
      `runAssignment` but period is already `assigned`), `listAssignmentsForPeriod(periodId)`
      joined with task/member, shaped into the same
      `{ dayOfWeek, dayName, items }[]` week structure `lib/mock-data.ts`
      used, plus a `getPersonGroupsForDay`-equivalent grouping helper.

## 4. Server Actions

- [x] 4.1 Create `app/calendario/asignar/actions.ts` (`"use server"`):
      `createPeriodAction` (validates Monday, creates period, returns
      periodId + the pre-filled review rows), `confirmAssignmentAction`
      (saves edited `period_task_settings`, calls `runAssignment`, then
      `redirect("/calendario")`).
- [x] 4.2 Create `app/calendario/actions.ts` (`"use server"`):
      `rerollAction(periodId)` calling `rerollAssignment` then
      `revalidatePath("/calendario")`.

## 5. UI: define-period + review wizard

- [x] 5.1 Build `app/calendario/asignar/page.tsx` step 1: a form with a
      native date input, client-side "must be a Monday" validation before
      submit, calling `createPeriodAction`.
- [x] 5.2 Build the step 2 review table (client component): one row per
      task (name, "es diaria" read-only badge, fixed/variable switch, member
      select shown when fixed), pre-filled from `createPeriodAction`'s
      result, "Confirmar y asignar" button calling `confirmAssignmentAction`.
- [x] 5.3 Wire the 2-step client-side state in `app/calendario/asignar/page.tsx`
      (step 1 result feeds step 2; no extra dynamic route needed).
- [x] 5.4 Verify with the `vercel-react-best-practices` skill.

## 6. Calendario: real data

- [x] 6.1 Update `lib/person-color.ts` usages in calendar components from
      the mock-keyed `personColorVar(memberId)` to `personColorVarByIndex(index)`
      against the real members list (same fix already applied to
      `member-chip.tsx`/`task-row.tsx` in `config-crud`).
- [x] 6.2 Update `components/calendar-accordion.tsx` and
      `components/person-task-group.tsx` to accept real `Member`/`Task`
      types (from `lib/data/members.ts` / `lib/data/tasks.ts`) instead of
      `lib/mock-data.ts`'s types.
- [x] 6.3 Replace `components/assign-button.tsx` (placeholder dialog) with a
      real "Asignar tareas" link to `/calendario/asignar`, plus a "Volver a
      sortear" button (calls `rerollAction`) shown only when a current
      period exists.
- [x] 6.4 Update `app/calendario/page.tsx`: fetch `getCurrentPeriod()` +
      its schedule via `lib/data/assignments.ts`; render the existing empty
      state markup when there is no current period, pointing at "Asignar
      tareas".
- [x] 6.5 Grep for remaining `lib/mock-data.ts` consumers; if none remain
      outside itself, delete `lib/mock-data.ts`.

## 7. Verification

- [x] 7.1 Run `npm run test`, `npm run build`, and `npm run lint`.
- [x] 7.2 Manually check with `npm run dev` against the real Supabase
      project: define a period (pick a Monday), confirm the review step's
      defaults match each task's current fixed/variable state, flip one
      task's fixed status, confirm, verify 26 `assignments` rows exist and
      Calendario renders them grouped by person; click "Volver a sortear"
      and confirm the result changes but `period_task_settings` doesn't;
      try a non-Monday date and confirm the inline error.
- [x] 7.3 Confirm `app/configuracion` and its Server Actions were not
      modified.
- [x] 7.4 Grep the diff for `SUPABASE_SERVICE_ROLE_KEY` and confirm it only
      appears in `lib/supabase/server-client.ts` and `.env`/`.env.example`.
- [x] 7.5 Found via live testing: `getPersonGroupsForDay` lived in
      `lib/data/assignments.ts` alongside Supabase-dependent functions, so
      importing it into the client `calendar-accordion.tsx` pulled the
      whole file — including `lib/supabase/server-client.ts` — into the
      browser bundle, crashing on the missing server env vars. Fixed by
      moving the pure grouping/shaping helpers to `lib/calendar-schedule.ts`
      (no Supabase import), and added `import "server-only"` to
      `lib/supabase/server-client.ts` and every `lib/data/*.ts` file so a
      future regression fails the build instead of the browser. Re-verified
      `npm run build`/`lint`/`test` and that `.next/static/chunks` contains
      no Supabase env var names.
