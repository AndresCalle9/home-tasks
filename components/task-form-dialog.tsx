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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTaskAction, updateTaskAction } from "@/app/configuracion/actions";
import { useCloseOnActionSuccess } from "@/lib/hooks/use-close-on-action-success";
import type { Member } from "@/lib/data/members";
import type { Task } from "@/lib/data/tasks";

export function TaskFormDialog({
  task,
  members,
}: {
  task?: Task;
  members: Member[];
}) {
  const action = task ? updateTaskAction : createTaskAction;
  const [state, formAction, isPending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  const [isFixed, setIsFixed] = useState(task?.defaultIsFixed ?? false);
  const [isDaily, setIsDaily] = useState(task?.isDaily ?? false);
  useCloseOnActionSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {task ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <PencilIcon />
          <span className="sr-only">Editar {task.name}</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" />}>
          <PlusIcon />
          Nueva tarea
        </DialogTrigger>
      )}
      <DialogContent>
        <form action={formAction} className="contents">
          {task && <input type="hidden" name="id" value={task.id} />}
          <DialogHeader>
            <DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
            <DialogDescription>
              Este es el valor por defecto; se puede ajustar puntualmente al
              asignar un periodo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-name">Nombre</Label>
            <Input id="task-name" name="name" defaultValue={task?.name} required />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="task-daily">Es diaria (todos los días del periodo)</Label>
            <Switch
              id="task-daily"
              name="isDaily"
              value="true"
              checked={isDaily}
              onCheckedChange={setIsDaily}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-min-age">Edad mínima (opcional)</Label>
            <Input
              id="task-min-age"
              name="minAge"
              type="number"
              min={0}
              step={1}
              placeholder="Sin restricción"
              defaultValue={task?.minAge ?? ""}
            />
          </div>

          {!isDaily && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-day-group">Grupo de día (opcional)</Label>
              <Input
                id="task-day-group"
                name="dayGroup"
                placeholder="Sin grupo"
                defaultValue={task?.dayGroup ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Tareas con el mismo grupo siempre caen en los mismos 3 días
                de la semana (ej. lavar y extender ropa).
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="task-fixed">Es fija (siempre la misma persona)</Label>
            <Switch
              id="task-fixed"
              name="defaultIsFixed"
              value="true"
              checked={isFixed}
              onCheckedChange={setIsFixed}
            />
          </div>

          {isFixed && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-fixed-member">Responsable fijo</Label>
              <Select
                name="defaultFixedMemberId"
                defaultValue={task?.defaultFixedMemberId ?? undefined}
                items={Object.fromEntries(members.map((m) => [m.id, m.name]))}
                required
              >
                <SelectTrigger id="task-fixed-member" className="w-full">
                  <SelectValue placeholder="Elige un integrante">
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
            </div>
          )}

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
