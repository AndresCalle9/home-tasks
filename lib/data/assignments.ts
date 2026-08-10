import "server-only";
import { supabase } from "@/lib/supabase/server-client";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";
import { DAY_NAMES, type DaySchedule } from "@/lib/calendar-schedule";
import type { MutationResult } from "@/lib/data/errors";

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
