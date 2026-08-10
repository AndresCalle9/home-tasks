"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FixedMemberChecklist } from "@/components/fixed-member-checklist";
import { PasswordConfirmDialog } from "@/components/password-confirm-dialog";
import { confirmAssignmentAction } from "@/app/calendario/asignar/actions";
import type { Member } from "@/lib/data/members";
import type { ReviewRow } from "@/lib/data/periods";

export function PeriodReviewTable({
  periodId,
  initialRows,
  members,
}: {
  periodId: string;
  initialRows: ReviewRow[];
  members: Member[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fixedByTask, setFixedByTask] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialRows.map((row) => [row.taskId, row.isFixed]))
  );
  const [fixedMembersByTask, setFixedMembersByTask] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(initialRows.map((row) => [row.taskId, row.fixedMemberIds]))
  );

  return (
    <form
      ref={formRef}
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="periodId" value={periodId} />
      <ul className="flex flex-col gap-2">
        {initialRows.map((row) => {
          const isFixed = fixedByTask[row.taskId];
          return (
            <li
              key={row.taskId}
              className="flex flex-col gap-2 rounded-lg bg-card p-3 shadow-sm sm:flex-row sm:items-center"
            >
              <input type="hidden" name="taskId" value={row.taskId} />
              <span className="min-w-0 flex-1 text-sm font-medium">
                {row.taskName}
              </span>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {row.isDaily ? "Diaria" : "Puntual"}
              </Badge>
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                Fija
                <Switch
                  name={`isFixed-${row.taskId}`}
                  value="true"
                  checked={isFixed}
                  onCheckedChange={(checked) =>
                    setFixedByTask((prev) => ({
                      ...prev,
                      [row.taskId]: checked,
                    }))
                  }
                />
              </label>
              {isFixed && (
                <FixedMemberChecklist
                  name={`fixedMemberIds-${row.taskId}`}
                  members={members}
                  selectedIds={fixedMembersByTask[row.taskId] ?? []}
                  onChange={(ids) =>
                    setFixedMembersByTask((prev) => ({
                      ...prev,
                      [row.taskId]: ids,
                    }))
                  }
                />
              )}
            </li>
          );
        })}
      </ul>

      <PasswordConfirmDialog
        action={confirmAssignmentAction}
        getFormData={() => new FormData(formRef.current!)}
        triggerLabel="Confirmar y asignar"
        triggerVariant="default"
        pendingLabel="Sorteando…"
        title="Confirmar y asignar tareas"
        description="Esto ejecuta el sorteo con las tareas fijas/variables definidas arriba."
      />
    </form>
  );
}
