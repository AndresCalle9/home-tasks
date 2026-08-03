import { AssignWizard } from "@/components/assign-wizard";
import { listMembers } from "@/lib/data/members";

export const dynamic = "force-dynamic";

export default async function AsignarPage() {
  const members = await listMembers();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Asignar tareas
        </h1>
        <p className="text-sm text-muted-foreground">
          Define el periodo y revisa qué tareas quedan fijas antes de
          sortear.
        </p>
      </div>
      <AssignWizard members={members} />
    </div>
  );
}
