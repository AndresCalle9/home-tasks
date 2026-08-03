import "server-only";
import { supabase } from "@/lib/supabase/server-client";
import { mapDbError, type MutationResult } from "@/lib/data/errors";

export type Task = {
  id: string;
  name: string;
  isDaily: boolean;
  weight: number;
  defaultIsFixed: boolean;
  defaultFixedMemberId: string | null;
  minAge: number | null;
};

type TaskRow = {
  id: string;
  name: string;
  is_daily: boolean;
  weight: number;
  default_is_fixed: boolean;
  default_fixed_member_id: string | null;
  min_age: number | null;
};

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    isDaily: row.is_daily,
    weight: row.weight,
    defaultIsFixed: row.default_is_fixed,
    defaultFixedMemberId: row.default_fixed_member_id,
    minAge: row.min_age,
  };
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, name, is_daily, weight, default_is_fixed, default_fixed_member_id, min_age"
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data.map(toTask);
}

export type TaskInput = {
  name: string;
  isDaily: boolean;
  weight: number;
  defaultIsFixed: boolean;
  defaultFixedMemberId: string | null;
  minAge: number | null;
};

export async function createTask(input: TaskInput): Promise<MutationResult> {
  const { error } = await supabase.from("tasks").insert({
    name: input.name,
    is_daily: input.isDaily,
    weight: input.weight,
    default_is_fixed: input.defaultIsFixed,
    default_fixed_member_id: input.defaultFixedMemberId,
    min_age: input.minAge,
  });
  if (error) return { error: mapDbError(error, "tarea") };
  return { ok: true };
}

export async function updateTask(
  id: string,
  input: TaskInput
): Promise<MutationResult> {
  const { error } = await supabase
    .from("tasks")
    .update({
      name: input.name,
      is_daily: input.isDaily,
      weight: input.weight,
      default_is_fixed: input.defaultIsFixed,
      default_fixed_member_id: input.defaultFixedMemberId,
      min_age: input.minAge,
    })
    .eq("id", id);
  if (error) return { error: mapDbError(error, "tarea") };
  return { ok: true };
}

export async function deleteTask(id: string): Promise<MutationResult> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: mapDbError(error, "tarea") };
  return { ok: true };
}
