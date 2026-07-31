import { MemberChip } from "@/components/member-chip";
import { MemberFormDialog } from "@/components/member-form-dialog";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { TaskRow } from "@/components/task-row";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";

export default async function ConfiguracionPage() {
  const [members, tasks] = await Promise.all([listMembers(), listTasks()]);
  const memberIndexById = new Map(members.map((m, i) => [m.id, i]));
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Integrantes y tareas del hogar.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">
            Integrantes
          </h2>
          <MemberFormDialog />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {members.map((member, index) => (
            <MemberChip key={member.id} member={member} index={index} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Tareas</h2>
          <TaskFormDialog members={members} />
        </div>
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            const fixedMember =
              task.defaultIsFixed && task.defaultFixedMemberId
                ? memberById.get(task.defaultFixedMemberId) ?? null
                : null;
            return (
              <TaskRow
                key={task.id}
                task={task}
                fixedMember={fixedMember}
                fixedMemberIndex={
                  fixedMember ? memberIndexById.get(fixedMember.id) ?? 0 : 0
                }
                members={members}
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}
