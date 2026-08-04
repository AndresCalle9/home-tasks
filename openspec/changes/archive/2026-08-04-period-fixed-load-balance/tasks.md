## 1. Documentation

- [x] 1.1 Reword the "Tareas fijas... no entran... al cálculo de balance de
      carga" rule in `CLAUDE.md` to distinguish: fixed tasks never enter the
      lottery and never affect cross-period historical balance, but do
      count toward the current period's initial task-count seed.

## 2. Algorithm

- [x] 2.1 In `lib/algorithm/assign.ts`'s `assignPeriod`, after pushing each
      fixed result, increment `runningCount[fixedMemberId]` by 1 (on top of
      the existing `{...historicalTaskCount}` seed), before the variable
      task loop runs.
- [x] 2.2 Confirm no other change is needed in the variable-task loop or the
      rebalancing pass — both already read from `runningCount` generically.

## 3. Tests

- [x] 3.1 Update or remove the existing test whose premise this change
      reverses ("does not let a fixed task count toward the variable
      lottery") — replace with a test asserting the new intended behavior:
      a member with more fixed tasks this period receives proportionally
      fewer variable tasks.
- [x] 3.2 Add a regression test reproducing the real scenario found in
      production: one member with several fixed tasks this period (some
      permanent-default, at least one via a period-specific override) ends
      up with a *total* (fixed + variable) task count within the spread
      bound of everyone else, across many seeds.
- [x] 3.3 Add/confirm a test that fixed tasks are still never present as a
      transferable candidate in the rebalancing pass and never enter the
      lottery pool, regardless of this change. (Extended the existing
      "never reassigns a fixed task" test to run across all 50 seeds.)
- [x] 3.4 Confirm the cross-period historical balance test(s) still show
      that a member's *fixed* history from prior periods does not affect
      their odds in a new period — only past variable counts matter.
      (Confirmed by inspection: `getHistoricalTaskCount` in
      `lib/data/assignments.ts` still filters `is_fixed = false`,
      unchanged by this proposal.)
- [x] 3.5 Run `npm test` and confirm 0 failures. (14/14 passing.)

## 4. Verification against real data

- [x] 4.1 Re-run the assignment against the real Supabase data (the period
      that exposed this issue, or a fresh one) across several seeds and
      confirm total task counts (fixed + variable) per member now stay
      within a spread of 1, where structurally possible. (Confirmed against
      the exact real period's fixed settings — Andres with 3 fixed tasks —
      across the stored seed plus 5 more: spread = 1 in every run, vs the
      spread = 3 seen before this fix.)
