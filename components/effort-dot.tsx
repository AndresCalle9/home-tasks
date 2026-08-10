import { cn } from "@/lib/utils";
import { EFFORT_WEIGHT, type Effort } from "@/lib/effort";

export function EffortDot({ effort }: { effort: Effort }) {
  const filled = EFFORT_WEIGHT[effort];

  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i <= filled ? "bg-chart-3" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
