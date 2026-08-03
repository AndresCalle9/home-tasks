"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PeriodReviewTable } from "@/components/period-review-table";
import {
  createPeriodAction,
  confirmAssignmentAction,
} from "@/app/calendario/asignar/actions";
import type { Member } from "@/lib/data/members";

export function AssignWizard({ members }: { members: Member[] }) {
  const [defineState, defineFormAction, definePending] = useActionState(
    createPeriodAction,
    {}
  );
  const [confirmState, confirmFormAction, confirmPending] = useActionState(
    confirmAssignmentAction,
    {}
  );
  const [clientError, setClientError] = useState<string | null>(null);

  if (defineState.periodId && defineState.rows) {
    return (
      <PeriodReviewTable
        periodId={defineState.periodId}
        initialRows={defineState.rows}
        members={members}
        action={confirmFormAction}
        state={confirmState}
        pending={confirmPending}
      />
    );
  }

  return (
    <form
      action={defineFormAction}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        const input = event.currentTarget.elements.namedItem(
          "startDate"
        ) as HTMLInputElement | null;
        const day = input?.value
          ? new Date(`${input.value}T00:00:00Z`).getUTCDay()
          : null;
        if (day !== 1) {
          event.preventDefault();
          setClientError("La fecha debe ser un lunes.");
        } else {
          setClientError(null);
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startDate">Inicio del periodo (lunes)</Label>
        <Input id="startDate" name="startDate" type="date" required />
      </div>

      {(clientError ?? defineState.error) && (
        <p className="text-sm text-destructive">
          {clientError ?? defineState.error}
        </p>
      )}

      <Button type="submit" disabled={definePending}>
        {definePending ? "Creando…" : "Continuar"}
      </Button>
    </form>
  );
}
