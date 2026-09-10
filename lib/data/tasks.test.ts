import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "./test-utils/mock-supabase-client";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server-auth-client", () => ({
  createServerAuthClient: vi.fn(),
}));

const { createServerAuthClient } = await import("@/lib/supabase/server-auth-client");
const { listTasks, createTask, toggleTaskEligibility } = await import("./tasks");

const HOUSEHOLD_A = "11111111-1111-1111-1111-111111111111";

describe("tasks data layer household scoping", () => {
  it("listTasks filters by the caller's household_id", async () => {
    const { client, from, builder } = createMockSupabaseClient({ data: [], error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await listTasks(HOUSEHOLD_A);

    expect(from).toHaveBeenCalledWith("tasks");
    expect(builder.calls).toContainEqual({ method: "eq", args: ["household_id", HOUSEHOLD_A] });
  });

  it("createTask tags the task row and its eligibility rows with household_id", async () => {
    const { client, from, builder } = createMockSupabaseClient({
      data: { id: "task-1" },
      error: null,
    });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await createTask(HOUSEHOLD_A, {
      name: "Barrer",
      icon: "🧹",
      effort: "media",
      freq: "diario",
      days: [],
      eligibleMemberIds: ["m1", "m2"],
    });

    expect(builder.calls[0]).toEqual({
      method: "insert",
      args: [
        {
          household_id: HOUSEHOLD_A,
          name: "Barrer",
          icon: "🧹",
          effort: "media",
          freq: "diario",
          days: [],
        },
      ],
    });
    // setEligibleMembers re-uses `from`, so every call — including the one
    // for task_eligible_members — went through the same household-scoped
    // client rather than a second, unscoped one.
    expect(from).toHaveBeenCalledWith("task_eligible_members");
  });

  it("toggleTaskEligibility tags an insert with household_id and scopes deletes by it", async () => {
    const { client, builder } = createMockSupabaseClient({ data: null, error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await toggleTaskEligibility(HOUSEHOLD_A, "task-1", "member-1", true);
    expect(builder.calls).toContainEqual({
      method: "insert",
      args: [{ household_id: HOUSEHOLD_A, task_id: "task-1", member_id: "member-1" }],
    });

    await toggleTaskEligibility(HOUSEHOLD_A, "task-1", "member-1", false);
    expect(builder.calls).toContainEqual({ method: "eq", args: ["household_id", HOUSEHOLD_A] });
  });
});
