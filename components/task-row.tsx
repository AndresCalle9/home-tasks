import { Badge } from "@/components/ui/badge";
import { deleteTaskAction } from "@/app/configuracion/actions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { TaskFormDialog } from "@/components/task-form-dialog";
import type { Member } from "@/lib/data/members";
import type { Task } from "@/lib/data/tasks";

export function TaskRow({
  task,
  fixedMembers,
  members,
}: {
  task: Task;
  fixedMembers: Member[];
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
      {task.timesPerWeek != null && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {task.timesPerWeek}x/semana
        </Badge>
      )}
      {task.dayGroup != null && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Grupo: {task.dayGroup}
        </Badge>
      )}
      {fixedMembers.length > 0 ? (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Fija · {fixedMembers.map((m) => m.name).join(", ")}
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
