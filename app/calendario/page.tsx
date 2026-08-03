import { AssignButton } from "@/components/assign-button";
import { CalendarAccordion } from "@/components/calendar-accordion";
import { getWeekSchedule } from "@/lib/mock-data";

export default function CalendarioPage() {
  const week = getWeekSchedule();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Calendario de la semana
          </h1>
          <p className="text-sm text-muted-foreground">
            Lunes a domingo, quién hace qué.
          </p>
        </div>
        <AssignButton />
      </div>

      <CalendarAccordion week={week} />
    </div>
  );
}
