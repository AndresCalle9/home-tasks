## Why

Real assignment data exposed a gap: the variable-task lottery balances
variable tasks perfectly (spread `<= 1`, confirmed working as designed), but
it treats every member as starting at zero, ignoring how many *fixed* tasks
they already hold this period. A member with several fixed tasks this
period (e.g. two permanent defaults plus a period-specific override) still
gets a full, undiscounted share of variable tasks on top, ending up with the
highest *total* task count for the period even though the variable
distribution alone looked balanced. Confirmed in production: one member had
3 fixed + 4 variable = 7 total, while another had 0 fixed + 4 variable = 4
total, despite the variable-only spread being exactly 1 as guaranteed.

## What Changes

- **BREAKING** (business rule change, confirmed with the user): fixed tasks
  now count toward each member's initial task-count seed for the *current
  period's* variable lottery and rebalancing pass, so a heavily-fixed-loaded
  member starts "behind" and receives proportionally fewer variable tasks
  this period. This reverses part of the rule stated in `CLAUDE.md`
  ("tareas fijas... no entran... al cálculo de balance de carga") and in the
  current `period-assignment` spec ("Fixed tasks SHALL... NOT... count
  toward any member's task count").
- Unchanged: fixed tasks still never enter the lottery itself and can never
  be reassigned by the rebalancing pass.
- Unchanged: cross-period historical balance (`getHistoricalTaskCount` in
  `lib/data/assignments.ts`) stays variable-only — a permanent fixed
  responsibility does not keep depressing a member's future variable odds
  forever. Only the *current period's* initial seed changes.
- Update `CLAUDE.md`'s wording so it no longer contradicts the new rule:
  fixed tasks never enter the lottery and never affect cross-period
  historical balance, but do count toward the current period's initial
  task-count seed used to balance variable-task distribution within that
  same period.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `period-assignment`: the "Run the Weighted Assignment Algorithm"
  requirement changes so a member's fixed-task count for the current period
  seeds their initial task count for the variable lottery and rebalancing
  pass, while fixed tasks still never enter the lottery and cross-period
  historical balance remains variable-only.

## Impact

- `CLAUDE.md`: reword the "tareas fijas... no entran... al cálculo de
  balance de carga" rule to reflect the current-period seeding behavior.
- `lib/algorithm/assign.ts`: seed `runningCount` with each member's
  current-period fixed-task count before the variable-task loop runs.
- `lib/algorithm/assign.test.ts`: new test reproducing the real scenario
  (one member with several fixed tasks this period ends up within the
  spread bound on *total* count, not just variable count); confirmation
  that fixed tasks still never appear as a transferable task in the
  rebalancing pass and never enter the lottery pool.
- No changes to `lib/data/assignments.ts` (`getHistoricalTaskCount` stays
  variable-only), no schema changes, no UI changes.
- Re-verify against the real Supabase data after implementing.
