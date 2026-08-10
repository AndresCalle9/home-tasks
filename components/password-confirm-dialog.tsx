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

// Gates a whole action (generating/resetting the week) behind a password
// confirmation dialog — mirrors components/delete-confirm-dialog.tsx's
// AlertDialog pattern, plus a password field. `hiddenFields` builds the
// action's request alongside the password.
export function PasswordConfirmDialog({
  action,
  hiddenFields,
  triggerLabel,
  triggerVariant = "outline",
  pendingLabel,
  title,
  description,
  onSuccess,
}: {
  action: (
    prevState: GatedActionState,
    formData: FormData
  ) => Promise<GatedActionState>;
  hiddenFields?: Record<string, string>;
  triggerLabel: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  pendingLabel?: string;
  title: string;
  description?: string;
  onSuccess?: () => void;
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
      onSuccess?.();
    }
  }

  function confirm() {
    const formData = new FormData();
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
