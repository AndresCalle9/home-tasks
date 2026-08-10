import { mulberry32, pickDistinctDays, pickUniform } from "./rng";

// Fallback for a non-daily task missing a configured frequency (should not
// happen once the CRUD requires one — see design.md).
const DEFAULT_TIMES_PER_WEEK = 3;

export type AlgorithmMember = {
  id: string;
  age: number;
};

export type AlgorithmTask = {
  id: string;
  isDaily: boolean;
  minAge: number | null;
  dayGroup: string | null;
  timesPerWeek: number | null;
};

export type PeriodTaskSetting = {
  taskId: string;
  isFixed: boolean;
  fixedMemberIds: string[];
};

export type AssignmentResult = {
  taskId: string;
  memberId: string;
  dayOfWeek: number[] | null;
  isFixed: boolean;
};

// Members allowed to win a task's lottery. Falls back to the oldest
// household member if the task's minAge excludes everyone (e.g. a task
// requiring an adult in a household with none).
function eligibleMembers(
  members: AlgorithmMember[],
  task: AlgorithmTask
): AlgorithmMember[] {
  if (task.minAge == null) return members;
  const eligible = members.filter((m) => m.age >= task.minAge!);
  if (eligible.length > 0) return eligible;
  const oldest = [...members].sort((a, b) => b.age - a.age)[0];
  return oldest ? [oldest] : [];
}

// Balance is purely by how many tasks each member holds — age only acts as
// a hard eligibility filter (above), never as a probability boost.
export function assignPeriod(
  members: AlgorithmMember[],
  tasks: AlgorithmTask[],
  periodTaskSettings: PeriodTaskSetting[],
  historicalTaskCount: Record<string, number>,
  seed: number
): AssignmentResult[] {
  const rng = mulberry32(seed);
  const runningCount: Record<string, number> = { ...historicalTaskCount };
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const settingsByTaskId = new Map(
    periodTaskSettings.map((s) => [s.taskId, s])
  );
  const results: AssignmentResult[] = [];

  // Tasks sharing a non-null dayGroup always get the identical days;
  // ungrouped tasks are their own singleton group (keyed by their own id).
  // Shared across the fixed and variable loops below, so whichever task in
  // a group is processed first draws the days and every other task in that
  // group — fixed or variable — reuses them verbatim.
  const dayGroupCache = new Map<string, number[]>();
  function daysFor(task: AlgorithmTask): number[] | null {
    if (task.isDaily) return null;
    const groupKey = task.dayGroup ?? task.id;
    if (!dayGroupCache.has(groupKey)) {
      dayGroupCache.set(
        groupKey,
        pickDistinctDays(rng, task.timesPerWeek ?? DEFAULT_TIMES_PER_WEEK)
      );
    }
    return dayGroupCache.get(groupKey)!;
  }

  const fixed: AlgorithmTask[] = [];
  const variable: AlgorithmTask[] = [];
  for (const task of tasks) {
    const setting = settingsByTaskId.get(task.id);
    if (setting?.isFixed) fixed.push(task);
    else variable.push(task);
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  for (const task of fixed) {
    const setting = settingsByTaskId.get(task.id)!;
    // Least-loaded pick among this task's configured fixed members — same
    // tie-break rule as the variable lottery below. Falls back to the full
    // eligible pool if a fixed task somehow has no configured members
    // (should be impossible once the CRUD enforces at least one).
    const candidates = setting.fixedMemberIds
      .map((id) => memberById.get(id))
      .filter((m): m is AlgorithmMember => m != null);
    const pool = candidates.length > 0 ? candidates : eligibleMembers(members, task);
    const minCount = Math.min(...pool.map((m) => runningCount[m.id] ?? 0));
    const leastLoaded = pool.filter((m) => (runningCount[m.id] ?? 0) === minCount);
    const winner = pickUniform(rng, leastLoaded);
    results.push({
      taskId: task.id,
      memberId: winner.id,
      dayOfWeek: daysFor(task),
      isFixed: true,
    });
    // Fixed tasks never enter the lottery, but this period's fixed load
    // still counts toward the initial balance seed below, so a member with
    // several fixed tasks doesn't also collect a full, undiscounted share
    // of variable ones. Cross-period historicalTaskCount stays
    // variable-only (unaffected here), so a permanent fixed responsibility
    // doesn't keep depressing a member's odds in future periods.
    runningCount[winner.id] = (runningCount[winner.id] ?? 0) + 1;
  }

  for (const task of variable) {
    const candidates = eligibleMembers(members, task);
    const minCount = Math.min(
      ...candidates.map((m) => runningCount[m.id] ?? 0)
    );
    const leastLoaded = candidates.filter(
      (m) => (runningCount[m.id] ?? 0) === minCount
    );
    const winner = pickUniform(rng, leastLoaded);
    runningCount[winner.id] = (runningCount[winner.id] ?? 0) + 1;
    results.push({
      taskId: task.id,
      memberId: winner.id,
      dayOfWeek: daysFor(task),
      isFixed: false,
    });
  }

  // The main loop only guarantees a <=1 spread among members equally
  // eligible for every task it processes. When exclusion tasks (e.g. a
  // min_age-restricted task) cluster together after an excluded member has
  // already fallen behind, that guarantee can be violated (see design.md).
  // Rebalance by repeatedly moving a task from the busiest member to the
  // least-busy one, as long as the least-busy member is eligible for it.
  // Deterministic — no further random draws, so a reroll's determinism is
  // unaffected.
  const variableResults = results.filter((r) => !r.isFixed);
  while (members.length > 0) {
    const counts = members.map((m) => runningCount[m.id] ?? 0);
    const busiest = members[counts.indexOf(Math.max(...counts))];
    const neediest = members[counts.indexOf(Math.min(...counts))];
    if (
      (runningCount[busiest.id] ?? 0) - (runningCount[neediest.id] ?? 0) <=
      1
    ) {
      break;
    }

    const transferable = variableResults.find((r) => {
      if (r.memberId !== busiest.id) return false;
      const task = taskById.get(r.taskId)!;
      return task.minAge == null || neediest.age >= task.minAge;
    });
    if (!transferable) break;

    runningCount[busiest.id] = (runningCount[busiest.id] ?? 0) - 1;
    runningCount[neediest.id] = (runningCount[neediest.id] ?? 0) + 1;
    transferable.memberId = neediest.id;
  }

  return results;
}
