import "server-only";
import { supabase } from "@/lib/supabase/server-client";
import { mapDbError, type MutationResult } from "@/lib/data/errors";

export type Task = {
  id: string;
  name: string;
  isDaily: boolean;
  defaultIsFixed: boolean;
  defaultFixedMemberIds: string[];
  minAge: number | null;
  dayGroup: string | null;
  timesPerWeek: number | null;
};

type TaskRow = {
  id: string;
  name: string;
  is_daily: boolean;
  default_is_fixed: boolean;
  min_age: number | null;
  day_group: string | null;
  times_per_week: number | null;
  task_default_fixed_members: Array<{ member_id: string }>;
};

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    isDaily: row.is_daily,
    defaultIsFixed: row.default_is_fixed,
    defaultFixedMemberIds: row.task_default_fixed_members.map((m) => m.member_id),
    minAge: row.min_age,
    dayGroup: row.day_group,
    timesPerWeek: row.times_per_week,
  };
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, name, is_daily, default_is_fixed, min_age, day_group, times_per_week, task_default_fixed_members(member_id)"
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as TaskRow[]).map(toTask);
}

export type TaskInput = {
  name: string;
  isDaily: boolean;
  defaultIsFixed: boolean;
  defaultFixedMemberIds: string[];
  minAge: number | null;
  dayGroup: string | null;
  timesPerWeek: number | null;
};

async function setDefaultFixedMembers(
  taskId: string,
  memberIds: string[]
): Promise<MutationResult> {
  const { error: deleteError } = await supabase
    .from("task_default_fixed_members")
    .delete()
    .eq("task_id", taskId);
  if (deleteError) return { error: mapDbError(deleteError, "tarea") };

  if (memberIds.length === 0) return { ok: true };

  const { error: insertError } = await supabase
    .from("task_default_fixed_members")
    .insert(memberIds.map((memberId) => ({ task_id: taskId, member_id: memberId })));
  if (insertError) return { error: mapDbError(insertError, "tarea") };
  return { ok: true };
}

export async function createTask(input: TaskInput): Promise<MutationResult> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      name: input.name,
      is_daily: input.isDaily,
      default_is_fixed: input.defaultIsFixed,
      min_age: input.minAge,
      day_group: input.dayGroup,
      times_per_week: input.timesPerWeek,
    })
    .select("id")
    .single();
  if (error) return { error: mapDbError(error, "tarea") };

  return setDefaultFixedMembers(
    data.id,
    input.defaultIsFixed ? input.defaultFixedMemberIds : []
  );
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
      min_age: input.minAge,
      day_group: input.dayGroup,
      times_per_week: input.timesPerWeek,
    })
    .eq("id", id);
  if (error) return { error: mapDbError(error, "tarea") };

  return setDefaultFixedMembers(
    id,
    input.defaultIsFixed ? input.defaultFixedMemberIds : []
  );
}

export async function deleteTask(id: string): Promise<MutationResult> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: mapDbError(error, "tarea") };
  return { ok: true };
}
