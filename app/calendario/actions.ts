"use server";

import { revalidatePath } from "next/cache";
import { runAssignment } from "@/lib/data/assignments";

export type RerollState = { error?: string };

export async function rerollAction(
  _prevState: RerollState,
  formData: FormData
): Promise<RerollState> {
  const periodId = String(formData.get("periodId") ?? "");
  if (!periodId) return { error: "Falta el identificador del periodo." };

  const result = await runAssignment(periodId);
  if ("error" in result) return result;

  revalidatePath("/calendario");
  return {};
}
