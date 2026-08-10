"use client";

import { useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleAssignmentCompletionAction } from "@/app/calendario/actions";

export function TaskCompletionCheckbox({
  assignmentId,
  dayOfWeek,
  completed,
}: {
  assignmentId: string;
  dayOfWeek: number;
  completed: boolean;
}) {
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed);
  const [, startTransition] = useTransition();

  return (
    <Checkbox
      checked={optimisticCompleted}
      aria-label="Marcar como hecha"
      onCheckedChange={(next) => {
        startTransition(async () => {
          setOptimisticCompleted(next);
          const formData = new FormData();
          formData.set("assignmentId", assignmentId);
          formData.set("dayOfWeek", String(dayOfWeek));
          formData.set("completed", String(next));
          await toggleAssignmentCompletionAction({}, formData);
        });
      }}
    />
  );
}
