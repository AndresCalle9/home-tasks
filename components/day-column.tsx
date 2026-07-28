import { TaskCard } from "@/components/task-card";
import type { DaySchedule } from "@/lib/mock-data";

export function DayColumn({ day }: { day: DaySchedule }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-3">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {day.dayName}
      </h2>
      <ul className="flex flex-col gap-2">
        {day.items.map((item) => (
          <TaskCard
            key={`${item.task.id}-${day.dayOfWeek}`}
            task={item.task}
            member={item.member}
            isFixed={item.isFixed}
          />
        ))}
      </ul>
    </section>
  );
}
