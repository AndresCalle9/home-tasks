import { mulberry32, pickDay, weightedPick } from "./rng";

export type AlgorithmMember = {
  id: string;
  age: number;
};

export type AlgorithmTask = {
  id: string;
  isDaily: boolean;
  weight: number;
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

// Child < 12, teen 12-17, adult 18+. Adults carry the full weight of a
// variable task; minors carry proportionally less.
export function ageWeight(age: number): number {
  if (age < 12) return 0.2;
  if (age < 18) return 0.6;
  return 1;
}

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

export function assignPeriod(
  members: AlgorithmMember[],
  tasks: AlgorithmTask[],
  periodTaskSettings: PeriodTaskSetting[],
  historicalLoad: Record<string, number>,
  seed: number
): AssignmentResult[] {
  const rng = mulberry32(seed);
  const runningLoad: Record<string, number> = { ...historicalLoad };
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
  variable.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

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
    const weights = candidates.map(
      (m) => ageWeight(m.age) / (1 + (runningLoad[m.id] ?? 0))
    );
    const winner = weightedPick(rng, candidates, weights);
    runningLoad[winner.id] = (runningLoad[winner.id] ?? 0) + task.weight;
    results.push({
      taskId: task.id,
      memberId: winner.id,
      dayOfWeek: task.isDaily ? null : pickDay(rng),
      isFixed: false,
    });
  }

  // Guarantee every member at least one variable task, if they're eligible
  // for any: transfer one from whoever currently holds the most
  // accumulated weight among that member's eligible tasks. Deterministic —
  // no further random draws, so a reroll's determinism is unaffected.
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
      (runningLoad[r.memberId] ?? 0) > (runningLoad[most.memberId] ?? 0)
        ? r
        : most
    );
    const task = taskById.get(target.taskId)!;
    runningLoad[target.memberId] =
      (runningLoad[target.memberId] ?? 0) - task.weight;
    runningLoad[member.id] = (runningLoad[member.id] ?? 0) + task.weight;
    target.memberId = member.id;
  }

  return results;
}
