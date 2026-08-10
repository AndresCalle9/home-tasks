import { AjustesView } from "@/components/ajustes-view";
import { getHouseholdName } from "@/lib/data/household";
import { listTasks } from "@/lib/data/tasks";
import { listMembers } from "@/lib/data/members";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const [householdName, tasks, members] = await Promise.all([
    getHouseholdName(),
    listTasks(),
    listMembers(),
  ]);

  return <AjustesView householdName={householdName} tasks={tasks} members={members} />;
}
