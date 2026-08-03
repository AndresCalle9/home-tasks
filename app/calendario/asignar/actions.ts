"use server";

import { redirect } from "next/navigation";
import { createPeriod, updatePeriodTaskSettings, type ReviewRow } from "@/lib/data/periods";
import { runAssignment } from "@/lib/data/assignments";

export type DefinePeriodState = {
  error?: string;
  periodId?: string;
  rows?: ReviewRow[];
};

export async function createPeriodAction(
  _prevState: DefinePeriodState,
  formData: FormData
): Promise<DefinePeriodState> {
  const startDate = String(formData.get("startDate") ?? "");
  if (!startDate) return { error: "Elige una fecha de inicio." };

  const result = await createPeriod(startDate);
  if ("error" in result) return result;
  return { periodId: result.periodId, rows: result.rows };
}

export type ConfirmAssignmentState = { error?: string };

export async function confirmAssignmentAction(
  _prevState: ConfirmAssignmentState,
  formData: FormData
): Promise<ConfirmAssignmentState> {
  const periodId = String(formData.get("periodId") ?? "");
  if (!periodId) return { error: "Falta el identificador del periodo." };

  const taskIds = formData.getAll("taskId").map(String);
  const rows = taskIds.map((taskId) => {
    const isFixed = formData.get(`isFixed-${taskId}`) === "true";
    const fixedMemberId = isFixed
      ? String(formData.get(`fixedMemberId-${taskId}`) ?? "") || null
      : null;
    return { taskId, isFixed, fixedMemberId };
  });

  if (rows.some((row) => row.isFixed && !row.fixedMemberId)) {
    return {
      error: "Todas las tareas fijas deben tener un integrante responsable.",
    };
  }

  const settingsResult = await updatePeriodTaskSettings(periodId, rows);
  if ("error" in settingsResult) return settingsResult;

  const assignResult = await runAssignment(periodId);
  if ("error" in assignResult) return assignResult;

  redirect("/calendario");
}
