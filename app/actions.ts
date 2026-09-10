"use server";

import { revalidatePath } from "next/cache";
import { getCurrentHousehold } from "@/lib/auth/session";
import {
  reassignMember,
  setCompletion,
  swapAssignmentMembers,
} from "@/lib/data/assignments";
import { listTasks } from "@/lib/data/tasks";
import { verifyHouseholdActionPassword } from "@/lib/data/household";

export type ActionState = { error?: string; ok?: true };

export async function toggleCompleteAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const completed = formData.get("completed") === "true";
  if (!assignmentId) return { error: "Falta el identificador de la tarea." };

  const { id: householdId } = await getCurrentHousehold();
  const result = await setCompletion(householdId, assignmentId, completed);
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

  const { id: householdId } = await getCurrentHousehold();

  const password = String(formData.get("password") ?? "");
  if (!(await verifyHouseholdActionPassword(householdId, password))) {
    return { error: "Clave incorrecta." };
  }

  const tasks = await listTasks(householdId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.eligibleMemberIds.includes(memberId)) {
    return { error: "Ese integrante no puede hacer esta tarea." };
  }

  const result = await reassignMember(householdId, assignmentId, memberId);
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

  const { id: householdId } = await getCurrentHousehold();
  const result = await swapAssignmentMembers(
    householdId,
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
