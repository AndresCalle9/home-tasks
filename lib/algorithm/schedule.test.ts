import { describe, expect, it } from "vitest";
import { generateSchedule, type AlgorithmMember, type AlgorithmTask } from "./schedule";

const MEMBERS: AlgorithmMember[] = [{ id: "m1" }, { id: "m2" }, { id: "m3" }];

function dailyTask(id: string, eligibleMemberIds: string[]): AlgorithmTask {
  return { id, effort: "media", days: [0, 1, 2, 3, 4, 5, 6], eligibleMemberIds };
}

describe("generateSchedule", () => {
  it("is deterministic for a given seed", () => {
    const tasks = [dailyTask("t1", ["m1", "m2", "m3"])];
    const a = generateSchedule(MEMBERS, tasks, [], 42);
    const b = generateSchedule(MEMBERS, tasks, [], 42);
    expect(a).toEqual(b);
  });

  it("only assigns eligible members", () => {
    const tasks = [dailyTask("t1", ["m2"])];
    const results = generateSchedule(MEMBERS, tasks, [], 1);
    expect(results.every((r) => r.memberId === "m2")).toBe(true);
  });

  it("leaves a task unassigned when no one is eligible", () => {
    const tasks = [dailyTask("t1", [])];
    const results = generateSchedule(MEMBERS, tasks, [], 1);
    expect(results.every((r) => r.memberId === null)).toBe(true);
  });

  it("only assigns a task on its configured days", () => {
    const tasks: AlgorithmTask[] = [
      { id: "t1", effort: "ligera", days: [0, 2], eligibleMemberIds: ["m1", "m2", "m3"] },
    ];
    const results = generateSchedule(MEMBERS, tasks, [], 7);
    expect(results.map((r) => r.dayOfWeek).sort()).toEqual([0, 2]);
  });

  it("balances load across members using effort weight", () => {
    const tasks = [dailyTask("t1", ["m1", "m2", "m3"])];
    const results = generateSchedule(MEMBERS, tasks, [], 99);
    const counts: Record<string, number> = { m1: 0, m2: 0, m3: 0 };
    for (const r of results) if (r.memberId) counts[r.memberId]++;
    const values = Object.values(counts);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });

  it("never assigns the same member to two conflicting tasks on the same day", () => {
    const tasks: AlgorithmTask[] = [
      dailyTask("wash", ["m1", "m2", "m3"]),
      dailyTask("dry", ["m1", "m2", "m3"]),
    ];
    const results = generateSchedule(
      MEMBERS,
      tasks,
      [{ taskAId: "wash", taskBId: "dry" }],
      3
    );
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      const washMember = results.find((r) => r.taskId === "wash" && r.dayOfWeek === day)?.memberId;
      const dryMember = results.find((r) => r.taskId === "dry" && r.dayOfWeek === day)?.memberId;
      if (washMember && dryMember) expect(washMember).not.toBe(dryMember);
    }
  });
});
