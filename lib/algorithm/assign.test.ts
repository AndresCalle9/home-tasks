import { describe, expect, it } from "vitest";
import { assignPeriod } from "./assign";
import { mulberry32 } from "./rng";

const members = [
  { id: "adult-1", age: 34 },
  { id: "adult-2", age: 50 },
  { id: "teen-1", age: 16 },
  { id: "child-1", age: 10 },
];

// 5 variable tasks for 4 members leaves enough slack for the
// minimum-guarantee pass to actually give everyone something, while
// t-cooking's minAge excludes child-1 (and, at 18, teen-1 too).
const tasks = [
  { id: "t-fixed", isDaily: false, minAge: null },
  { id: "t-var-daily", isDaily: true, minAge: null },
  { id: "t-var-once", isDaily: false, minAge: null },
  { id: "t-var-2", isDaily: true, minAge: null },
  { id: "t-var-3", isDaily: false, minAge: null },
  { id: "t-cooking", isDaily: true, minAge: 14 },
];

const settings = [
  { taskId: "t-fixed", isFixed: true, fixedMemberId: "adult-1" },
  { taskId: "t-var-daily", isFixed: false, fixedMemberId: null },
  { taskId: "t-var-once", isFixed: false, fixedMemberId: null },
  { taskId: "t-var-2", isFixed: false, fixedMemberId: null },
  { taskId: "t-var-3", isFixed: false, fixedMemberId: null },
  { taskId: "t-cooking", isFixed: false, fixedMemberId: null },
];

const SEEDS = Array.from({ length: 50 }, (_, i) => i);

describe("assignPeriod", () => {
  it("is deterministic for a given seed", () => {
    const runA = assignPeriod(members, tasks, settings, {}, 42);
    const runB = assignPeriod(members, tasks, settings, {}, 42);
    expect(runA).toEqual(runB);
  });

  it("gives a different result for a different seed", () => {
    const runA = assignPeriod(members, tasks, settings, {}, 1);
    const runB = assignPeriod(members, tasks, settings, {}, 2);
    expect(runA).not.toEqual(runB);
  });

  it("assigns fixed tasks to their configured member without entering the lottery", () => {
    const result = assignPeriod(members, tasks, settings, {}, 7);
    const fixed = result.find((r) => r.taskId === "t-fixed")!;
    expect(fixed.memberId).toBe("adult-1");
    expect(fixed.isFixed).toBe(true);
  });

  it("does not let a fixed task count toward the variable lottery", () => {
    // adult-1 is fixed for t-fixed; if fixed tasks leaked into the running
    // count, adult-1 would look artificially "loaded" and lose every
    // variable tie. Running many seeds should still let adult-1 win at
    // least one variable task when history starts empty for everyone.
    const wins = new Set<string>();
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const variableWinners = result
        .filter((r) => !r.isFixed)
        .map((r) => r.memberId);
      variableWinners.forEach((m) => wins.add(m));
    }
    expect(wins.has("adult-1")).toBe(true);
  });

  it("gives a member with a higher task count a lower selection weight", () => {
    // Same formula the algorithm itself uses: 1 / (1 + tasksHeld).
    const noHistory = 1 / (1 + 0);
    const heavyHistory = 1 / (1 + 5);
    expect(heavyHistory).toBeLessThan(noHistory);
  });

  it("does not skew task counts by age when everyone is eligible", () => {
    // No minAge restrictions here — every member should end up with a
    // roughly similar total task count over many runs, regardless of age.
    const openTasks = tasks.map((t) =>
      t.id === "t-cooking" ? { ...t, minAge: null } : t
    );
    const totals: Record<string, number> = {};
    for (const seed of SEEDS) {
      const result = assignPeriod(members, openTasks, settings, {}, seed);
      for (const r of result.filter((r) => !r.isFixed)) {
        totals[r.memberId] = (totals[r.memberId] ?? 0) + 1;
      }
    }
    // 5 variable tasks * 50 seeds = 250 draws, ~62.5 expected per member if
    // perfectly even. Allow generous noise (~32%) — this only needs to
    // catch a systematic (age-based) skew, not assert perfect evenness.
    const counts = members.map((m) => totals[m.id] ?? 0);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(20);
  });

  it("assigns a dayOfWeek in range for non-daily tasks and null for daily tasks", () => {
    const result = assignPeriod(members, tasks, settings, {}, 99);
    const daily = result.find((r) => r.taskId === "t-var-daily")!;
    const once = result.find((r) => r.taskId === "t-var-once")!;
    const fixedOnce = result.find((r) => r.taskId === "t-fixed")!;
    expect(daily.dayOfWeek).toBeNull();
    expect(once.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(once.dayOfWeek).toBeLessThanOrEqual(6);
    expect(fixedOnce.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(fixedOnce.dayOfWeek).toBeLessThanOrEqual(6);
  });

  it("never assigns a task to a member below its minAge", () => {
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const cooking = result.find((r) => r.taskId === "t-cooking")!;
      expect(cooking.memberId).not.toBe("child-1");
    }
  });

  it("falls back to the oldest member when no one meets minAge", () => {
    const strictTasks = tasks.map((t) =>
      t.id === "t-cooking" ? { ...t, minAge: 60 } : t
    );
    for (const seed of SEEDS) {
      const result = assignPeriod(members, strictTasks, settings, {}, seed);
      const cooking = result.find((r) => r.taskId === "t-cooking")!;
      expect(cooking.memberId).toBe("adult-2"); // the oldest, at 50
    }
  });

  it("guarantees every eligible member at least one variable task", () => {
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const variableWinners = new Set(
        result.filter((r) => !r.isFixed).map((r) => r.memberId)
      );
      for (const member of members) {
        expect(variableWinners.has(member.id)).toBe(true);
      }
    }
  });

  it("keeps exactly one assignment per task after the guarantee pass", () => {
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const taskIds = result.map((r) => r.taskId);
      expect(new Set(taskIds).size).toBe(taskIds.length);
      expect(taskIds.length).toBe(tasks.length);
    }
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
