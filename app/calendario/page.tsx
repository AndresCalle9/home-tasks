import { AssignButton } from "@/components/assign-button";
import { RerollButton } from "@/components/reroll-button";
import { CalendarAccordion } from "@/components/calendar-accordion";
import { getCurrentPeriod } from "@/lib/data/periods";
import { getWeekScheduleForPeriod } from "@/lib/data/assignments";
import { listMembers } from "@/lib/data/members";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const [period, members] = await Promise.all([
    getCurrentPeriod(),
    listMembers(),
  ]);
  const week = period ? await getWeekScheduleForPeriod(period.id) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Calendario de la semana
          </h1>
          <p className="text-sm text-muted-foreground">
            {period
              ? "Lunes a domingo, quién hace qué."
              : "Aún no se ha asignado ningún periodo."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AssignButton />
          {period && <RerollButton periodId={period.id} />}
        </div>
      </div>

      {week && period ? (
        <CalendarAccordion week={week} members={members} periodId={period.id} />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Usa &ldquo;Asignar tareas&rdquo; para definir el primer periodo y
          repartir las tareas de la semana.
        </div>
      )}
    </div>
  );
}
