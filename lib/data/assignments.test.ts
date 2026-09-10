import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "./test-utils/mock-supabase-client";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server-auth-client", () => ({
  createServerAuthClient: vi.fn(),
}));

const { createServerAuthClient } = await import("@/lib/supabase/server-auth-client");
const { listAssignments, replaceWeek, setCompletion } = await import("./assignments");

const HOUSEHOLD_A = "11111111-1111-1111-1111-111111111111";

describe("assignments data layer household scoping", () => {
  it("listAssignments filters by the caller's household_id", async () => {
    const { client, from, builder } = createMockSupabaseClient({ data: [], error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await listAssignments(HOUSEHOLD_A);

    expect(from).toHaveBeenCalledWith("assignments");
    expect(builder.calls).toContainEqual({ method: "eq", args: ["household_id", HOUSEHOLD_A] });
  });

  it("replaceWeek scopes the delete and tags every inserted row with household_id", async () => {
    const { client, builder } = createMockSupabaseClient({ data: null, error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await replaceWeek(HOUSEHOLD_A, [{ taskId: "t1", memberId: "m1", dayOfWeek: 0 }]);

    expect(builder.calls).toContainEqual({ method: "delete", args: [] });
    expect(builder.calls).toContainEqual({ method: "eq", args: ["household_id", HOUSEHOLD_A] });
    expect(builder.calls).toContainEqual({
      method: "insert",
      args: [
        [
          {
            household_id: HOUSEHOLD_A,
            task_id: "t1",
            member_id: "m1",
            day_of_week: 0,
            status: "pending",
          },
        ],
      ],
    });
  });

  it("setCompletion scopes the update to both the assignment id and household_id", async () => {
    const { client, builder } = createMockSupabaseClient({ data: null, error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await setCompletion(HOUSEHOLD_A, "assignment-1", true);

    expect(builder.calls).toContainEqual({ method: "eq", args: ["id", "assignment-1"] });
    expect(builder.calls).toContainEqual({ method: "eq", args: ["household_id", HOUSEHOLD_A] });
  });
});
