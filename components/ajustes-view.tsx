"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PasswordConfirmDialog } from "@/components/password-confirm-dialog";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import {
  generateWeekAction,
  resetWeekAction,
  setTaskActiveAction,
  updateHouseholdNameAction,
} from "@/app/ajustes/actions";
import { DAY_ABBR, DAY_NAMES } from "@/lib/days";
import { EFFORT_LABEL } from "@/lib/effort";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/data/tasks";
import type { Member } from "@/lib/data/members";

function taskScheduleLabel(task: Task): string {
  if (task.freq === "diario") return "Todos los días";
  return task.days
    .map((d) => DAY_ABBR[d] ?? DAY_NAMES[d])
    .join(" · ");
}

function TaskSettingsRow({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const [optimisticActive, setOptimisticActive] = useOptimistic(task.active);
  const [, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      setOptimisticActive(!optimisticActive);
      const formData = new FormData();
      formData.set("id", task.id);
      formData.set("active", String(!optimisticActive));
      await setTaskActiveAction({}, formData);
    });
  }

  return (
    <div className="flex items-center gap-2.5 border-b border-border/60 py-2.5 last:border-b-0">
      <button type="button" onClick={onEdit} className="flex flex-1 items-center gap-2.5 text-left">
        <span className="text-base">{task.icon}</span>
        <span className={cn("min-w-0 flex-1", !optimisticActive && "opacity-40")}>
          <span className="block text-sm font-medium">{task.name}</span>
          <span className="text-[11px] text-muted-foreground">
            {taskScheduleLabel(task)} · {EFFORT_LABEL[task.effort]}
          </span>
        </span>
      </button>
      <Switch checked={optimisticActive} onCheckedChange={toggleActive} />
    </div>
  );
}

function HouseholdNameField({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);

  async function commit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) {
      setName(initialName);
      return;
    }
    const formData = new FormData();
    formData.set("name", trimmed);
    await updateHouseholdNameAction({}, formData);
  }

  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-card p-3.5 shadow-xs ring-1 ring-foreground/10">
      <span className="text-lg">🏡</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        className="flex-1 border-none bg-transparent text-sm font-semibold outline-none"
      />
    </div>
  );
}

export function AjustesView({
  householdName,
  tasks,
  members,
}: {
  householdName: string;
  tasks: Task[];
  members: Member[];
}) {
  const [editingTaskId, setEditingTaskId] = useState<string | "new" | null>(null);
  const [generating, setGenerating] = useState(false);
  const editingTask =
    editingTaskId === "new" ? "new" : tasks.find((t) => t.id === editingTaskId) ?? null;

  return (
    <div className="flex flex-col gap-5 px-5 py-6">
      <div className="text-2xl font-bold">Ajustes</div>

      <section className="flex flex-col gap-2">
        <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Nuestro hogar
        </div>
        <HouseholdNameField initialName={householdName} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Tareas
        </div>
        <div className="rounded-2xl bg-card px-3 shadow-xs ring-1 ring-foreground/10">
          {tasks.map((task) => (
            <TaskSettingsRow
              key={task.id}
              task={task}
              onEdit={() => setEditingTaskId(task.id)}
            />
          ))}
        </div>
        <Button variant="secondary" onClick={() => setEditingTaskId("new")}>
          <Plus size={18} /> Crear tarea
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Semana
        </div>
        <PasswordConfirmDialog
          action={generateWeekAction}
          triggerLabel="🎲 Repartir nuestra semana"
          triggerVariant="default"
          pendingLabel="Sorteando…"
          title="Repartir nuestra semana"
          description="Esto reemplaza la asignación actual con un nuevo sorteo."
          onSuccess={() => {
            setGenerating(true);
            setTimeout(() => setGenerating(false), 900);
          }}
        />
        <PasswordConfirmDialog
          action={resetWeekAction}
          triggerLabel="Reiniciar semana"
          triggerVariant="secondary"
          pendingLabel="Reiniciando…"
          title="Reiniciar semana"
          description="Vuelve a marcar todas las tareas de esta semana como pendientes, sin cambiar quién hace qué."
        />
      </section>

      {generating && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-background">
          <div className="animate-bounce text-5xl">🎲</div>
          <div className="text-lg font-bold">Buscando el mejor equilibrio…</div>
        </div>
      )}

      {editingTask && (
        <TaskEditSheet
          task={editingTask}
          members={members}
          onClose={() => setEditingTaskId(null)}
        />
      )}
    </div>
  );
}
