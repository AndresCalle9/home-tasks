## 1. Algorithm

- [x] 1.1 Add a `pickUniform(rng, items)` helper to `lib/algorithm/rng.ts`
      (uniform random pick from a non-empty array using the seeded RNG).
- [x] 1.2 In `lib/algorithm/assign.ts`'s variable-task loop, replace the
      `weightedPick` call (weights `1/(1+count)`) with: compute the minimum
      `runningCount` among `eligibleMembers(members, task)`, filter to
      candidates tied at that minimum, then pick the winner via
      `pickUniform`.
- [x] 1.3 Re-read the post-lottery minimum-guarantee pass — **found it
      insufficient** against real data (see design.md: exclusion-tasks
      clustered at the end of the list can leave spread=2). Replace it with
      a generalized rebalancing pass: while the busiest and least-busy
      member differ by more than 1, transfer one task from the busiest to
      the least-busy member (only among tasks the least-busy member is
      eligible for), repeating until the gap is `<= 1` or no eligible
      transfer remains.

## 2. Tests

- [x] 2.1 Add a test to `lib/algorithm/assign.test.ts` asserting that, across
      many seeds (e.g. 200+) with a mix of household sizes, the max-min
      spread of variable-task counts among equally-eligible members is
      always `<= 1`.
- [x] 2.2 Review existing tests for any assertion that relied on the old
      proportional-probability behavior (e.g. frequency-based expectations)
      and update them to assert the new strict-bound behavior instead.
- [x] 2.3 Add a regression test reproducing the real-household shape that
      exposed the clustering gap: several tasks sharing the same exclusion
      at the end of the task list, verifying the rebalancing pass closes the
      gap to `<= 1`.
- [x] 2.4 Run the full existing suite (determinism, fixed-task bypass,
      `minAge` exclusion, oldest-member fallback, rebalancing guarantee,
      exactly-one-assignment-per-task, day-of-week range) and confirm it
      still passes.
- [x] 2.5 Run `npm test` and confirm 0 failures. (13/13 passing)

## 3. Verification against real data

- [x] 3.1 Re-run the assignment for the household's existing period against
      real Supabase data using the exact stored seed and confirm the
      resulting variable-task counts per member now have a spread `<= 1`
      (this step originally caught the clustering gap fixed in 1.3 — spread
      was 2 before the fix, is 1 after, confirmed across the stored seed
      plus 5 additional seeds).
