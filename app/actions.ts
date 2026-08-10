"use server";

import { revalidatePath } from "next/cache";
import {
  reassignMember,
  setCompletion,
  swapAssignmentMembers,
} from "@/lib/data/assignments";
import { listTasks } from "@/lib/data/tasks";
import { verifySecurityPassword } from "@/lib/security/password";

export type ActionState = { error?: string; ok?: true };

export async function toggleCompleteAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const completed = formData.get("completed") === "true";
  if (!assignmentId) return { error: "Falta el identificador de la tarea." };

  const result = await setCompletion(assignmentId, completed);
  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath("/semana");
  return { ok: true };
}

export async function reassignMemberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  if (!assignmentId || !taskId || !memberId) {
    return { error: "Faltan datos para reasignar la tarea." };
  }

  const password = String(formData.get("password") ?? "");
  if (!verifySecurityPassword(password)) {
    return { error: "Clave incorrecta." };
  }

  const tasks = await listTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.eligibleMemberIds.includes(memberId)) {
    return { error: "Ese integrante no puede hacer esta tarea." };
  }

  const result = await reassignMember(assignmentId, memberId);
  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath("/semana");
  return { ok: true };
}

export async function resolveDuelAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const assignmentAId = String(formData.get("assignmentAId") ?? "");
  const memberAId = String(formData.get("memberAId") ?? "");
  const assignmentBId = String(formData.get("assignmentBId") ?? "");
  const memberBId = String(formData.get("memberBId") ?? "");
  if (!assignmentAId || !memberAId || !assignmentBId || !memberBId) {
    return { error: "Faltan datos para el intercambio." };
  }

  const result = await swapAssignmentMembers(
    assignmentAId,
    memberAId,
    assignmentBId,
    memberBId
  );
  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath("/semana");
  return { ok: true };
}
