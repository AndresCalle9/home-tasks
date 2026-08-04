import { mulberry32, pickDay, pickUniform } from "./rng";

export type AlgorithmMember = {
  id: string;
  age: number;
};

export type AlgorithmTask = {
  id: string;
  isDaily: boolean;
  minAge: number | null;
};

export type PeriodTaskSetting = {
  taskId: string;
  isFixed: boolean;
  fixedMemberId: string | null;
};

export type AssignmentResult = {
  taskId: string;
  memberId: string;
  dayOfWeek: number | null;
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

  const fixed: AlgorithmTask[] = [];
  const variable: AlgorithmTask[] = [];
  for (const task of tasks) {
    const setting = settingsByTaskId.get(task.id);
    if (setting?.isFixed) fixed.push(task);
    else variable.push(task);
  }

  for (const task of fixed) {
    const setting = settingsByTaskId.get(task.id)!;
    results.push({
      taskId: task.id,
      memberId: setting.fixedMemberId!,
      dayOfWeek: task.isDaily ? null : pickDay(rng),
      isFixed: true,
    });
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
      dayOfWeek: task.isDaily ? null : pickDay(rng),
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
