"use client";

import { useActionState, useState } from "react";
import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useCloseOnActionSuccess } from "@/lib/hooks/use-close-on-action-success";
import type { ActionState } from "@/app/configuracion/actions";

export function DeleteConfirmDialog({
  id,
  action,
  title,
  description,
  triggerLabel,
}: {
  id: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  title: string;
  description: string;
  triggerLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  useCloseOnActionSuccess(state, setOpen);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2Icon />
        <span className="sr-only">{triggerLabel}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={formAction} className="contents">
          <input type="hidden" name="id" value={id} />
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              variant="destructive"
              disabled={isPending}
            >
              {isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
