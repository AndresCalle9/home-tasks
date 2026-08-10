import { mulberry32, pickUniform } from "./rng";
import { EFFORT_WEIGHT, type Effort } from "../effort";

export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;

export type AlgorithmMember = {
  id: string;
};

export type AlgorithmTask = {
  id: string;
  effort: Effort;
  // Concrete days (0=Monday..6=Sunday) this task occurs on this week —
  // already resolved by the caller (a "diario" task means every day).
  days: readonly number[];
  eligibleMemberIds: string[];
};

export type AlgorithmConflict = {
  taskAId: string;
  taskBId: string;
};

export type ScheduleAssignment = {
  taskId: string;
  memberId: string | null;
  dayOfWeek: number;
};

// One member per (task, day), chosen from whoever is eligible and doesn't
// already hold a same-day conflicting task, weighted toward whoever holds
// the least effort-weighted load so far this week. Ties broken by `seed` —
// same seed always produces the same schedule (see lib/algorithm/schedule.test.ts).
export function generateSchedule(
  members: AlgorithmMember[],
  tasks: AlgorithmTask[],
  conflicts: AlgorithmConflict[],
  seed: number
): ScheduleAssignment[] {
  const rng = mulberry32(seed);
  const load: Record<string, number> = {};
  members.forEach((m) => (load[m.id] = 0));

  const conflictingTaskIds = new Map<string, string[]>();
  for (const { taskAId, taskBId } of conflicts) {
    conflictingTaskIds.set(taskAId, [...(conflictingTaskIds.get(taskAId) ?? []), taskBId]);
    conflictingTaskIds.set(taskBId, [...(conflictingTaskIds.get(taskBId) ?? []), taskAId]);
  }

  const results: ScheduleAssignment[] = [];

  for (const day of DAYS_OF_WEEK) {
    for (const task of tasks) {
      if (!task.days.includes(day)) continue;

      let eligible = members.filter((m) => task.eligibleMemberIds.includes(m.id));

      const blockedByTaskIds = conflictingTaskIds.get(task.id);
      if (blockedByTaskIds && blockedByTaskIds.length > 0) {
        const takenToday = new Set(
          results
            .filter((r) => r.dayOfWeek === day && blockedByTaskIds.includes(r.taskId))
            .map((r) => r.memberId)
        );
        eligible = eligible.filter((m) => !takenToday.has(m.id));
      }

      if (eligible.length === 0) {
        results.push({ taskId: task.id, memberId: null, dayOfWeek: day });
        continue;
      }

      const minLoad = Math.min(...eligible.map((m) => load[m.id]));
      const leastLoaded = eligible.filter((m) => load[m.id] === minLoad);
      const winner = pickUniform(rng, leastLoaded);
      load[winner.id] += EFFORT_WEIGHT[task.effort];
      results.push({ taskId: task.id, memberId: winner.id, dayOfWeek: day });
    }
  }

  return results;
}
