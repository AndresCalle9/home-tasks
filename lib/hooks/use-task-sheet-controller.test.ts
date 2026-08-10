import { describe, expect, it } from "vitest";
import { findDuelCandidates } from "./use-task-sheet-controller";
import type { Assignment } from "@/lib/data/assignments";
import type { Task } from "@/lib/data/tasks";

function task(id: string, effort: Task["effort"]): Task {
  return {
    id,
    name: id,
    icon: "📌",
    effort,
    freq: "diario",
    days: [],
    active: true,
    eligibleMemberIds: ["m1", "m2"],
  };
}

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: "a1",
    taskId: "t1",
    memberId: "m1",
    dayOfWeek: 0,
    status: "pending",
    ...overrides,
  };
}

describe("findDuelCandidates", () => {
  const taskById = new Map([
    ["mine", task("mine", "media")],
    ["same-day-same-effort", task("same-day-same-effort", "media")],
    ["same-day-diff-effort", task("same-day-diff-effort", "alta")],
    ["diff-day-same-effort", task("diff-day-same-effort", "media")],
  ]);

  const mine = assignment({ id: "mine", taskId: "mine", memberId: "m1", dayOfWeek: 0 });

  it("only offers tasks on the same day", () => {
    const assignments = [
      mine,
      assignment({
        id: "diff-day",
        taskId: "diff-day-same-effort",
        memberId: "m2",
        dayOfWeek: 1,
      }),
    ];
    expect(findDuelCandidates(mine, assignments, taskById)).toHaveLength(0);
  });

  it("only offers tasks with the same effort level", () => {
    const assignments = [
      mine,
      assignment({
        id: "diff-effort",
        taskId: "same-day-diff-effort",
        memberId: "m2",
        dayOfWeek: 0,
      }),
    ];
    expect(findDuelCandidates(mine, assignments, taskById)).toHaveLength(0);
  });

  it("offers a same-day, same-effort task held by someone else", () => {
    const candidate = assignment({
      id: "match",
      taskId: "same-day-same-effort",
      memberId: "m2",
      dayOfWeek: 0,
    });
    const results = findDuelCandidates(mine, [mine, candidate], taskById);
    expect(results.map((r) => r.id)).toEqual(["match"]);
  });
});
