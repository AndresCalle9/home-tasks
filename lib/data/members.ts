import "server-only";
import { cache } from "react";
import { createServerAuthClient } from "@/lib/supabase/server-auth-client";
import { mapDbError, type MutationResult } from "@/lib/data/errors";

export type Member = {
  id: string;
  name: string;
  color: string;
};

// Cached per-request: every page fetches this, and there's no reason to
// hit Supabase more than once per render. `.eq("household_id", ...)` is
// explicit application-level scoping on top of the RLS policy that
// already restricts this select to the signed-in household's own rows —
// defense in depth, not the only thing preventing cross-household reads.
export const listMembers = cache(async (householdId: string): Promise<Member[]> => {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, name, color")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
});

export async function createMember(
  householdId: string,
  name: string,
  color: string
): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("members")
    .insert({ household_id: householdId, name, color });
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}

export async function renameMember(
  householdId: string,
  id: string,
  name: string
): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("members")
    .update({ name })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}

export async function deleteMember(householdId: string, id: string): Promise<MutationResult> {
  // task_eligible_members references members(id) with no ON DELETE clause,
  // so Postgres rejects this with a 23503 while the member is still
  // eligible for any task — mapDbError turns that into a friendly message.
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}
