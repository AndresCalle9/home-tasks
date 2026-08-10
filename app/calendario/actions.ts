"use server";

import { revalidatePath } from "next/cache";
import {
  reassignTask,
  reassignTaskDay,
  runAssignment,
  toggleAssignmentCompletion,
} from "@/lib/data/assignments";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";
import { verifySecurityPassword } from "@/lib/security/password";

export type RerollState = { error?: string };

export async function rerollAction(
  _prevState: RerollState,
  formData: FormData
): Promise<RerollState> {
  const periodId = String(formData.get("periodId") ?? "");
  if (!periodId) return { error: "Falta el identificador del periodo." };

  const password = String(formData.get("password") ?? "");
  if (!verifySecurityPassword(password)) {
    return { error: "Clave incorrecta." };
  }

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

  const password = String(formData.get("password") ?? "");
  if (!verifySecurityPassword(password)) {
    return { error: "Clave incorrecta." };
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

export type ReassignDayState = { error?: string };

export async function reassignTaskDayAction(
  _prevState: ReassignDayState,
  formData: FormData
): Promise<ReassignDayState> {
  const periodId = String(formData.get("periodId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const dayOfWeekRaw = formData.get("dayOfWeek");
  const dayOfWeek = Number(dayOfWeekRaw);
  if (
    !periodId ||
    !taskId ||
    dayOfWeekRaw === null ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    return { error: "Faltan datos para cambiar el día." };
  }

  const password = String(formData.get("password") ?? "");
  if (!verifySecurityPassword(password)) {
    return { error: "Clave incorrecta." };
  }

  const tasks = await listTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return { error: "Tarea no válida." };
  }
  if (task.timesPerWeek !== 1) {
    return {
      error: "Solo se puede cambiar el día de tareas de 1 vez por semana.",
    };
  }
  if (task.dayGroup != null) {
    return {
      error: `Esta tarea comparte el grupo de día "${task.dayGroup}" con otras tareas; no se puede cambiar su día individualmente.`,
    };
  }

  const result = await reassignTaskDay(periodId, taskId, dayOfWeek);
  if ("error" in result) return result;

  revalidatePath("/calendario");
  return {};
}

export type ToggleCompletionState = { error?: string };

export async function toggleAssignmentCompletionAction(
  _prevState: ToggleCompletionState,
  formData: FormData
): Promise<ToggleCompletionState> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const dayOfWeekRaw = formData.get("dayOfWeek");
  const dayOfWeek = Number(dayOfWeekRaw);
  const completed = formData.get("completed") === "true";
  if (
    !assignmentId ||
    dayOfWeekRaw === null ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    return { error: "Faltan datos para actualizar la tarea." };
  }

  const result = await toggleAssignmentCompletion(
    assignmentId,
    dayOfWeek,
    completed
  );
  if ("error" in result) return result;

  revalidatePath("/calendario");
  return {};
}
