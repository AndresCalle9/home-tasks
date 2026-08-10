import { InicioView } from "@/components/inicio-view";
import { getHouseholdName } from "@/lib/data/household";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";
import { listAssignments } from "@/lib/data/assignments";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const [householdName, members, tasks, assignments] = await Promise.all([
    getHouseholdName(),
    listMembers(),
    listTasks(),
    listAssignments(),
  ]);

  return (
    <InicioView
      householdName={householdName}
      members={members}
      tasks={tasks}
      assignments={assignments}
    />
  );
}
