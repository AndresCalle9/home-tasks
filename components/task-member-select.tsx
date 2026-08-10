"use client";

import { PasswordGatedSelect } from "@/components/password-gated-select";
import { reassignTaskAction } from "@/app/calendario/actions";
import type { Member } from "@/lib/data/members";

export function TaskMemberSelect({
  periodId,
  taskId,
  currentMemberId,
  eligibleMembers,
}: {
  periodId: string;
  taskId: string;
  currentMemberId: string;
  eligibleMembers: Member[];
}) {
  return (
    <PasswordGatedSelect
      value={currentMemberId}
      items={Object.fromEntries(eligibleMembers.map((m) => [m.id, m.name]))}
      action={reassignTaskAction}
      hiddenFields={{ periodId, taskId }}
      valueFieldName="memberId"
      dialogTitle="Confirmar cambio de responsable"
      dialogDescription="Ingresa la clave para reasignar esta tarea."
    />
  );
}
