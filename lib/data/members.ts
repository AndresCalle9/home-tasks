import "server-only";
import { cache } from "react";
import { supabase } from "@/lib/supabase/server-client";
import { mapDbError, type MutationResult } from "@/lib/data/errors";

export type Member = {
  id: string;
  name: string;
  color: string;
};

// Cached per-request: the root layout and every page fetch this, and
// there's no reason to hit Supabase more than once per render.
export const listMembers = cache(async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from("members")
    .select("id, name, color")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
});

export async function createMember(
  name: string,
  color: string
): Promise<MutationResult> {
  const { error } = await supabase.from("members").insert({ name, color });
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}

export async function renameMember(
  id: string,
  name: string
): Promise<MutationResult> {
  const { error } = await supabase
    .from("members")
    .update({ name })
    .eq("id", id);
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}

export async function deleteMember(id: string): Promise<MutationResult> {
  // task_eligible_members references members(id) with no ON DELETE clause,
  // so Postgres rejects this with a 23503 while the member is still
  // eligible for any task — mapDbError turns that into a friendly message.
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}
