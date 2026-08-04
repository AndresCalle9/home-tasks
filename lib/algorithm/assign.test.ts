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
  { id: "t-fixed", isDaily: false, minAge: null, dayGroup: null },
  { id: "t-var-daily", isDaily: true, minAge: null, dayGroup: null },
  { id: "t-var-once", isDaily: false, minAge: null, dayGroup: null },
  { id: "t-var-2", isDaily: true, minAge: null, dayGroup: null },
  { id: "t-var-3", isDaily: false, minAge: null, dayGroup: null },
  { id: "t-cooking", isDaily: true, minAge: 14, dayGroup: null },
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

  it("never reassigns a fixed task, regardless of this period's balance seeding", () => {
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const fixed = result.find((r) => r.taskId === "t-fixed")!;
      expect(fixed.memberId).toBe("adult-1");
      expect(fixed.isFixed).toBe(true);
    }
  });

  it("lets a member's fixed-task load reduce their variable-task share this period", () => {
    // adult-1 holds the one fixed task. Comparing the same seeds against a
    // matched run where nobody has any fixed load isolates the effect: with
    // the fixed task counting toward adult-1's initial balance seed, they
    // should win fewer of the 5 variable tasks overall than without it.
    const settingsNoFixed = settings.map((s) => ({
      ...s,
      isFixed: false,
      fixedMemberId: null,
    }));
    let winsWithFixed = 0;
    let winsWithoutFixed = 0;
    for (const seed of SEEDS) {
      const withFixed = assignPeriod(members, tasks, settings, {}, seed);
      const withoutFixed = assignPeriod(
        members,
        tasks,
        settingsNoFixed,
        {},
        seed
      );
      winsWithFixed += withFixed.filter(
        (r) => !r.isFixed && r.memberId === "adult-1"
      ).length;
      winsWithoutFixed += withoutFixed.filter(
        (r) => !r.isFixed && r.memberId === "adult-1"
      ).length;
    }
    expect(winsWithFixed).toBeLessThan(winsWithoutFixed);
  });

  it("only lets the currently least-loaded eligible members win a task", () => {
    const openTasks = tasks.map((t) =>
      t.id === "t-cooking" ? { ...t, minAge: null } : t
    );
    // No minAge restrictions here — every member is eligible for every
    // variable task, so age must not affect who ends up with more of them.
    // Fixed tasks now count toward the balance seed, so the guarantee is on
    // the TOTAL (fixed + variable) count, not the variable count alone.
    for (const seed of SEEDS) {
      const result = assignPeriod(members, openTasks, settings, {}, seed);
      const counts: Record<string, number> = {};
      for (const r of result) counts[r.memberId] = (counts[r.memberId] ?? 0) + 1;
      const values = members.map((m) => counts[m.id] ?? 0);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the busiest and least-busy member within 1 total task of each other", () => {
    // Mirrors the real household's setup: t-cooking's minAge excludes
    // child-1 but not teen-1, so eligibility pools differ per task while
    // most members remain eligible for most tasks. Checked on the TOTAL
    // (fixed + variable) count — that's the guarantee this change makes.
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const counts: Record<string, number> = {};
      for (const r of result) counts[r.memberId] = (counts[r.memberId] ?? 0) + 1;
      const values = members.map((m) => counts[m.id] ?? 0);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    }
  });

  it("assigns 3 distinct days for non-daily tasks and null for daily tasks", () => {
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const daily = result.find((r) => r.taskId === "t-var-daily")!;
      const once = result.find((r) => r.taskId === "t-var-once")!;
      const fixedOnce = result.find((r) => r.taskId === "t-fixed")!;
      expect(daily.dayOfWeek).toBeNull();
      for (const r of [once, fixedOnce]) {
        expect(r.dayOfWeek).not.toBeNull();
        expect(r.dayOfWeek!.length).toBe(3);
        expect(new Set(r.dayOfWeek!).size).toBe(3);
        for (const day of r.dayOfWeek!) {
          expect(day).toBeGreaterThanOrEqual(0);
          expect(day).toBeLessThanOrEqual(6);
        }
      }
    }
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

  it("guarantees every member ends up with at least one task overall", () => {
    // adult-1's task might now be entirely their fixed one — that's fine;
    // the guarantee is on total load, not specifically a variable task.
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const counts: Record<string, number> = {};
      for (const r of result) counts[r.memberId] = (counts[r.memberId] ?? 0) + 1;
      for (const member of members) {
        expect(counts[member.id] ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("keeps exactly one assignment per task after the rebalancing pass", () => {
    for (const seed of SEEDS) {
      const result = assignPeriod(members, tasks, settings, {}, seed);
      const taskIds = result.map((r) => r.taskId);
      expect(new Set(taskIds).size).toBe(taskIds.length);
      expect(taskIds.length).toBe(tasks.length);
    }
  });

  it("rebalances when exclusion tasks cluster at the end (real-household regression)", () => {
    // Reproduces the shape that exposed the gap in a real run: a household
    // where most tasks are open to everyone, but the few that exclude one
    // member (age-restricted, e.g. cooking) are all consecutive at the end
    // of the list — so the main loop's per-draw balance can't self-correct
    // before the run finishes.
    const householdMembers = [
      { id: "m1", age: 34 },
      { id: "m2", age: 50 },
      { id: "m3", age: 34 },
      { id: "m4", age: 16 },
      { id: "m5", age: 10 },
    ];
    const openTasks = Array.from({ length: 19 }, (_, i) => ({
      id: `open-${i}`,
      isDaily: i % 2 === 0,
      minAge: null,
      dayGroup: null,
    }));
    const cookingTasks = Array.from({ length: 3 }, (_, i) => ({
      id: `cooking-${i}`,
      isDaily: true,
      minAge: 14,
      dayGroup: null,
    }));
    const allTasks = [...openTasks, ...cookingTasks];
    const allSettings = allTasks.map((t) => ({
      taskId: t.id,
      isFixed: false,
      fixedMemberId: null,
    }));

    for (const seed of SEEDS) {
      const result = assignPeriod(
        householdMembers,
        allTasks,
        allSettings,
        {},
        seed
      );
      const counts: Record<string, number> = {};
      for (const r of result) counts[r.memberId] = (counts[r.memberId] ?? 0) + 1;
      const values = householdMembers.map((m) => counts[m.id] ?? 0);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    }
  });

  it("balances total task counts when one member holds several fixed tasks (real-household regression)", () => {
    // Mirrors a real run: one member ("h3") holds 3 fixed tasks this
    // period, two others hold 1 each, one holds none — while ~22 variable
    // tasks (a few excluding the youngest via minAge) get distributed.
    const householdMembers = [
      { id: "h1", age: 34 },
      { id: "h2", age: 50 },
      { id: "h3", age: 34 },
      { id: "h4", age: 16 },
      { id: "h5", age: 10 },
    ];
    const fixedTaskOwner: Record<string, string> = {
      "fixed-h3-a": "h3",
      "fixed-h3-b": "h3",
      "fixed-h3-c": "h3",
      "fixed-h2": "h2",
      "fixed-h4": "h4",
    };
    const fixedTasks = Object.keys(fixedTaskOwner).map((id) => ({
      id,
      isDaily: false,
      minAge: null,
      dayGroup: null,
    }));
    const variableTasks = Array.from({ length: 22 }, (_, i) => ({
      id: `var-${i}`,
      isDaily: i % 2 === 0,
      minAge: i < 3 ? 14 : null, // a few cooking-like tasks exclude h5 (age 10)
      dayGroup: null,
    }));
    const allTasks = [...fixedTasks, ...variableTasks];
    const allSettings = allTasks.map((t) =>
      fixedTaskOwner[t.id]
        ? { taskId: t.id, isFixed: true, fixedMemberId: fixedTaskOwner[t.id] }
        : { taskId: t.id, isFixed: false, fixedMemberId: null }
    );

    for (const seed of SEEDS) {
      const result = assignPeriod(
        householdMembers,
        allTasks,
        allSettings,
        {},
        seed
      );
      const counts: Record<string, number> = {};
      for (const r of result) counts[r.memberId] = (counts[r.memberId] ?? 0) + 1;
      const values = householdMembers.map((m) => counts[m.id] ?? 0);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    }
  });

  it("gives tasks sharing a dayGroup the identical 3 days, even when different members end up owning them", () => {
    // "wash" and "dry" mirror Lavar ropa / Extender ropa: same dayGroup, but
    // each is independently up for the lottery, so they can land on
    // different members. Grouping only ties days, never people.
    const laundryMembers = [
      { id: "l1", age: 34 },
      { id: "l2", age: 50 },
      { id: "l3", age: 34 },
    ];
    const laundryTasks = [
      { id: "wash", isDaily: false, minAge: null, dayGroup: "laundry" },
      { id: "dry", isDaily: false, minAge: null, dayGroup: "laundry" },
      { id: "fold", isDaily: false, minAge: null, dayGroup: "laundry" },
      { id: "unrelated", isDaily: false, minAge: null, dayGroup: null },
    ];
    const laundrySettings = laundryTasks.map((t) => ({
      taskId: t.id,
      isFixed: false,
      fixedMemberId: null,
    }));

    let sawDifferentMembers = false;
    let sawUnrelatedWithDifferentDays = false;
    for (const seed of SEEDS) {
      const result = assignPeriod(
        laundryMembers,
        laundryTasks,
        laundrySettings,
        {},
        seed
      );
      const wash = result.find((r) => r.taskId === "wash")!;
      const dry = result.find((r) => r.taskId === "dry")!;
      const fold = result.find((r) => r.taskId === "fold")!;
      const unrelated = result.find((r) => r.taskId === "unrelated")!;

      // Same group ⇒ always identical days, with certainty.
      expect(dry.dayOfWeek).toEqual(wash.dayOfWeek);
      expect(fold.dayOfWeek).toEqual(wash.dayOfWeek);

      if (
        wash.memberId !== dry.memberId ||
        wash.memberId !== fold.memberId
      ) {
        sawDifferentMembers = true;
      }
      if (
        JSON.stringify(unrelated.dayOfWeek) !== JSON.stringify(wash.dayOfWeek)
      ) {
        sawUnrelatedWithDifferentDays = true;
      }
    }
    // Confirms grouping doesn't accidentally force the same person onto
    // every task in the group — only the days are shared.
    expect(sawDifferentMembers).toBe(true);
    // The ungrouped task isn't forced to share the laundry group's days —
    // with independent draws it shouldn't match on every single seed (a
    // one-off coincidence on any given seed is expected and fine).
    expect(sawUnrelatedWithDifferentDays).toBe(true);
  });

  it("does not force ungrouped or differently-grouped tasks to share days", () => {
    const soloMembers = [
      { id: "s1", age: 34 },
      { id: "s2", age: 50 },
    ];
    const soloTasks = [
      { id: "solo-a", isDaily: false, minAge: null, dayGroup: null },
      { id: "solo-b", isDaily: false, minAge: null, dayGroup: null },
      { id: "group-x", isDaily: false, minAge: null, dayGroup: "x" },
      { id: "group-y", isDaily: false, minAge: null, dayGroup: "y" },
    ];
    const soloSettings = soloTasks.map((t) => ({
      taskId: t.id,
      isFixed: false,
      fixedMemberId: null,
    }));

    let sawDifferentDays = false;
    for (const seed of SEEDS) {
      const result = assignPeriod(
        soloMembers,
        soloTasks,
        soloSettings,
        {},
        seed
      );
      const a = result.find((r) => r.taskId === "solo-a")!;
      const b = result.find((r) => r.taskId === "solo-b")!;
      if (!(a.dayOfWeek!.every((d) => b.dayOfWeek!.includes(d)))) {
        sawDifferentDays = true;
      }
    }
    expect(sawDifferentDays).toBe(true);
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
