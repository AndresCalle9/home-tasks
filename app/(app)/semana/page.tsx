import { SemanaView } from "@/components/semana-view";
import { getCurrentHousehold } from "@/lib/auth/session";
import { listMembers } from "@/lib/data/members";
import { listTasks } from "@/lib/data/tasks";
import { listAssignments } from "@/lib/data/assignments";

export const dynamic = "force-dynamic";

export default async function SemanaPage() {
  const { id: householdId } = await getCurrentHousehold();
  const [members, tasks, assignments] = await Promise.all([
    listMembers(householdId),
    listTasks(householdId),
    listAssignments(householdId),
  ]);

  return <SemanaView members={members} tasks={tasks} assignments={assignments} />;
}
