import { Badge } from "@/components/ui/badge";
import { personColorVarByIndex } from "@/lib/person-color";
import { deleteTaskAction } from "@/app/configuracion/actions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { TaskFormDialog } from "@/components/task-form-dialog";
import type { Member } from "@/lib/data/members";
import type { Task } from "@/lib/data/tasks";

export function TaskRow({
  task,
  fixedMember,
  fixedMemberIndex,
  members,
}: {
  task: Task;
  fixedMember: Member | null;
  fixedMemberIndex: number;
  members: Member[];
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 shadow-sm">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {task.name}
      </span>
      <Badge variant="secondary" className="shrink-0 text-[10px]">
        {task.isDaily ? "Diaria" : "Puntual"}
      </Badge>
      {task.minAge != null && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {task.minAge}+
        </Badge>
      )}
      {fixedMember ? (
        <Badge
          className="shrink-0 gap-1 border-transparent text-[10px] text-white"
          style={{ backgroundColor: personColorVarByIndex(fixedMemberIndex) }}
        >
          Fija · {fixedMember.name}
        </Badge>
      ) : (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Variable
        </Badge>
      )}
      <TaskFormDialog task={task} members={members} />
      <DeleteConfirmDialog
        id={task.id}
        action={deleteTaskAction}
        title={`Eliminar "${task.name}"`}
        description="Esta acción no se puede deshacer."
        triggerLabel={`Eliminar ${task.name}`}
      />
    </li>
  );
}
