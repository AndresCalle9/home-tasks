export type Effort = "ligera" | "media" | "alta";

// How much load a task of this effort adds when balancing who gets what —
// see lib/algorithm/schedule.ts. Also drives EffortDot's filled-dot count.
export const EFFORT_WEIGHT: Record<Effort, number> = {
  ligera: 1,
  media: 2,
  alta: 3,
};

export const EFFORT_LABEL: Record<Effort, string> = {
  ligera: "Ligera",
  media: "Media",
  alta: "Alta",
};

export const EFFORT_LEVELS: Effort[] = ["ligera", "media", "alta"];
