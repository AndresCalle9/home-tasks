import { AssignButton } from "@/components/assign-button";
import { DayColumn } from "@/components/day-column";
import { getWeekSchedule } from "@/lib/mock-data";

export default function CalendarioPage() {
  const week = getWeekSchedule();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {week.map((day) => (
          <DayColumn key={day.dayOfWeek} day={day} />
        ))}
      </div>
    </div>
  );
}
