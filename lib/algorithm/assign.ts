import { mulberry32, pickDay, weightedPick } from "./rng";

export type AlgorithmMember = {
  id: string;
  age: number;
};

export type AlgorithmTask = {
  id: string;
  isDaily: boolean;
  weight: number;
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

export function assignPeriod(
  members: AlgorithmMember[],
  tasks: AlgorithmTask[],
  periodTaskSettings: PeriodTaskSetting[],
  historicalLoad: Record<string, number>,
  seed: number
): AssignmentResult[] {
  const rng = mulberry32(seed);
  const runningLoad: Record<string, number> = { ...historicalLoad };
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
    const weights = members.map(
      (m) => ageWeight(m.age) / (1 + (runningLoad[m.id] ?? 0))
    );
    const winner = weightedPick(rng, members, weights);
    runningLoad[winner.id] = (runningLoad[winner.id] ?? 0) + task.weight;
    results.push({
      taskId: task.id,
      memberId: winner.id,
      dayOfWeek: task.isDaily ? null : pickDay(rng),
      isFixed: false,
    });
  }

  return results;
}
