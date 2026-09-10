import "server-only";
import { cache } from "react";
import { createServerAuthClient } from "@/lib/supabase/server-auth-client";
import { mapDbError, type MutationResult } from "@/lib/data/errors";
import type { Effort } from "@/lib/effort";

export type { Effort };
export type Frequency = "diario" | "dias" | "semanal";

export type Task = {
  id: string;
  name: string;
  icon: string;
  effort: Effort;
  freq: Frequency;
  // 0 = Monday ... 6 = Sunday. Empty when freq === "diario" (every day
  // applies regardless of this list).
  days: number[];
  active: boolean;
  eligibleMemberIds: string[];
};

type TaskRow = {
  id: string;
  name: string;
  icon: string;
  effort: Effort;
  freq: Frequency;
  days: number[];
  active: boolean;
  task_eligible_members: Array<{ member_id: string }>;
};

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    effort: row.effort,
    freq: row.freq,
    days: row.days,
    active: row.active,
    eligibleMemberIds: row.task_eligible_members.map((m) => m.member_id),
  };
}

export const listTasks = cache(async (householdId: string): Promise<Task[]> => {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, name, icon, effort, freq, days, active, task_eligible_members(member_id)"
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as TaskRow[]).map(toTask);
});

export type TaskConflict = { taskAId: string; taskBId: string };

export async function listTaskConflicts(householdId: string): Promise<TaskConflict[]> {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase
    .from("task_conflicts")
    .select("task_a_id, task_b_id")
    .eq("household_id", householdId);
  if (error) throw new Error(error.message);
  return (data as unknown as Array<{ task_a_id: string; task_b_id: string }>).map(
    (row) => ({ taskAId: row.task_a_id, taskBId: row.task_b_id })
  );
}

export type TaskInput = {
  name: string;
  icon: string;
  effort: Effort;
  freq: Frequency;
  days: number[];
  eligibleMemberIds: string[];
};

async function setEligibleMembers(
  householdId: string,
  taskId: string,
  memberIds: string[]
): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  const { error: deleteError } = await supabase
    .from("task_eligible_members")
    .delete()
    .eq("task_id", taskId)
    .eq("household_id", householdId);
  if (deleteError) return { error: mapDbError(deleteError, "tarea") };

  if (memberIds.length === 0) return { ok: true };

  const { error: insertError } = await supabase.from("task_eligible_members").insert(
    memberIds.map((memberId) => ({
      household_id: householdId,
      task_id: taskId,
      member_id: memberId,
    }))
  );
  if (insertError) return { error: mapDbError(insertError, "tarea") };
  return { ok: true };
}

export async function createTask(
  householdId: string,
  input: TaskInput
): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      household_id: householdId,
      name: input.name,
      icon: input.icon,
      effort: input.effort,
      freq: input.freq,
      days: input.freq === "diario" ? [] : input.days,
    })
    .select("id")
    .single();
  if (error) return { error: mapDbError(error, "tarea") };

  return setEligibleMembers(householdId, data.id, input.eligibleMemberIds);
}

export async function updateTask(
  householdId: string,
  id: string,
  input: TaskInput
): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      name: input.name,
      icon: input.icon,
      effort: input.effort,
      freq: input.freq,
      days: input.freq === "diario" ? [] : input.days,
    })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { error: mapDbError(error, "tarea") };

  return setEligibleMembers(householdId, id, input.eligibleMemberIds);
}

export async function setTaskActive(
  householdId: string,
  id: string,
  active: boolean
): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("tasks")
    .update({ active })
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { error: mapDbError(error, "tarea") };
  return { ok: true };
}

export async function deleteTask(householdId: string, id: string): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);
  if (error) return { error: mapDbError(error, "tarea") };
  return { ok: true };
}

export async function toggleTaskEligibility(
  householdId: string,
  taskId: string,
  memberId: string,
  eligible: boolean
): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  if (eligible) {
    const { error } = await supabase
      .from("task_eligible_members")
      .insert({ household_id: householdId, task_id: taskId, member_id: memberId });
    if (error) return { error: mapDbError(error, "tarea") };
    return { ok: true };
  }

  const { error } = await supabase
    .from("task_eligible_members")
    .delete()
    .eq("task_id", taskId)
    .eq("member_id", memberId)
    .eq("household_id", householdId);
  if (error) return { error: mapDbError(error, "tarea") };
  return { ok: true };
}
