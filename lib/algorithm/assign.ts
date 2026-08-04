import { mulberry32, pickDay, weightedPick } from "./rng";

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
    const weights = candidates.map((m) => 1 / (1 + (runningCount[m.id] ?? 0)));
    const winner = weightedPick(rng, candidates, weights);
    runningCount[winner.id] = (runningCount[winner.id] ?? 0) + 1;
    results.push({
      taskId: task.id,
      memberId: winner.id,
      dayOfWeek: task.isDaily ? null : pickDay(rng),
      isFixed: false,
    });
  }

  // Guarantee every member at least one variable task, if they're eligible
  // for any: transfer one from whoever currently holds the most tasks among
  // that member's eligible tasks. Deterministic — no further random draws,
  // so a reroll's determinism is unaffected.
  const variableResults = results.filter((r) => !r.isFixed);
  for (const member of members) {
    const hasVariableTask = variableResults.some(
      (r) => r.memberId === member.id
    );
    if (hasVariableTask) continue;

    const candidates = variableResults.filter((r) => {
      const task = taskById.get(r.taskId)!;
      return task.minAge == null || member.age >= task.minAge;
    });
    if (candidates.length === 0) continue;

    // Prefer taking from a holder with spare tasks (more than one), so this
    // never zeroes out a member who was already processed and fixed up
    // earlier in this same pass. Only take from a single-task holder if no
    // eligible candidate has any slack.
    const holderCount = new Map<string, number>();
    for (const r of variableResults) {
      holderCount.set(r.memberId, (holderCount.get(r.memberId) ?? 0) + 1);
    }
    const withSlack = candidates.filter(
      (r) => (holderCount.get(r.memberId) ?? 0) > 1
    );
    const pool = withSlack.length > 0 ? withSlack : candidates;

    const target = pool.reduce((most, r) =>
      (runningCount[r.memberId] ?? 0) > (runningCount[most.memberId] ?? 0)
        ? r
        : most
    );
    runningCount[target.memberId] = (runningCount[target.memberId] ?? 0) - 1;
    runningCount[member.id] = (runningCount[member.id] ?? 0) + 1;
    target.memberId = member.id;
  }

  return results;
}
