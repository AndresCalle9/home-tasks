import { MemberChip } from "@/components/member-chip";
import { TaskRow } from "@/components/task-row";
import { members, tasks } from "@/lib/mock-data";

export default function ConfiguracionPage() {
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Integrantes y tareas del hogar (solo lectura por ahora).
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold">Integrantes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {members.map((member) => (
            <MemberChip key={member.id} member={member} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold">Tareas</h2>
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              fixedMember={
                task.defaultIsFixed && task.defaultFixedMemberId
                  ? memberById.get(task.defaultFixedMemberId) ?? null
                  : null
              }
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
