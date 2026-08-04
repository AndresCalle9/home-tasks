## Context

`lib/algorithm/assign.ts` assigns every variable task to one member for a
period. The current selection rule, added in `simplify-assignment-balance`,
picks a winner via `weightedPick(rng, candidates, weights)` where
`weights[i] = 1 / (1 + runningCount[candidate[i].id])`. This is a soft bias:
it raises the odds for an under-loaded candidate but never removes the chance
of an already-loaded one winning again. Diagnosed against the real household
(5 members, 22 variable tasks, fresh period with no history) and a 20,000-run
simulation: 70% of runs land with a 3+ task spread between the busiest and
least-busy member, worst case 9. This does not satisfy the "balance by task
count" requirement the previous change already committed to in the spec.

No Supabase schema or credential-handling changes are involved — this change
is confined to the pure algorithm module (`lib/algorithm/assign.ts` and
possibly `lib/algorithm/rng.ts`), which has no database access at all.

## Goals / Non-Goals

**Goals:**
- Guarantee (not just favor) that variable-task counts stay tightly bounded
  across members: max-min spread `<= 1` after every run, regardless of seed.
- Preserve per-seed determinism (same inputs + seed → same output).
- Keep `min_age` hard eligibility filtering and fixed-task bypass unchanged.

**Non-Goals:**
- Changing how fixed tasks are chosen or excluded from balance (unchanged).
- Changing day-of-week assignment for non-daily tasks (unchanged).
- Database schema changes (none needed).
- Load-balancing perfection across *unequal* eligibility pools (e.g. a task
  that only one member can do will always favor that member — expected and
  unavoidable, not a bug this change addresses).

## Decisions

### Selection rule: strict least-loaded pool, random tie-break

Replace the variable-task loop's winner selection with:

```
for task in variable_tasks:
  candidates = eligible_members(members, task)      # unchanged: min_age filter
  min_count = min(running_count[m.id] for m in candidates)
  tied = [m for m in candidates if running_count[m.id] == min_count]
  winner = tied[floor(rng() * len(tied))]            # uniform pick, seeded
  running_count[winner.id] += 1
  ...same day-of-week / result push as today
```

This is a direct, deterministic reading of "balance by task count": at every
draw, only members currently tied for the fewest tasks can win. Because
`running_count` updates after each draw, the pool of "least loaded" members
naturally rotates as the loop progresses — no separate pass is needed to
achieve balance across the run.

**Alternative considered — keep `weightedPick` with equal weights among the
tied group.** Functionally identical to a uniform pick; rejected only because
`weightedPick`'s weight-sum math is unnecessary overhead for a uniform choice.
Decision: add a small `pickUniform(rng, items)` helper in `rng.ts` next to the
existing `weightedPick`, used only for this tie-break. `weightedPick` stays in
place since day-of-week assignment doesn't use it either way, but removing an
already-tested, working primitive isn't warranted.

**Alternative considered — sort candidates by count and always take the
first.** Rejected: without randomizing among ties, the same member would
consistently win ties in a fixed iteration order (e.g. array order from the
DB), making the "lottery" deterministic in an unfair, easily-gamed way rather
than seed-random among equals.

### Post-lottery pass: generalized rebalancing, not just zero-task guarantee

**Revised during implementation.** The original minimum-guarantee pass only
fired for a member left with zero variable tasks. Verifying against the real
household's data exposed a case that pass doesn't cover: when the 3 tasks
that exclude one member (min_age-restricted) are consecutive at the *end* of
the task list, the main loop can leave that member 1 task behind (spread=1,
correctly within bound at that point), and then all 3 exclusion-tasks fire in
a row — each pushes a *different* eligible member further ahead while the
excluded member, unable to win any of them, stays frozen. Result: spread=2,
already outside the bound this change promises. The main loop's per-draw
"pick the current minimum" invariant only holds spread `<= 1` when every task
in the sequence shares the same eligible pool — it does not hold once
exclusion-tasks can cluster after the excluded member has already fallen
behind.

Fix: generalize the pass to run after the lottery regardless of whether
anyone is at zero:

```
loop:
  busiest = member with the current max variable-task count
  neediest = member with the current min variable-task count
  if busiest.count - neediest.count <= 1: stop
  candidate = a task currently assigned to busiest that neediest is
              eligible for (by min_age)
  if no such candidate: stop  # structural constraint, can't rebalance further
  reassign that task from busiest to neediest
  update both counts
```

This is deterministic (no further RNG draws — same as the pass it replaces)
and terminates quickly: each iteration shrinks the busiest/neediest gap by 2,
bounded by the total task count. It strictly subsumes the old zero-task
guarantee (that's just the case where `neediest.count == 0`), so the old pass
is replaced rather than kept alongside this one.

**Alternative considered — process exclusion-heavy tasks first (sort tasks by
how few members are eligible, before the main loop).** Would reduce how often
the rebalancing pass needs to act, but doesn't eliminate the need for it (any
fixed order can still end with a cluster of exclusion-tasks relative to *some*
seed's random tie-breaks), and reordering tasks changes which day-of-week
draws land on which task for a given seed, weakening the "same seed → same
result" mental model across code changes. Rejected in favor of a rebalancing
pass that guarantees the bound unconditionally, regardless of task order.

## Risks / Trade-offs

- **[Risk] Removing all randomness "feel" from the lottery for small
  households.** With only 5 members and most tasks open to everyone, the
  least-loaded pool will often contain most of the household, so the tie-break
  still meaningfully randomizes who gets what — this isn't round-robin in a
  fixed order. → No mitigation needed; this is the intended behavior.
- **[Risk] A member excluded from many tasks (e.g. `min_age`) could still show
  a lower *variable* count than others by design, since they're just less
  often eligible to win.** → Already covered by the existing minimum-guarantee
  pass; unchanged by this design.
- **[Risk] Existing tests may implicitly assume the old proportional
  distribution** (e.g. a test checking the relative *frequency* of a member
  winning across many seeds rather than just the final count bound). → Must
  audit `lib/algorithm/assign.test.ts` during implementation and update any
  test asserting the old soft-bias behavior specifically, not just the
  count-bound outcome.

No credentials or Supabase access are touched by this change — confirmed:
`lib/algorithm/assign.ts` and `lib/algorithm/rng.ts` have zero imports outside
`./rng`, so there is nothing here that could leak a service-role key or any
other secret to the client.

## Migration Plan

No data migration. Deploy is a pure code change: merge, and the next
"Asignar tareas" or "Reroll" run uses the new selection rule automatically.
No rollback complexity beyond reverting the commit — assignments are
regenerated per period on demand, not carried forward as stored logic.

## Open Questions

None — the fix direction was confirmed with the user before this proposal was
created, based on the simulation results above.
