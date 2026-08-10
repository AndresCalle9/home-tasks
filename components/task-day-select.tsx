"use client";

import { PasswordGatedSelect } from "@/components/password-gated-select";
import { reassignTaskDayAction } from "@/app/calendario/actions";
import { DAY_NAMES } from "@/lib/calendar-schedule";

const DAY_ITEMS = Object.fromEntries(
  DAY_NAMES.map((name, index) => [String(index), name])
);

export function TaskDaySelect({
  periodId,
  taskId,
  currentDayOfWeek,
}: {
  periodId: string;
  taskId: string;
  currentDayOfWeek: number;
}) {
  return (
    <PasswordGatedSelect
      value={String(currentDayOfWeek)}
      items={DAY_ITEMS}
      action={reassignTaskDayAction}
      hiddenFields={{ periodId, taskId }}
      valueFieldName="dayOfWeek"
      dialogTitle="Confirmar cambio de día"
      dialogDescription="Ingresa la clave para cambiar el día de esta tarea."
    />
  );
}
