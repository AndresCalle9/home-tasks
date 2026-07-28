import { Badge } from "@/components/ui/badge";
import { personColorVar } from "@/lib/person-color";
import type { Member, Task } from "@/lib/mock-data";

export function TaskRow({
  task,
  fixedMember,
}: {
  task: Task;
  fixedMember: Member | null;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 shadow-sm">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {task.name}
      </span>
      <Badge variant="secondary" className="shrink-0 text-[10px]">
        {task.isDaily ? "Diaria" : "Puntual"}
      </Badge>
      {fixedMember ? (
        <Badge
          className="shrink-0 gap-1 border-transparent text-[10px] text-white"
          style={{ backgroundColor: personColorVar(fixedMember.id) }}
        >
          Fija · {fixedMember.name}
        </Badge>
      ) : (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Variable
        </Badge>
      )}
    </li>
  );
}
