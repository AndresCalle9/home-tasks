"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  deleteMemberAction,
  renameMemberAction,
  toggleTaskEligibilityAction,
} from "@/app/equipo/actions";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/data/members";
import type { Task } from "@/lib/data/tasks";

function EligibilityRow({
  task,
  member,
  eligible,
}: {
  task: Task;
  member: Member;
  eligible: boolean;
}) {
  const [optimisticEligible, setOptimisticEligible] = useOptimistic(eligible);
  const [, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      setOptimisticEligible(!optimisticEligible);
      const formData = new FormData();
      formData.set("taskId", task.id);
      formData.set("memberId", member.id);
      formData.set("eligible", String(!optimisticEligible));
      await toggleTaskEligibilityAction({}, formData);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2.5 border-b border-border/60 px-2 py-2.5 text-left last:border-b-0"
    >
      <span className="text-base">{task.icon}</span>
      <span className="flex-1 text-sm font-medium">{task.name}</span>
      <span
        className={cn(
          "flex size-5.5 shrink-0 items-center justify-center rounded-md border-2",
          optimisticEligible ? "border-primary bg-primary" : "border-muted-foreground/25"
        )}
      >
        {optimisticEligible && <Check size={13} className="text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}

export function MemberSheet({
  member,
  tasks,
  onClose,
}: {
  member: Member;
  tasks: Task[];
  onClose: () => void;
}) {
  const [name, setName] = useState(member.name);

  async function commitName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === member.name) {
      setName(member.name);
      return;
    }
    const formData = new FormData();
    formData.set("id", member.id);
    formData.set("name", trimmed);
    await renameMemberAction({}, formData);
  }

  return (
    <BottomSheet open onOpenChange={(open) => !open && onClose()}>
      <div className="mb-5 flex items-center gap-3">
        <Avatar member={member} size={52} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          className="flex-1 border-b-2 border-border bg-transparent p-1 text-xl font-bold outline-none"
        />
      </div>

      <div className="mb-0.5 text-sm font-bold">¿Qué puede hacer {member.name}?</div>
      <p className="mb-3 text-xs text-muted-foreground">Marca las tareas que puede realizar.</p>
      <div className="rounded-xl bg-card px-2 shadow-xs ring-1 ring-foreground/10">
        {tasks.map((task) => (
          <EligibilityRow
            key={task.id}
            task={task}
            member={member}
            eligible={task.eligibleMemberIds.includes(member.id)}
          />
        ))}
      </div>

      <Button className="mt-4" onClick={onClose}>
        Listo
      </Button>
      <div className="mt-2 flex justify-center">
        <DeleteConfirmDialog
          id={member.id}
          action={deleteMemberAction}
          title={`Eliminar a ${member.name}`}
          description="Esta acción no se puede deshacer. Si sigue habilitado/a para alguna tarea, no se podrá eliminar hasta quitarlo de esas tareas."
          triggerLabel={`Eliminar a ${member.name}`}
          onSuccess={onClose}
        />
      </div>
    </BottomSheet>
  );
}
