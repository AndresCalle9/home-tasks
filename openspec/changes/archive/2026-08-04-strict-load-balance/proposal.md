## Why

The variable-task lottery introduced in `simplify-assignment-balance` picks a
winner with probability proportional to `1/(1 + tasks already held)`. That
formula only *favors* whoever holds fewer tasks — it never guarantees it. On
the real household's only assigned period (5 members, 22 variable tasks, no
assignment history yet), one member ended up with 6 variable tasks while
another got only 3, purely from an unlucky seed. A 20,000-run simulation using
that exact household confirms this isn't a fluke: **70% of runs produce a
spread of 3+ tasks between the busiest and least-busy member**, with a worst
case of 9. That doesn't meet the "balance by task count" goal the previous
change already committed to.

## What Changes

- Replace the variable-task winner selection in `lib/algorithm/assign.ts`:
  instead of a weighted-random pick proportional to `1/(1 + count)`, pick
  uniformly at random among whichever *eligible* candidates currently hold
  the strict minimum task count at that point in the sequential draw. Ties
  are broken by the same seeded RNG, so the algorithm stays deterministic per
  seed.
- Re-verify the existing post-lottery "minimum guarantee" pass (nobody
  eligible ends up with zero variable tasks) still behaves correctly under
  the new selection rule — it may become unreachable in most cases, but is
  kept unless proven unnecessary.
- Add a test asserting the max-min spread across members stays `<= 1` across
  many seeds, mirroring the simulation used to diagnose this bug.
- No database schema changes. No changes to fixed-task handling or `min_age`
  eligibility filtering.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `period-assignment`: the "Run the Weighted Assignment Algorithm" requirement
  changes from "a member holding fewer tasks has a *proportionally higher
  chance*" to "the system SHALL always pick among the members currently
  holding the fewest tasks" — a hard guarantee instead of a soft bias.

## Impact

- `lib/algorithm/assign.ts`: the variable-task selection loop.
- `lib/algorithm/rng.ts`: may gain a small "pick uniformly from array" helper
  alongside the existing `weightedPick`, if that's cleaner than reusing
  `weightedPick` with equal weights.
- `lib/algorithm/assign.test.ts`: new spread-bound test; existing determinism
  and eligibility tests must keep passing.
- No changes to Supabase schema, CRUD, or UI components.
