import "server-only";
import { supabase } from "@/lib/supabase/server-client";
import { mapDbError, type MutationResult } from "@/lib/data/errors";

export type Task = {
  id: string;
  name: string;
  isDaily: boolean;
  defaultIsFixed: boolean;
  defaultFixedMemberId: string | null;
  minAge: number | null;
  dayGroup: string | null;
};

type TaskRow = {
  id: string;
  name: string;
  is_daily: boolean;
  default_is_fixed: boolean;
  default_fixed_member_id: string | null;
  min_age: number | null;
  day_group: string | null;
};

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    isDaily: row.is_daily,
    defaultIsFixed: row.default_is_fixed,
    defaultFixedMemberId: row.default_fixed_member_id,
    minAge: row.min_age,
    dayGroup: row.day_group,
  };
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, name, is_daily, default_is_fixed, default_fixed_member_id, min_age, day_group"
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data.map(toTask);
}

export type TaskInput = {
  name: string;
  isDaily: boolean;
  defaultIsFixed: boolean;
  defaultFixedMemberId: string | null;
  minAge: number | null;
  dayGroup: string | null;
};

export async function createTask(input: TaskInput): Promise<MutationResult> {
  const { error } = await supabase.from("tasks").insert({
    name: input.name,
    is_daily: input.isDaily,
    default_is_fixed: input.defaultIsFixed,
    default_fixed_member_id: input.defaultFixedMemberId,
    min_age: input.minAge,
    day_group: input.dayGroup,
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
      default_is_fixed: input.defaultIsFixed,
      default_fixed_member_id: input.defaultFixedMemberId,
      min_age: input.minAge,
      day_group: input.dayGroup,
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
