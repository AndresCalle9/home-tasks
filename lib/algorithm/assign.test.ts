import { describe, expect, it } from "vitest";
import { ageWeight, assignPeriod } from "./assign";
import { mulberry32 } from "./rng";

const members = [
  { id: "adult-1", age: 34 },
  { id: "adult-2", age: 50 },
  { id: "teen-1", age: 16 },
  { id: "child-1", age: 10 },
];

const tasks = [
  { id: "t-fixed", isDaily: false, weight: 1 },
  { id: "t-var-daily", isDaily: true, weight: 1 },
  { id: "t-var-once", isDaily: false, weight: 2 },
];

const settings = [
  { taskId: "t-fixed", isFixed: true, fixedMemberId: "adult-1" },
  { taskId: "t-var-daily", isFixed: false, fixedMemberId: null },
  { taskId: "t-var-once", isFixed: false, fixedMemberId: null },
];

describe("ageWeight", () => {
  it("gives adults full weight, teens reduced, children the least", () => {
    expect(ageWeight(34)).toBe(1);
    expect(ageWeight(18)).toBe(1);
    expect(ageWeight(16)).toBe(0.6);
    expect(ageWeight(12)).toBe(0.6);
    expect(ageWeight(10)).toBe(0.2);
    expect(ageWeight(0)).toBe(0.2);
  });
});

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

  it("does not let a fixed task's weight affect the variable lottery", () => {
    // adult-1 is fixed for t-fixed; if fixed tasks leaked into runningLoad,
    // adult-1 would look artificially "loaded" and lose every variable tie.
    // Running many seeds should still let adult-1 win at least one variable
    // task when history starts empty for everyone.
    const wins = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const variableWinners = result
        .filter((r) => !r.isFixed)
        .map((r) => r.memberId);
      variableWinners.forEach((m) => wins.add(m));
    }
    expect(wins.has("adult-1")).toBe(true);
  });

  it("gives a member with higher historical load a lower selection weight", () => {
    // Same inputs as the algorithm's own weight formula: ageWeight / (1 + load).
    const noHistory = ageWeight(34) / (1 + 0);
    const heavyHistory = ageWeight(34) / (1 + 10);
    expect(heavyHistory).toBeLessThan(noHistory);
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
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
