import { describe, expect, it, vi } from "vitest";
import { createMockSupabaseClient } from "./test-utils/mock-supabase-client";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server-auth-client", () => ({
  createServerAuthClient: vi.fn(),
}));

const { createServerAuthClient } = await import("@/lib/supabase/server-auth-client");
const { listMembers, createMember, renameMember, deleteMember } = await import("./members");

const HOUSEHOLD_A = "11111111-1111-1111-1111-111111111111";

describe("members data layer household scoping", () => {
  it("listMembers filters by the caller's household_id", async () => {
    const { client, from, builder } = createMockSupabaseClient({ data: [], error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await listMembers(HOUSEHOLD_A);

    expect(from).toHaveBeenCalledWith("members");
    expect(builder.calls).toContainEqual({ method: "eq", args: ["household_id", HOUSEHOLD_A] });
  });

  it("createMember tags the inserted row with household_id", async () => {
    const { client, builder } = createMockSupabaseClient({ data: null, error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await createMember(HOUSEHOLD_A, "Ana", "#7766E8");

    expect(builder.calls[0]).toEqual({
      method: "insert",
      args: [{ household_id: HOUSEHOLD_A, name: "Ana", color: "#7766E8" }],
    });
  });

  it("renameMember scopes the update to both the row id and household_id", async () => {
    const { client, builder } = createMockSupabaseClient({ data: null, error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await renameMember(HOUSEHOLD_A, "member-1", "Nuevo nombre");

    expect(builder.calls).toContainEqual({ method: "eq", args: ["id", "member-1"] });
    expect(builder.calls).toContainEqual({ method: "eq", args: ["household_id", HOUSEHOLD_A] });
  });

  it("deleteMember scopes the delete to both the row id and household_id", async () => {
    const { client, builder } = createMockSupabaseClient({ data: null, error: null });
    vi.mocked(createServerAuthClient).mockResolvedValue(client as never);

    await deleteMember(HOUSEHOLD_A, "member-1");

    expect(builder.calls).toContainEqual({ method: "eq", args: ["id", "member-1"] });
    expect(builder.calls).toContainEqual({ method: "eq", args: ["household_id", HOUSEHOLD_A] });
  });
});
