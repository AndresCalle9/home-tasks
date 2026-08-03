"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { rerollAction } from "@/app/calendario/actions";

export function RerollButton({ periodId }: { periodId: string }) {
  const [state, formAction, isPending] = useActionState(rerollAction, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="periodId" value={periodId} />
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Sorteando…" : "Volver a sortear"}
      </Button>
      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
