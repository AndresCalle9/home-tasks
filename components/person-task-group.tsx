import { Badge } from "@/components/ui/badge";
import { personColorVarByIndex } from "@/lib/person-color";
import { TaskMemberSelect } from "@/components/task-member-select";
import type { PersonGroup } from "@/lib/calendar-schedule";
import type { Member } from "@/lib/data/members";

export function PersonTaskGroup({
  group,
  memberIndex,
  members,
  periodId,
}: {
  group: PersonGroup;
  memberIndex: number;
  members: Member[];
  periodId: string;
}) {
  const color = personColorVarByIndex(memberIndex);
  const initial = group.member.name.charAt(0).toUpperCase();

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border-l-4 bg-card p-3 shadow-sm"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {initial}
        </span>
        <span className="text-sm font-semibold">{group.member.name}</span>
      </div>
      <ul className="flex flex-col gap-1.5 pl-8">
        {group.items.map(({ task, isFixed }) => (
          <li key={task.id} className="flex items-center gap-2">
            <span className="text-sm leading-snug">{task.name}</span>
            {isFixed ? (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Fija
              </Badge>
            ) : (
              <TaskMemberSelect
                periodId={periodId}
                taskId={task.id}
                currentMemberId={group.member.id}
                eligibleMembers={members.filter(
                  (m) => task.minAge == null || m.age >= task.minAge
                )}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
