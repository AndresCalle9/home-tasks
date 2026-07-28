import { personColorVar } from "@/lib/person-color";
import type { Member } from "@/lib/mock-data";

export function MemberChip({ member }: { member: Member }) {
  const color = personColorVar(member.id);
  const initial = member.name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 shadow-sm">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
      <span className="text-sm font-medium leading-tight">{member.name}</span>
    </div>
  );
}
