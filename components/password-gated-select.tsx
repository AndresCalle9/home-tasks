"use client";

import { useActionState, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GatedActionState = { error?: string };

// A controlled Select whose value never changes on its own — every value
// change opens a password-confirmation dialog first, and only a correct
// password (verified server-side) actually applies it. Cancelling or a
// wrong password leaves `value` (and therefore the Select's display)
// exactly as the caller passed it in.
export function PasswordGatedSelect({
  value,
  items,
  action,
  hiddenFields,
  valueFieldName,
  placeholder,
  triggerClassName,
  dialogTitle,
  dialogDescription,
}: {
  value: string;
  items: Record<string, string>;
  action: (
    prevState: GatedActionState,
    formData: FormData
  ) => Promise<GatedActionState>;
  hiddenFields: Record<string, string>;
  valueFieldName: string;
  placeholder?: string;
  triggerClassName?: string;
  dialogTitle: string;
  dialogDescription?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [prevState, setPrevState] = useState(state);
  const [open, setOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  if (state !== prevState) {
    setPrevState(state);
    if (!state.error) {
      setOpen(false);
      setPassword("");
    }
  }

  function confirm() {
    const formData = new FormData();
    for (const [key, fieldValue] of Object.entries(hiddenFields)) {
      formData.set(key, fieldValue);
    }
    formData.set(valueFieldName, pendingValue ?? "");
    formData.set("password", password);
    formAction(formData);
  }

  return (
    <>
      <Select
        value={value}
        items={items}
        disabled={isPending}
        onValueChange={(next) => {
          if (!next || next === value) return;
          setPendingValue(next);
          setPassword("");
          setOpen(true);
        }}
      >
        <SelectTrigger className={triggerClassName ?? "h-7 w-auto text-xs"}>
          <SelectValue placeholder={placeholder}>
            {(v: string | null) => (v ? items[v] ?? "" : "")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            {dialogDescription && (
              <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-gated-select-password">Clave</Label>
            <Input
              id="password-gated-select-password"
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
              {isPending ? "Guardando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
