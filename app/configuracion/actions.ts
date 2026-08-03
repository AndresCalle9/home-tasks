"use server";

import { revalidatePath } from "next/cache";
import {
  createMember,
  deleteMember,
  updateMember,
} from "@/lib/data/members";
import {
  createTask,
  deleteTask,
  updateTask,
  type TaskInput,
} from "@/lib/data/tasks";

export type ActionState = { error?: string; ok?: true };

function parseName(formData: FormData): string | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };
  return name;
}

function parseAge(formData: FormData): number | { error: string } {
  const raw = formData.get("age");
  const age = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(age) || age < 0) {
    return { error: "La edad debe ser un número mayor o igual a 0." };
  }
  return Math.floor(age);
}

export async function createMemberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = parseName(formData);
  if (typeof name !== "string") return name;
  const age = parseAge(formData);
  if (typeof age !== "number") return age;

  const result = await createMember(name, age);
  if ("error" in result) return result;
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function updateMemberAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador del integrante." };
  const name = parseName(formData);
  if (typeof name !== "string") return name;
  const age = parseAge(formData);
  if (typeof age !== "number") return age;

  const result = await updateMember(id, name, age);
  if ("error" in result) return result;
  revalidatePath("/configuracion");
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
  revalidatePath("/configuracion");
  return { ok: true };
}

function parseWeight(formData: FormData): number | { error: string } {
  const raw = formData.get("weight");
  if (raw === null || raw === "") return 1;
  const weight = Number(raw);
  if (!Number.isFinite(weight) || weight <= 0) {
    return { error: "El peso debe ser un número mayor a 0." };
  }
  return weight;
}

function parseMinAge(formData: FormData): number | null | { error: string } {
  const raw = formData.get("minAge");
  if (raw === null || raw === "") return null;
  const minAge = Number(raw);
  if (!Number.isFinite(minAge) || minAge < 0) {
    return { error: "La edad mínima debe ser un número mayor o igual a 0." };
  }
  return Math.floor(minAge);
}

function parseTaskInput(formData: FormData): TaskInput | { error: string } {
  const name = parseName(formData);
  if (typeof name !== "string") return name;

  const isDaily = formData.get("isDaily") === "true";
  const defaultIsFixed = formData.get("defaultIsFixed") === "true";

  const weight = parseWeight(formData);
  if (typeof weight !== "number") return weight;

  const minAge = parseMinAge(formData);
  if (typeof minAge === "object" && minAge !== null) return minAge;

  const fixedMemberId = String(formData.get("defaultFixedMemberId") ?? "");
  if (defaultIsFixed && !fixedMemberId) {
    return {
      error: "Si la tarea es fija, debes elegir un integrante responsable.",
    };
  }

  return {
    name,
    isDaily,
    weight,
    defaultIsFixed,
    defaultFixedMemberId: defaultIsFixed ? fixedMemberId : null,
    minAge,
  };
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const input = parseTaskInput(formData);
  if ("error" in input) return input;

  const result = await createTask(input);
  if ("error" in result) return result;
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function updateTaskAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador de la tarea." };
  const input = parseTaskInput(formData);
  if ("error" in input) return input;

  const result = await updateTask(id, input);
  if ("error" in result) return result;
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function deleteTaskAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador de la tarea." };

  const result = await deleteTask(id);
  if ("error" in result) return result;
  revalidatePath("/configuracion");
  return { ok: true };
}
