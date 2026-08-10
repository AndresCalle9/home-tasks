"use server";

import { redirect } from "next/navigation";
import { createPeriod, updatePeriodTaskSettings, type ReviewRow } from "@/lib/data/periods";
import { runAssignment } from "@/lib/data/assignments";
import { verifySecurityPassword } from "@/lib/security/password";

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

  const password = String(formData.get("password") ?? "");
  if (!verifySecurityPassword(password)) {
    return { error: "Clave incorrecta." };
  }

  const taskIds = formData.getAll("taskId").map(String);
  const rows = taskIds.map((taskId) => {
    const isFixed = formData.get(`isFixed-${taskId}`) === "true";
    const fixedMemberIds = isFixed
      ? formData.getAll(`fixedMemberIds-${taskId}`).map(String)
      : [];
    return { taskId, isFixed, fixedMemberIds };
  });

  if (rows.some((row) => row.isFixed && row.fixedMemberIds.length === 0)) {
    return {
      error:
        "Todas las tareas fijas deben tener al menos un integrante responsable.",
    };
  }

  const settingsResult = await updatePeriodTaskSettings(periodId, rows);
  if ("error" in settingsResult) return settingsResult;

  const assignResult = await runAssignment(periodId);
  if ("error" in assignResult) return assignResult;

  redirect("/calendario");
}
