"use server";

import { revalidatePath } from "next/cache";
import { getCurrentHousehold } from "@/lib/auth/session";
import { createMember, deleteMember, renameMember } from "@/lib/data/members";
import { toggleTaskEligibility } from "@/lib/data/tasks";

export type ActionState = { error?: string; ok?: true };

export async function createMemberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };
  const color = String(formData.get("color") ?? "").trim();
  if (!color) return { error: "Elige un color." };

  const { id: householdId } = await getCurrentHousehold();
  const result = await createMember(householdId, name, color);
  if ("error" in result) return result;
  revalidatePath("/equipo");
  return { ok: true };
}

export async function renameMemberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "Falta el identificador del integrante." };
  if (!name) return { error: "El nombre es obligatorio." };

  const { id: householdId } = await getCurrentHousehold();
  const result = await renameMember(householdId, id, name);
  if ("error" in result) return result;
  revalidatePath("/equipo");
  return { ok: true };
}

export async function deleteMemberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador del integrante." };

  const { id: householdId } = await getCurrentHousehold();
  const result = await deleteMember(householdId, id);
  if ("error" in result) return result;
  revalidatePath("/equipo");
  return { ok: true };
}

export async function toggleTaskEligibilityAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const taskId = String(formData.get("taskId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const eligible = formData.get("eligible") === "true";
  if (!taskId || !memberId) return { error: "Faltan datos." };

  const { id: householdId } = await getCurrentHousehold();
  const result = await toggleTaskEligibility(householdId, taskId, memberId, eligible);
  if ("error" in result) return result;
  revalidatePath("/equipo");
  revalidatePath("/ajustes");
  return { ok: true };
}
