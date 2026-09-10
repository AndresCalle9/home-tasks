"use server";

import { revalidatePath } from "next/cache";
import { getCurrentHousehold } from "@/lib/auth/session";
import {
  changeActionPassword,
  updateHouseholdName,
  verifyHouseholdActionPassword,
} from "@/lib/data/household";
import {
  createTask,
  deleteTask,
  listTaskConflicts,
  listTasks,
  setTaskActive,
  updateTask,
  type Frequency,
  type TaskInput,
} from "@/lib/data/tasks";
import { listMembers } from "@/lib/data/members";
import { replaceWeek, resetWeekStatuses } from "@/lib/data/assignments";
import { EFFORT_LEVELS } from "@/lib/effort";
import { DAYS_OF_WEEK, generateSchedule } from "@/lib/algorithm/schedule";

export type ActionState = { error?: string; ok?: true };

export async function updateHouseholdNameAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre no puede quedar vacío." };

  const { id: householdId } = await getCurrentHousehold();
  const result = await updateHouseholdName(householdId, name);
  if ("error" in result) return result;
  revalidatePath("/", "layout");
  return { ok: true };
}

function parseTaskInput(formData: FormData): TaskInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const icon = String(formData.get("icon") ?? "").trim() || "📌";

  const effort = String(formData.get("effort") ?? "");
  if (!EFFORT_LEVELS.includes(effort as (typeof EFFORT_LEVELS)[number])) {
    return { error: "Elige un nivel de esfuerzo válido." };
  }

  const freq = String(formData.get("freq") ?? "") as Frequency;
  if (!["diario", "dias", "semanal"].includes(freq)) {
    return { error: "Elige una frecuencia válida." };
  }

  const days = formData.getAll("days").map((d) => Number(d));
  if (freq === "semanal" && days.length !== 1) {
    return { error: "Una tarea semanal necesita exactamente un día." };
  }
  if (freq === "dias" && days.length === 0) {
    return { error: "Elige al menos un día." };
  }

  const eligibleMemberIds = formData.getAll("eligibleMemberIds").map(String);
  if (eligibleMemberIds.length === 0) {
    return { error: "Elige al menos un integrante que pueda hacer esta tarea." };
  }

  return {
    name,
    icon,
    effort: effort as TaskInput["effort"],
    freq,
    days,
    eligibleMemberIds,
  };
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const input = parseTaskInput(formData);
  if ("error" in input) return input;

  const { id: householdId } = await getCurrentHousehold();
  const result = await createTask(householdId, input);
  if ("error" in result) return result;
  revalidatePath("/ajustes");
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

  const { id: householdId } = await getCurrentHousehold();
  const result = await updateTask(householdId, id, input);
  if ("error" in result) return result;
  revalidatePath("/ajustes");
  revalidatePath("/equipo");
  return { ok: true };
}

export async function deleteTaskAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador de la tarea." };

  const { id: householdId } = await getCurrentHousehold();
  const result = await deleteTask(householdId, id);
  if ("error" in result) return result;
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function setTaskActiveAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return { error: "Falta el identificador de la tarea." };

  const { id: householdId } = await getCurrentHousehold();
  const result = await setTaskActive(householdId, id, active);
  if ("error" in result) return result;
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function generateWeekAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { id: householdId } = await getCurrentHousehold();

  const password = String(formData.get("password") ?? "");
  if (!(await verifyHouseholdActionPassword(householdId, password))) {
    return { error: "Clave incorrecta." };
  }

  const [members, tasks, conflicts] = await Promise.all([
    listMembers(householdId),
    listTasks(householdId),
    listTaskConflicts(householdId),
  ]);

  const activeTasks = tasks.filter((t) => t.active);
  const seed = Math.floor(Math.random() * 2 ** 31);
  const results = generateSchedule(
    members.map((m) => ({ id: m.id })),
    activeTasks.map((t) => ({
      id: t.id,
      effort: t.effort,
      days: t.freq === "diario" ? DAYS_OF_WEEK : t.days,
      eligibleMemberIds: t.eligibleMemberIds,
    })),
    conflicts,
    seed
  );

  const result = await replaceWeek(
    householdId,
    results.map((r) => ({
      taskId: r.taskId,
      memberId: r.memberId,
      dayOfWeek: r.dayOfWeek,
    }))
  );
  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath("/semana");
  revalidatePath("/ajustes");
  return { ok: true };
}

export async function resetWeekAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { id: householdId } = await getCurrentHousehold();

  const password = String(formData.get("password") ?? "");
  if (!(await verifyHouseholdActionPassword(householdId, password))) {
    return { error: "Clave incorrecta." };
  }

  const result = await resetWeekStatuses(householdId);
  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath("/semana");
  return { ok: true };
}

export async function changeActionPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  if (!currentPassword || !newPassword) {
    return { error: "Completa la clave actual y la nueva." };
  }

  const { id: householdId } = await getCurrentHousehold();
  const result = await changeActionPassword(householdId, currentPassword, newPassword);
  if ("error" in result) return result;
  return { ok: true };
}
