"use client";

import { PasswordConfirmDialog } from "@/components/password-confirm-dialog";
import { rerollAction } from "@/app/calendario/actions";

export function RerollButton({ periodId }: { periodId: string }) {
  return (
    <PasswordConfirmDialog
      action={rerollAction}
      hiddenFields={{ periodId }}
      triggerLabel="Volver a sortear"
      pendingLabel="Sorteando…"
      title="Volver a sortear"
      description="Esto reemplaza la asignación actual del periodo con un nuevo sorteo."
    />
  );
}
