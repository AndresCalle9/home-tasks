"use client";

import { useActionState, useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMemberAction, updateMemberAction } from "@/app/configuracion/actions";
import { useCloseOnActionSuccess } from "@/lib/hooks/use-close-on-action-success";
import type { Member } from "@/lib/data/members";

export function MemberFormDialog({ member }: { member?: Member }) {
  const action = member ? updateMemberAction : createMemberAction;
  const [state, formAction, isPending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  useCloseOnActionSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {member ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <PencilIcon />
          <span className="sr-only">Editar {member.name}</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" />}>
          <PlusIcon />
          Nuevo integrante
        </DialogTrigger>
      )}
      <DialogContent>
        <form action={formAction} className="contents">
          {member && <input type="hidden" name="id" value={member.id} />}
          <DialogHeader>
            <DialogTitle>
              {member ? "Editar integrante" : "Nuevo integrante"}
            </DialogTitle>
            <DialogDescription>
              La edad se usa para repartir la carga de tareas de forma justa;
              no se muestra en esta lista.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-name">Nombre</Label>
            <Input
              id="member-name"
              name="name"
              defaultValue={member?.name}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-age">Edad</Label>
            <Input
              id="member-age"
              name="age"
              type="number"
              min={0}
              defaultValue={member?.age}
              required
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
