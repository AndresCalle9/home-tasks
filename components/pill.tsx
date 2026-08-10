import { cn } from "@/lib/utils";

export function Pill({
  active,
  color,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean; color?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
        active
          ? "text-white"
          : "border border-border bg-card text-foreground shadow-xs",
        className
      )}
      style={active ? { background: color ?? "var(--primary)" } : undefined}
      {...props}
    />
  );
}
