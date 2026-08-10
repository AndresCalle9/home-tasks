"use client";

import { useOptimistic, useTransition } from "react";
import { Check, ChevronRight } from "lucide-react";
import { EffortDot } from "@/components/effort-dot";
import { toggleCompleteAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { Assignment } from "@/lib/data/assignments";
import type { Task } from "@/lib/data/tasks";
import type { Member } from "@/lib/data/members";

export function TaskRow({
  task,
  assignment,
  member,
  onOpen,
}: {
  task: Task;
  assignment: Assignment;
  member: Member | null;
  onOpen: (assignment: Assignment) => void;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(assignment.status);
  const [, startTransition] = useTransition();
  const done = optimisticStatus === "completed";

  function toggleCompletion() {
    startTransition(async () => {
      setOptimisticStatus(done ? "pending" : "completed");
      const formData = new FormData();
      formData.set("assignmentId", assignment.id);
      formData.set("completed", String(!done));
      await toggleCompleteAction({}, formData);
    });
  }

  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0">
      <button
        type="button"
        onClick={toggleCompletion}
        aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
        aria-pressed={done}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
          done ? "border-chart-1 bg-chart-1" : "border-muted-foreground/25"
        )}
      >
        {done && <Check size={14} className="text-white" strokeWidth={3} />}
      </button>

      <button
        type="button"
        onClick={() => onOpen(assignment)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="text-xl">{task.icon}</span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-sm font-semibold",
              done && "text-muted-foreground line-through"
            )}
          >
            {task.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            {member ? (
              <span className="text-xs font-semibold" style={{ color: member.color }}>
                {member.name}
              </span>
            ) : (
              <span className="text-xs font-semibold text-destructive">
                Sin responsable
              </span>
            )}
            <EffortDot effort={task.effort} />
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground/40" />
      </button>
    </div>
  );
}
