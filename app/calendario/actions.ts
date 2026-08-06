"use server";

import { revalidatePath } from "next/cache";
import { reassignTask, runAssignment } from "@/lib/data/assignments";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";

export type RerollState = { error?: string };

export async function rerollAction(
  _prevState: RerollState,
  formData: FormData
): Promise<RerollState> {
  const periodId = String(formData.get("periodId") ?? "");
  if (!periodId) return { error: "Falta el identificador del periodo." };

  const result = await runAssignment(periodId);
  if ("error" in result) return result;

  revalidatePath("/calendario");
  return {};
}

export type ReassignState = { error?: string };

export async function reassignTaskAction(
  _prevState: ReassignState,
  formData: FormData
): Promise<ReassignState> {
  const periodId = String(formData.get("periodId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  if (!periodId || !taskId || !memberId) {
    return { error: "Faltan datos para reasignar la tarea." };
  }

  const [tasks, members] = await Promise.all([listTasks(), listMembers()]);
  const task = tasks.find((t) => t.id === taskId);
  const member = members.find((m) => m.id === memberId);
  if (!task || !member) {
    return { error: "Tarea o integrante no válido." };
  }
  if (task.minAge != null && member.age < task.minAge) {
    return { error: `Esta tarea requiere ${task.minAge}+ años.` };
  }

  const result = await reassignTask(periodId, taskId, memberId);
  if ("error" in result) return result;

  revalidatePath("/calendario");
  return {};
}
