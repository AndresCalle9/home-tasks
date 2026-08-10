import "server-only";
import { supabase } from "@/lib/supabase/server-client";
import { listTasks } from "@/lib/data/tasks";

export type Period = {
  id: string;
  startDate: string;
  endDate: string;
  status: "draft" | "assigned";
};

export type ReviewRow = {
  taskId: string;
  taskName: string;
  isDaily: boolean;
  isFixed: boolean;
  fixedMemberIds: string[];
};

function isMonday(dateStr: string): boolean {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay() === 1;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function createPeriod(
  startDate: string
): Promise<{ periodId: string; rows: ReviewRow[] } | { error: string }> {
  if (!isMonday(startDate)) {
    return { error: "La fecha de inicio debe ser un lunes." };
  }
  const endDate = addDays(startDate, 6);

  const { data: period, error: periodError } = await supabase
    .from("periods")
    .insert({ start_date: startDate, end_date: endDate })
    .select("id")
    .single();
  if (periodError) return { error: periodError.message };

  const tasks = await listTasks();
  const { data: settingsRows, error: settingsError } = await supabase
    .from("period_task_settings")
    .insert(
      tasks.map((task) => ({
        period_id: period.id,
        task_id: task.id,
        is_fixed: task.defaultIsFixed,
      }))
    )
    .select("id, task_id");
  if (settingsError) return { error: settingsError.message };

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const fixedMemberRows = settingsRows.flatMap((row) => {
    const task = tasksById.get(row.task_id);
    if (!task || !task.defaultIsFixed) return [];
    return task.defaultFixedMemberIds.map((memberId) => ({
      period_task_setting_id: row.id,
      member_id: memberId,
    }));
  });
  if (fixedMemberRows.length > 0) {
    const { error: fixedError } = await supabase
      .from("period_task_setting_fixed_members")
      .insert(fixedMemberRows);
    if (fixedError) return { error: fixedError.message };
  }

  const rows: ReviewRow[] = tasks.map((task) => ({
    taskId: task.id,
    taskName: task.name,
    isDaily: task.isDaily,
    isFixed: task.defaultIsFixed,
    fixedMemberIds: task.defaultFixedMemberIds,
  }));

  return { periodId: period.id, rows };
}

export async function getCurrentPeriod(): Promise<Period | null> {
  const { data, error } = await supabase
    .from("periods")
    .select("id, start_date, end_date, status")
    .eq("status", "assigned")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    startDate: data.start_date,
    endDate: data.end_date,
    status: data.status,
  };
}

export async function listPeriodTaskSettings(
  periodId: string
): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("period_task_settings")
    .select(
      "task_id, is_fixed, tasks(name, is_daily), period_task_setting_fixed_members(member_id)"
    )
    .eq("period_id", periodId);

  if (error) throw new Error(error.message);
  return (data as unknown as Array<{
    task_id: string;
    is_fixed: boolean;
    tasks: { name: string; is_daily: boolean };
    period_task_setting_fixed_members: Array<{ member_id: string }>;
  }>).map((row) => ({
    taskId: row.task_id,
    taskName: row.tasks.name,
    isDaily: row.tasks.is_daily,
    isFixed: row.is_fixed,
    fixedMemberIds: row.period_task_setting_fixed_members.map((m) => m.member_id),
  }));
}

export async function updatePeriodTaskSettings(
  periodId: string,
  rows: Array<{ taskId: string; isFixed: boolean; fixedMemberIds: string[] }>
): Promise<{ error: string } | { ok: true }> {
  const { data: settingsRows, error } = await supabase
    .from("period_task_settings")
    .upsert(
      rows.map((row) => ({
        period_id: periodId,
        task_id: row.taskId,
        is_fixed: row.isFixed,
      })),
      { onConflict: "period_id,task_id" }
    )
    .select("id, task_id");
  if (error) return { error: error.message };

  const settingIdByTaskId = new Map(settingsRows.map((r) => [r.task_id, r.id]));
  const settingIds = settingsRows.map((r) => r.id);

  const { error: deleteError } = await supabase
    .from("period_task_setting_fixed_members")
    .delete()
    .in("period_task_setting_id", settingIds);
  if (deleteError) return { error: deleteError.message };

  const fixedMemberRows = rows.flatMap((row) => {
    const settingId = settingIdByTaskId.get(row.taskId);
    if (!settingId || !row.isFixed) return [];
    return row.fixedMemberIds.map((memberId) => ({
      period_task_setting_id: settingId,
      member_id: memberId,
    }));
  });
  if (fixedMemberRows.length > 0) {
    const { error: insertError } = await supabase
      .from("period_task_setting_fixed_members")
      .insert(fixedMemberRows);
    if (insertError) return { error: insertError.message };
  }

  return { ok: true };
}
