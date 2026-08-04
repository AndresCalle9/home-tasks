import "server-only";
import { supabase } from "@/lib/supabase/server-client";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";
import { listPeriodTaskSettings } from "@/lib/data/periods";
import { assignPeriod, type PeriodTaskSetting } from "@/lib/algorithm/assign";
import { DAY_NAMES, type DaySchedule } from "@/lib/calendar-schedule";

export async function getHistoricalTaskCount(
  excludePeriodId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("assignments")
    .select("member_id")
    .eq("is_fixed", false)
    .neq("period_id", excludePeriodId);

  if (error) throw new Error(error.message);

  const count: Record<string, number> = {};
  for (const row of data as unknown as Array<{ member_id: string }>) {
    count[row.member_id] = (count[row.member_id] ?? 0) + 1;
  }
  return count;
}

export async function runAssignment(
  periodId: string
): Promise<{ error: string } | { ok: true }> {
  const [members, tasks, periodTaskSettings, historicalTaskCount] =
    await Promise.all([
      listMembers(),
      listTasks(),
      listPeriodTaskSettings(periodId),
      getHistoricalTaskCount(periodId),
    ]);

  const settings: PeriodTaskSetting[] = periodTaskSettings.map((row) => ({
    taskId: row.taskId,
    isFixed: row.isFixed,
    fixedMemberId: row.fixedMemberId,
  }));

  const seed = Math.floor(Math.random() * 2 ** 31);
  const results = assignPeriod(
    members.map((m) => ({ id: m.id, age: m.age })),
    tasks.map((t) => ({
      id: t.id,
      isDaily: t.isDaily,
      minAge: t.minAge,
    })),
    settings,
    historicalTaskCount,
    seed
  );

  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .eq("period_id", periodId);
  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await supabase.from("assignments").insert(
    results.map((r) => ({
      period_id: periodId,
      task_id: r.taskId,
      member_id: r.memberId,
      day_of_week: r.dayOfWeek,
      is_fixed: r.isFixed,
    }))
  );
  if (insertError) return { error: insertError.message };

  const { error: periodError } = await supabase
    .from("periods")
    .update({ status: "assigned", seed })
    .eq("id", periodId);
  if (periodError) return { error: periodError.message };

  return { ok: true };
}

export async function getWeekScheduleForPeriod(
  periodId: string
): Promise<DaySchedule[]> {
  const [{ data, error }, members, tasks] = await Promise.all([
    supabase
      .from("assignments")
      .select("task_id, member_id, day_of_week, is_fixed")
      .eq("period_id", periodId),
    listMembers(),
    listTasks(),
  ]);
  if (error) throw new Error(error.message);

  const memberById = new Map(members.map((m) => [m.id, m]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  return DAY_NAMES.map((dayName, dayOfWeek) => {
    const items = (data as unknown as Array<{
      task_id: string;
      member_id: string;
      day_of_week: number | null;
      is_fixed: boolean;
    }>)
      .filter((a) => a.day_of_week === null || a.day_of_week === dayOfWeek)
      .map((a) => ({
        task: taskById.get(a.task_id)!,
        member: memberById.get(a.member_id)!,
        isFixed: a.is_fixed,
      }));

    return { dayOfWeek, dayName, items };
  });
}
