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
  fixedMemberId: string | null;
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
  const { error: settingsError } = await supabase
    .from("period_task_settings")
    .insert(
      tasks.map((task) => ({
        period_id: period.id,
        task_id: task.id,
        is_fixed: task.defaultIsFixed,
        fixed_member_id: task.defaultFixedMemberId,
      }))
    );
  if (settingsError) return { error: settingsError.message };

  const rows: ReviewRow[] = tasks.map((task) => ({
    taskId: task.id,
    taskName: task.name,
    isDaily: task.isDaily,
    isFixed: task.defaultIsFixed,
    fixedMemberId: task.defaultFixedMemberId,
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
    .select("task_id, is_fixed, fixed_member_id, tasks(name, is_daily)")
    .eq("period_id", periodId);

  if (error) throw new Error(error.message);
  return (data as unknown as Array<{
    task_id: string;
    is_fixed: boolean;
    fixed_member_id: string | null;
    tasks: { name: string; is_daily: boolean };
  }>).map((row) => ({
    taskId: row.task_id,
    taskName: row.tasks.name,
    isDaily: row.tasks.is_daily,
    isFixed: row.is_fixed,
    fixedMemberId: row.fixed_member_id,
  }));
}

export async function updatePeriodTaskSettings(
  periodId: string,
  rows: Array<{ taskId: string; isFixed: boolean; fixedMemberId: string | null }>
): Promise<{ error: string } | { ok: true }> {
  const { error } = await supabase.from("period_task_settings").upsert(
    rows.map((row) => ({
      period_id: periodId,
      task_id: row.taskId,
      is_fixed: row.isFixed,
      fixed_member_id: row.fixedMemberId,
    })),
    { onConflict: "period_id,task_id" }
  );
  if (error) return { error: error.message };
  return { ok: true };
}
