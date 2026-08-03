"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Member } from "@/lib/data/members";
import type { ReviewRow } from "@/lib/data/periods";
import type { ConfirmAssignmentState } from "@/app/calendario/asignar/actions";

export function PeriodReviewTable({
  periodId,
  initialRows,
  members,
  action,
  state,
  pending,
}: {
  periodId: string;
  initialRows: ReviewRow[];
  members: Member[];
  action: (formData: FormData) => void;
  state: ConfirmAssignmentState;
  pending: boolean;
}) {
  const [fixedByTask, setFixedByTask] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialRows.map((row) => [row.taskId, row.isFixed]))
  );
  const memberItems = Object.fromEntries(members.map((m) => [m.id, m.name]));

  return (
    <form action={action} className="flex flex-col gap-4">
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
                <Select
                  name={`fixedMemberId-${row.taskId}`}
                  defaultValue={row.fixedMemberId ?? undefined}
                  items={memberItems}
                  required
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Responsable">
                      {(value: string | null) =>
                        members.find((m) => m.id === value)?.name ?? ""
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </li>
          );
        })}
      </ul>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Sorteando…" : "Confirmar y asignar"}
      </Button>
    </form>
  );
}
