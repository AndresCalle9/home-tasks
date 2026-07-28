import { members } from "@/lib/mock-data";

const memberIndex = new Map(members.map((m, i) => [m.id, i]));

// Assigns each household member a stable tagging color (--person-1..5 in
// globals.css) based on their position in the members list.
export function personColorVar(memberId: string): string {
  const index = memberIndex.get(memberId) ?? 0;
  return `var(--person-${(index % 5) + 1})`;
}
