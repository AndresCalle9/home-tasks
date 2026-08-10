import "server-only";
import { supabase } from "@/lib/supabase/server-client";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";
import { listPeriodTaskSettings } from "@/lib/data/periods";
import { assignPeriod, type PeriodTaskSetting } from "@/lib/algorithm/assign";
import { DAY_NAMES, type DaySchedule } from "@/lib/calendar-schedule";
import type { MutationResult } from "@/lib/data/errors";

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
    fixedMemberIds: row.fixedMemberIds,
  }));

  const seed = Math.floor(Math.random() * 2 ** 31);
  const results = assignPeriod(
    members.map((m) => ({ id: m.id, age: m.age })),
    tasks.map((t) => ({
      id: t.id,
      isDaily: t.isDaily,
      minAge: t.minAge,
      dayGroup: t.dayGroup,
      timesPerWeek: t.timesPerWeek,
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

  // A non-daily task's dayOfWeek is an array of 3 days — expand into one
  // row per day. A daily task's dayOfWeek is null — a single row.
  type AssignmentRow = {
    period_id: string;
    task_id: string;
    member_id: string;
    day_of_week: number | null;
    is_fixed: boolean;
  };
  const rows = results.flatMap((r): AssignmentRow[] =>
    r.dayOfWeek == null
      ? [
          {
            period_id: periodId,
            task_id: r.taskId,
            member_id: r.memberId,
            day_of_week: null,
            is_fixed: r.isFixed,
          },
        ]
      : r.dayOfWeek.map((day) => ({
          period_id: periodId,
          task_id: r.taskId,
          member_id: r.memberId,
          day_of_week: day,
          is_fixed: r.isFixed,
        }))
  );

  const { error: insertError } = await supabase
    .from("assignments")
    .insert(rows);
  if (insertError) return { error: insertError.message };

  const { error: periodError } = await supabase
    .from("periods")
    .update({ status: "assigned", seed })
    .eq("id", periodId);
  if (periodError) return { error: periodError.message };

  return { ok: true };
}

// Manual, single-task rebalance from the calendar — updates every day-row
// a (possibly multi-day) variable task has for this period, all at once,
// so it keeps exactly one responsible member. Never touches fixed rows.
export async function reassignTask(
  periodId: string,
  taskId: string,
  memberId: string
): Promise<MutationResult> {
  const { error } = await supabase
    .from("assignments")
    .update({ member_id: memberId })
    .eq("period_id", periodId)
    .eq("task_id", taskId)
    .eq("is_fixed", false);
  if (error) {
    return { error: "Ocurrió un error guardando la asignación. Intenta de nuevo." };
  }
  return { ok: true };
}

// Manual day override for a times_per_week = 1 task — there's exactly one
// row for (period_id, task_id) in that case. Works for fixed or variable
// tasks alike (unlike reassignTask, this changes "when", not "who").
// day_group / times_per_week validation happens in the calling action, same
// layering as reassignTask's min_age check in reassignTaskAction.
export async function reassignTaskDay(
  periodId: string,
  taskId: string,
  dayOfWeek: number
): Promise<MutationResult> {
  const { error } = await supabase
    .from("assignments")
    .update({ day_of_week: dayOfWeek })
    .eq("period_id", periodId)
    .eq("task_id", taskId);
  if (error) {
    return { error: "Ocurrió un error guardando el día. Intenta de nuevo." };
  }
  return { ok: true };
}

// Completion is looked up by the day being *rendered*, not by the row's own
// (possibly null) day_of_week — see supabase/schema.sql's comment on
// assignment_completions for why a daily task's single row still tracks 7
// independent completion states this way.
export async function getWeekScheduleForPeriod(
  periodId: string
): Promise<DaySchedule[]> {
  const [{ data, error }, members, tasks] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, task_id, member_id, day_of_week, is_fixed")
      .eq("period_id", periodId),
    listMembers(),
    listTasks(),
  ]);
  if (error) throw new Error(error.message);

  const assignmentRows = data as unknown as Array<{
    id: string;
    task_id: string;
    member_id: string;
    day_of_week: number | null;
    is_fixed: boolean;
  }>;

  const assignmentIds = assignmentRows.map((a) => a.id);
  const completedByKey = new Map<string, boolean>();
  if (assignmentIds.length > 0) {
    const { data: completions, error: completionsError } = await supabase
      .from("assignment_completions")
      .select("assignment_id, day_of_week, completed")
      .in("assignment_id", assignmentIds);
    if (completionsError) throw new Error(completionsError.message);

    for (const c of completions as unknown as Array<{
      assignment_id: string;
      day_of_week: number;
      completed: boolean;
    }>) {
      completedByKey.set(`${c.assignment_id}:${c.day_of_week}`, c.completed);
    }
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  return DAY_NAMES.map((dayName, dayOfWeek) => {
    const items = assignmentRows
      .filter((a) => a.day_of_week === null || a.day_of_week === dayOfWeek)
      .map((a) => ({
        assignmentId: a.id,
        task: taskById.get(a.task_id)!,
        member: memberById.get(a.member_id)!,
        isFixed: a.is_fixed,
        completed: completedByKey.get(`${a.id}:${dayOfWeek}`) ?? false,
      }));

    return { dayOfWeek, dayName, items };
  });
}

export async function toggleAssignmentCompletion(
  assignmentId: string,
  dayOfWeek: number,
  completed: boolean
): Promise<MutationResult> {
  const { error } = await supabase.from("assignment_completions").upsert(
    { assignment_id: assignmentId, day_of_week: dayOfWeek, completed },
    { onConflict: "assignment_id,day_of_week" }
  );
  if (error) {
    return { error: "Ocurrió un error guardando el estado. Intenta de nuevo." };
  }
  return { ok: true };
}
