"use client";

import { useActionState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reassignTaskAction } from "@/app/calendario/actions";
import type { Member } from "@/lib/data/members";

export function TaskMemberSelect({
  periodId,
  taskId,
  currentMemberId,
  eligibleMembers,
}: {
  periodId: string;
  taskId: string;
  currentMemberId: string;
  eligibleMembers: Member[];
}) {
  const [state, formAction, isPending] = useActionState(
    reassignTaskAction,
    {}
  );

  return (
    <div className="flex flex-col gap-1">
      <Select
        name="memberId"
        defaultValue={currentMemberId}
        items={Object.fromEntries(eligibleMembers.map((m) => [m.id, m.name]))}
        disabled={isPending}
        onValueChange={(value) => {
          if (!value) return;
          const formData = new FormData();
          formData.set("periodId", periodId);
          formData.set("taskId", taskId);
          formData.set("memberId", value);
          formAction(formData);
        }}
      >
        <SelectTrigger className="h-7 w-auto text-xs">
          <SelectValue>
            {(value: string | null) =>
              eligibleMembers.find((m) => m.id === value)?.name ?? ""
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {eligibleMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </div>
  );
}
