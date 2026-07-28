import { Badge } from "@/components/ui/badge";
import { personColorVar } from "@/lib/person-color";
import type { Member, Task } from "@/lib/mock-data";

export function TaskCard({
  task,
  member,
  isFixed,
}: {
  task: Task;
  member: Member;
  isFixed: boolean;
}) {
  const color = personColorVar(member.id);
  const initial = member.name.charAt(0).toUpperCase();

  return (
    <li
      className="flex items-start gap-2.5 rounded-lg border-l-4 bg-card px-3 py-2.5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderLeftColor: color }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium leading-snug break-words">
          {task.name}
        </span>
        <span className="text-xs text-muted-foreground">{member.name}</span>
      </div>
      {isFixed && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Fija
        </Badge>
      )}
    </li>
  );
}
