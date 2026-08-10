import "server-only";
import { cache } from "react";
import { supabase } from "@/lib/supabase/server-client";
import type { MutationResult } from "@/lib/data/errors";

export type AssignmentStatus = "pending" | "completed" | "sin-responsable";

export type Assignment = {
  id: string;
  taskId: string;
  memberId: string | null;
  dayOfWeek: number;
  status: AssignmentStatus;
};

type AssignmentRow = {
  id: string;
  task_id: string;
  member_id: string | null;
  day_of_week: number;
  status: AssignmentStatus;
};

function toAssignment(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    taskId: row.task_id,
    memberId: row.member_id,
    dayOfWeek: row.day_of_week,
    status: row.status,
  };
}

// The current week's full schedule — there is no history/period concept
// anymore, only "right now" (see supabase/schema.sql).
export const listAssignments = cache(async (): Promise<Assignment[]> => {
  const { data, error } = await supabase
    .from("assignments")
    .select("id, task_id, member_id, day_of_week, status");
  if (error) throw new Error(error.message);
  return (data as unknown as AssignmentRow[]).map(toAssignment);
});

export type NewAssignment = {
  taskId: string;
  memberId: string | null;
  dayOfWeek: number;
};

// Replaces the entire current week — used by "Repartir nuestra semana".
export async function replaceWeek(rows: NewAssignment[]): Promise<MutationResult> {
  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .not("id", "is", null);
  if (deleteError) return { error: deleteError.message };

  if (rows.length === 0) return { ok: true };

  const { error: insertError } = await supabase.from("assignments").insert(
    rows.map((r) => ({
      task_id: r.taskId,
      member_id: r.memberId,
      day_of_week: r.dayOfWeek,
      status: r.memberId ? "pending" : "sin-responsable",
    }))
  );
  if (insertError) return { error: insertError.message };
  return { ok: true };
}

// Resets completion progress without reshuffling who does what.
export async function resetWeekStatuses(): Promise<MutationResult> {
  const { error: pendingError } = await supabase
    .from("assignments")
    .update({ status: "pending" })
    .not("member_id", "is", null);
  if (pendingError) return { error: pendingError.message };

  const { error: unassignedError } = await supabase
    .from("assignments")
    .update({ status: "sin-responsable" })
    .is("member_id", null);
  if (unassignedError) return { error: unassignedError.message };

  return { ok: true };
}

export async function setCompletion(
  assignmentId: string,
  completed: boolean
): Promise<MutationResult> {
  const { error } = await supabase
    .from("assignments")
    .update({ status: completed ? "completed" : "pending" })
    .eq("id", assignmentId);
  if (error) {
    return { error: "Ocurrió un error guardando el estado. Intenta de nuevo." };
  }
  return { ok: true };
}

export async function reassignMember(
  assignmentId: string,
  memberId: string
): Promise<MutationResult> {
  const { error } = await supabase
    .from("assignments")
    .update({ member_id: memberId, status: "pending" })
    .eq("id", assignmentId);
  if (error) {
    return { error: "Ocurrió un error guardando la asignación. Intenta de nuevo." };
  }
  return { ok: true };
}

// Duel resolution: swap the responsible member between two assignments.
export async function swapAssignmentMembers(
  assignmentAId: string,
  memberAId: string,
  assignmentBId: string,
  memberBId: string
): Promise<MutationResult> {
  const { error: firstError } = await supabase
    .from("assignments")
    .update({ member_id: memberBId })
    .eq("id", assignmentAId);
  if (firstError) return { error: "Ocurrió un error con el intercambio. Intenta de nuevo." };

  const { error: secondError } = await supabase
    .from("assignments")
    .update({ member_id: memberAId })
    .eq("id", assignmentBId);
  if (secondError) return { error: "Ocurrió un error con el intercambio. Intenta de nuevo." };

  return { ok: true };
}
