"use server";

import { revalidatePath } from "next/cache";
import { toggleAssignmentCompletion } from "@/lib/data/assignments";

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
