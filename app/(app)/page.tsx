import { InicioView } from "@/components/inicio-view";
import { getCurrentHousehold } from "@/lib/auth/session";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";
import { listAssignments } from "@/lib/data/assignments";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const { id: householdId, name: householdName } = await getCurrentHousehold();
  const [members, tasks, assignments] = await Promise.all([
    listMembers(householdId),
    listTasks(householdId),
    listAssignments(householdId),
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
