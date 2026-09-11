import type { Metadata } from "next";
import { AjustesView } from "@/components/ajustes-view";
import { getCurrentHousehold } from "@/lib/auth/session";
import { listTasks } from "@/lib/data/tasks";
import { listMembers } from "@/lib/data/members";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "Ajustes",
    description: "Catálogo de tareas del hogar, integrantes y clave de acciones.",
  };
}

export default async function AjustesPage() {
  const { id: householdId, name: householdName } = await getCurrentHousehold();
  const [tasks, members] = await Promise.all([
    listTasks(householdId),
    listMembers(householdId),
  ]);

  return <AjustesView householdName={householdName} tasks={tasks} members={members} />;
}
