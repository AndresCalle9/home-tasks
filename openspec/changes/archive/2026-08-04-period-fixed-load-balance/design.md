## Context

`lib/algorithm/assign.ts`'s `assignPeriod` seeds `runningCount` from
`historicalTaskCount` (cross-period, variable-only — see
`getHistoricalTaskCount` in `lib/data/assignments.ts`, which filters
`is_fixed = false`), then only increments it as *variable* tasks are won.
Fixed tasks are pushed into `results` first but never touch `runningCount`.
Verified against real data: the variable lottery and rebalancing pass work
exactly as designed (spread `<= 1` on variable-only counts). The gap is
that a member's *current-period* fixed load is invisible to that seed, so
someone with several fixed tasks this period still gets a full, undiscounted
share of variable ones — ending up with the highest total for the period.

No Supabase schema or credential-handling changes are involved — this is
confined to the pure algorithm module (`lib/algorithm/assign.ts`), which has
no database access.

## Goals / Non-Goals

**Goals:**
- A member's current-period fixed-task count should reduce how many
  variable tasks they receive this period, bringing *total* (fixed +
  variable) counts closer together across members.
- Fixed tasks still never enter the lottery and are never reassignable by
  the rebalancing pass.
- Cross-period historical balance stays variable-only — a permanent fixed
  responsibility must not keep depressing a member's variable odds in
  future periods forever.
- Preserve per-seed determinism.

**Non-Goals:**
- Balancing fixed tasks themselves across members or periods — fixed
  assignments remain a manual, period-review decision (`period_task_settings`),
  untouched by this change.
- Retroactively adjusting already-assigned periods.
- Changing `min_age` eligibility or day-of-week assignment.

## Decisions

### Seed `runningCount` with current-period fixed counts, not historical ones

In `assignPeriod`, after building the `fixed` results (but before the
variable-task loop), increment `runningCount[fixedMemberId]` once per fixed
task assigned to that member this period:

```
const runningCount = { ...historicalTaskCount }   // unchanged: variable-only, cross-period
for (const task of fixed) {
  const setting = settingsByTaskId.get(task.id)
  results.push({ ...isFixed: true })
  runningCount[setting.fixedMemberId] += 1          // NEW: this period's fixed load
}
for (const task of variable) {
  ...unchanged selection logic, now reading the adjusted runningCount
}
```

Everything downstream (the least-loaded selection, the rebalancing pass)
already reads `runningCount` generically — no other logic needs to change.
A member with 3 fixed tasks this period starts at count 3 (plus whatever
cross-period historical variable count they carry), so they're immediately
behind in the least-loaded ranking and the rebalancing pass will also treat
them as "busiest" sooner, both pulling total counts back together.

**Alternative considered — keep `historicalTaskCount` variable-only but add
a *separate* "current period fixed count" input threaded through the
rebalancing pass only.** Rejected: this would fix the rebalancing pass's
view but not the main lottery loop's per-draw selection (which is where most
of the balancing actually happens), requiring the same logic in two places
for no benefit over just seeding `runningCount` once, up front.

**Alternative considered — also feed current-period fixed counts into
`historicalTaskCount` for future periods.** Rejected per explicit user
decision: a permanent fixed responsibility (e.g. always organizing one's own
office) would then permanently suppress that member's variable odds in
every future period, which contradicts the intent of fixed tasks being a
stable, separate responsibility rather than a penalty. Only this period's
seed changes.

### `CLAUDE.md` wording update

The current text — *"Tareas fijas: siempre las hace la misma persona (para
ese periodo); no entran al sorteo ni al cálculo de balance de carga"* — will
be reworded to distinguish the two balance mechanisms:

> Tareas fijas: siempre las hace la misma persona (para ese periodo); nunca
> entran al sorteo aleatorio ni afectan el balance histórico entre periodos,
> pero sí cuentan hacia la carga inicial de ese integrante al balancear las
> tareas variables de ese mismo periodo.

## Risks / Trade-offs

- **[Risk] A member with fixed tasks covering nearly the whole period's
  workload could end up with very few or zero variable tasks, even ones
  they'd normally be guaranteed via the rebalancing pass.** → This is the
  intended outcome (total-load balancing), not a bug; the rebalancing pass's
  existing "no eligible transfer" fallback already handles the edge case
  where full equalization isn't structurally possible.
- **[Risk] Existing tests assumed fixed tasks are fully invisible to the
  variable lottery** (e.g. "does not let a fixed task count toward the
  variable lottery", which asserted the *opposite* of this change's intent).
  → That test's premise is now outdated and must be replaced with one
  asserting the new intended behavior (fixed load reduces variable share),
  not just deleted silently — the change log should be explicit that this
  reverses a previously-tested assumption.

No Supabase credentials are touched by this change — confirmed:
`lib/algorithm/assign.ts` has no imports beyond `./rng`, unchanged by this
change.

## Migration Plan

No data migration. Pure code change in `lib/algorithm/assign.ts`. Next
"Asignar tareas" or "Reroll" run uses the new seeding automatically.
Rollback: revert the commit — assignments are regenerated per period on
demand, not carried forward as stored logic.

## Open Questions

None — the fix direction (seed current-period fixed load into the variable
lottery, keep cross-period historical balance variable-only) was confirmed
directly with the user before this proposal was created.
