import { members } from "@/lib/mock-data";

const memberIndex = new Map(members.map((m, i) => [m.id, i]));

// Assigns each mock household member (Calendario, still on lib/mock-data.ts)
// a stable tagging color (--person-1..5 in globals.css) based on their
// position in the mock members list.
export function personColorVar(memberId: string): string {
  const index = memberIndex.get(memberId) ?? 0;
  return personColorVarByIndex(index);
}

// Same palette, but keyed by an explicit position rather than a lookup
// against the mock members list — for screens backed by real Supabase data
// (Configuración), where the caller already has the member's index in the
// real list.
export function personColorVarByIndex(index: number): string {
  return `var(--person-${(index % 5) + 1})`;
}
