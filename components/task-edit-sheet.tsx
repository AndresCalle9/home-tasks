"use client";

import { useActionState, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Avatar } from "@/components/avatar";
import { Pill } from "@/components/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
  type ActionState,
} from "@/app/ajustes/actions";
import { useCloseOnActionSuccess } from "@/lib/hooks/use-close-on-action-success";
import { DAY_ABBR } from "@/lib/days";
import { EFFORT_LABEL, EFFORT_LEVELS, type Effort } from "@/lib/effort";
import { cn } from "@/lib/utils";
import type { Task, Frequency } from "@/lib/data/tasks";
import type { Member } from "@/lib/data/members";

const EFFORT_HINT: Record<Effort, string> = {
  ligera: "Algo rápido",
  media: "Requiere un poco más",
  alta: "Requiere más tiempo",
};

export function TaskEditSheet({
  task,
  members,
  onClose,
}: {
  task: Task | "new";
  members: Member[];
  onClose: () => void;
}) {
  const isNew = task === "new";
  const base = isNew
    ? {
        name: "",
        icon: "📌",
        effort: "media" as Effort,
        freq: "diario" as Frequency,
        days: [] as number[],
        eligibleMemberIds: members.map((m) => m.id),
      }
    : task;

  const [name, setName] = useState(base.name);
  const [icon, setIcon] = useState(base.icon);
  const [effort, setEffort] = useState<Effort>(base.effort);
  const [freq, setFreq] = useState<Frequency>(base.freq);
  const [days, setDays] = useState<number[]>(base.days);
  const [eligibleMemberIds, setEligibleMemberIds] = useState(base.eligibleMemberIds);

  const action = isNew ? createTaskAction : updateTaskAction;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, {});
  useCloseOnActionSuccess(state, (open) => {
    if (!open) onClose();
  });

  function setFrequency(next: Frequency) {
    setFreq(next);
    setDays([]);
  }

  function toggleDay(day: number) {
    if (freq === "semanal") {
      setDays([day]);
      return;
    }
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function toggleMember(id: string) {
    setEligibleMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const canSave =
    name.trim().length > 0 &&
    (freq === "diario" || days.length > 0) &&
    eligibleMemberIds.length > 0;

  return (
    <BottomSheet open onOpenChange={(open) => !open && onClose()}>
      <form action={formAction} className="contents">
        {!isNew && <input type="hidden" name="id" value={task.id} />}
        <input type="hidden" name="effort" value={effort} />
        <input type="hidden" name="freq" value={freq} />
        {days.map((d) => (
          <input key={d} type="hidden" name="days" value={d} />
        ))}
        {eligibleMemberIds.map((id) => (
          <input key={id} type="hidden" name="eligibleMemberIds" value={id} />
        ))}

        <div className="mb-4 text-lg font-bold">{isNew ? "Nueva tarea" : "Editar tarea"}</div>

        <div className="mb-4 flex gap-2.5">
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 2))}
            className="w-14 text-center text-xl"
          />
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la tarea"
            className="flex-1"
          />
        </div>

        <div className="mb-2 text-sm font-bold">Frecuencia</div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Pill active={freq === "diario"} onClick={() => setFrequency("diario")}>
            Todos los días
          </Pill>
          <Pill active={freq === "dias"} onClick={() => setFrequency("dias")}>
            Días específicos
          </Pill>
          <Pill active={freq === "semanal"} onClick={() => setFrequency("semanal")}>
            Una vez por semana
          </Pill>
        </div>
        {freq !== "diario" && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {DAY_ABBR.map((label, index) => (
              <Pill
                key={label}
                className="px-3 py-1.5 text-xs"
                active={days.includes(index)}
                onClick={() => toggleDay(index)}
              >
                {label}
              </Pill>
            ))}
          </div>
        )}
        {freq !== "diario" && days.length === 0 && (
          <p className="mb-2 text-xs text-destructive">Elige al menos un día</p>
        )}

        <div className="mt-3 mb-2 text-sm font-bold">Esfuerzo</div>
        <div className="mb-4 flex gap-2">
          {EFFORT_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setEffort(level)}
              className={cn(
                "flex-1 rounded-2xl border p-3 text-left",
                effort === level ? "border-primary bg-secondary" : "border-border bg-card"
              )}
            >
              <div className="text-sm font-bold">{EFFORT_LABEL[level]}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {EFFORT_HINT[level]}
              </div>
            </button>
          ))}
        </div>

        <div className="mb-2 text-sm font-bold">¿Quién puede hacerla?</div>
        <div className="mb-5 flex flex-col gap-1">
          {members.map((m) => {
            const checked = eligibleMemberIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                className="flex items-center gap-2.5 px-1 py-1.5"
              >
                <span
                  className={cn(
                    "flex size-5.5 shrink-0 items-center justify-center rounded-md border-2",
                    checked ? "border-primary bg-primary" : "border-muted-foreground/25"
                  )}
                >
                  {checked && <Check size={13} className="text-white" strokeWidth={3} />}
                </span>
                <Avatar member={m} size={26} />
                <span className="text-sm font-medium">{m.name}</span>
              </button>
            );
          })}
        </div>

        {state.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}

        <Button type="submit" disabled={!canSave || isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </form>

      {!isNew && (
        <div className="mt-2 flex justify-center">
          <DeleteConfirmDialog
            id={task.id}
            action={deleteTaskAction}
            title={`Eliminar "${task.name}"`}
            description="Esta acción no se puede deshacer."
            triggerLabel={`Eliminar ${task.name}`}
            onSuccess={onClose}
          />
        </div>
      )}
    </BottomSheet>
  );
}
