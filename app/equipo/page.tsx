import { EquipoView } from "@/components/equipo-view";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";
import { listAssignments } from "@/lib/data/assignments";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const [members, tasks, assignments] = await Promise.all([
    listMembers(),
    listTasks(),
    listAssignments(),
  ]);

  return <EquipoView members={members} tasks={tasks} assignments={assignments} />;
}
