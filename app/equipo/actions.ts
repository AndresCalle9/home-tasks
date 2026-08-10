"use server";

import { revalidatePath } from "next/cache";
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

  const result = await createMember(name, color);
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

  const result = await renameMember(id, name);
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

  const result = await deleteMember(id);
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

  const result = await toggleTaskEligibility(taskId, memberId, eligible);
  if ("error" in result) return result;
  revalidatePath("/equipo");
  revalidatePath("/ajustes");
  return { ok: true };
}
