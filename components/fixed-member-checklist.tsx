"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Member } from "@/lib/data/members";

export function FixedMemberChecklist({
  name,
  members,
  selectedIds,
  onChange,
}: {
  name: string;
  members: Member[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-input p-2">
      {members.map((member) => {
        const checked = selectedIds.includes(member.id);
        return (
          <Label key={member.id} className="flex items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => {
                onChange(
                  next
                    ? [...selectedIds, member.id]
                    : selectedIds.filter((id) => id !== member.id)
                );
              }}
            />
            {member.name}
            {checked && <input type="hidden" name={name} value={member.id} />}
          </Label>
        );
      })}
    </div>
  );
}
