// Pure shaping/grouping helpers for the calendar — no Supabase import here.
// Safe to import from a Client Component (components/calendar-accordion.tsx);
// keep it that way, or the client bundle pulls in lib/supabase/server-client.ts
// and crashes in the browser (it has no server env vars).
import type { Member } from "@/lib/data/members";
import type { Task } from "@/lib/data/tasks";

export const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export type DaySchedule = {
  dayOfWeek: number;
  dayName: string;
  items: Array<{
    assignmentId: string;
    task: Task;
    member: Member;
    isFixed: boolean;
    completed: boolean;
  }>;
};

export type PersonGroup = {
  member: Member;
  items: Array<{
    assignmentId: string;
    task: Task;
    isFixed: boolean;
    completed: boolean;
  }>;
};

// `members` is the full household list, used only to order groups the same
// way person-colors are assigned elsewhere (by position in that list).
export function getPersonGroupsForDay(
  day: DaySchedule,
  members: Member[]
): PersonGroup[] {
  const itemsByMemberId = new Map<string, PersonGroup["items"]>();

  for (const { assignmentId, task, member, isFixed, completed } of day.items) {
    const items = itemsByMemberId.get(member.id) ?? [];
    items.push({ assignmentId, task, isFixed, completed });
    itemsByMemberId.set(member.id, items);
  }

  return members
    .filter((member) => itemsByMemberId.has(member.id))
    .map((member) => ({ member, items: itemsByMemberId.get(member.id)! }));
}
