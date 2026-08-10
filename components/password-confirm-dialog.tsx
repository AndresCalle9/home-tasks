"use client";

import { useActionState, useState, type ComponentProps } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GatedActionState = { error?: string };

// Gates a whole-form submit (running/rerolling the sorteo) behind a
// password-confirmation dialog, mirroring components/delete-confirm-dialog.tsx's
// AlertDialog pattern. Two usage modes:
// - `hiddenFields`: the dialog owns a self-contained request (e.g. just a
//   `periodId`) built from this map plus the password.
// - `getFormData`: the action's real inputs already live in a surrounding
//   `<form>` (e.g. PeriodReviewTable's multi-row task list) that this
//   dialog can't nest inside — confirming reads that form's current
//   FormData instead, appends `password`, and calls the action directly.
export function PasswordConfirmDialog({
  action,
  hiddenFields,
  getFormData,
  triggerLabel,
  triggerVariant = "outline",
  pendingLabel,
  title,
  description,
}: {
  action: (
    prevState: GatedActionState,
    formData: FormData
  ) => Promise<GatedActionState>;
  hiddenFields?: Record<string, string>;
  getFormData?: () => FormData;
  triggerLabel: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  pendingLabel?: string;
  title: string;
  description?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [prevState, setPrevState] = useState(state);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  if (state !== prevState) {
    setPrevState(state);
    if (!state.error) {
      setOpen(false);
      setPassword("");
    }
  }

  function confirm() {
    const formData = getFormData ? getFormData() : new FormData();
    if (hiddenFields) {
      for (const [key, value] of Object.entries(hiddenFields)) {
        formData.set(key, value);
      }
    }
    formData.set("password", password);
    formAction(formData);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant={triggerVariant} />}>
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password-confirm-dialog-password">Clave</Label>
          <Input
            id="password-confirm-dialog-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
          />
        </div>
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={isPending}>
            {isPending ? pendingLabel ?? "Guardando…" : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
