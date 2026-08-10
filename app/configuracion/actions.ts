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
  listTasks,
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

function parseMinAge(formData: FormData): number | null | { error: string } {
  const raw = formData.get("minAge");
  if (raw === null || raw === "") return null;
  const minAge = Number(raw);
  if (!Number.isFinite(minAge) || minAge < 0) {
    return { error: "La edad mínima debe ser un número mayor o igual a 0." };
  }
  return Math.floor(minAge);
}

function parseDayGroup(formData: FormData): string | null {
  const raw = String(formData.get("dayGroup") ?? "").trim();
  return raw || null;
}

function parseTimesPerWeek(
  formData: FormData,
  isDaily: boolean
): number | null | { error: string } {
  if (isDaily) return null;
  const raw = formData.get("timesPerWeek");
  const timesPerWeek = Number(raw);
  if (
    raw === null ||
    raw === "" ||
    !Number.isFinite(timesPerWeek) ||
    timesPerWeek < 1 ||
    timesPerWeek > 7
  ) {
    return {
      error: "Las veces por semana deben ser un número entre 1 y 7.",
    };
  }
  return Math.floor(timesPerWeek);
}

async function checkDayGroupConsistency(
  currentTaskId: string | null,
  dayGroup: string | null,
  timesPerWeek: number | null
): Promise<{ error: string } | null> {
  if (dayGroup == null) return null;

  const tasks = await listTasks();
  const mismatch = tasks.find(
    (t) =>
      t.id !== currentTaskId &&
      t.dayGroup === dayGroup &&
      t.timesPerWeek !== timesPerWeek
  );
  if (mismatch) {
    return {
      error: `"${mismatch.name}" ya usa el grupo "${dayGroup}" con ${mismatch.timesPerWeek} veces por semana; esta tarea debe usar el mismo valor.`,
    };
  }
  return null;
}

async function parseTaskInput(
  formData: FormData,
  currentTaskId: string | null
): Promise<TaskInput | { error: string }> {
  const name = parseName(formData);
  if (typeof name !== "string") return name;

  const isDaily = formData.get("isDaily") === "true";
  const defaultIsFixed = formData.get("defaultIsFixed") === "true";

  const minAge = parseMinAge(formData);
  if (typeof minAge === "object" && minAge !== null) return minAge;

  const dayGroup = isDaily ? null : parseDayGroup(formData);

  const timesPerWeek = parseTimesPerWeek(formData, isDaily);
  if (typeof timesPerWeek === "object" && timesPerWeek !== null) {
    return timesPerWeek;
  }

  const dayGroupError = await checkDayGroupConsistency(
    currentTaskId,
    dayGroup,
    timesPerWeek
  );
  if (dayGroupError) return dayGroupError;

  const defaultFixedMemberIds = formData.getAll("defaultFixedMemberIds").map(String);
  if (defaultIsFixed && defaultFixedMemberIds.length === 0) {
    return {
      error: "Si la tarea es fija, debes elegir al menos un integrante responsable.",
    };
  }

  return {
    name,
    isDaily,
    defaultIsFixed,
    defaultFixedMemberIds: defaultIsFixed ? defaultFixedMemberIds : [],
    minAge,
    dayGroup,
    timesPerWeek,
  };
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const input = await parseTaskInput(formData, null);
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
  const input = await parseTaskInput(formData, id);
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
