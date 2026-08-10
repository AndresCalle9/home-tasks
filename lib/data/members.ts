import "server-only";
import { supabase } from "@/lib/supabase/server-client";
import { mapDbError, type MutationResult } from "@/lib/data/errors";

export type Member = {
  id: string;
  name: string;
  age: number;
};

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id, name, age")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function createMember(
  name: string,
  age: number
): Promise<MutationResult> {
  const { error } = await supabase.from("members").insert({ name, age });
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}

export async function updateMember(
  id: string,
  name: string,
  age: number
): Promise<MutationResult> {
  const { error } = await supabase
    .from("members")
    .update({ name, age })
    .eq("id", id);
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}

export async function deleteMember(id: string): Promise<MutationResult> {
  // task_default_fixed_members / period_task_setting_fixed_members
  // reference members(id) with no ON DELETE clause, so Postgres itself
  // rejects this with a 23503 foreign-key violation while the member is
  // still enabled as a fixed responsible for any task — mapDbError below
  // turns that into the friendly "reassign first" message.
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) return { error: mapDbError(error, "integrante") };
  return { ok: true };
}
