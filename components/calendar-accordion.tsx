"use client";

import { useSyncExternalStore } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PersonTaskGroup } from "@/components/person-task-group";
import { getPersonGroupsForDay, type DaySchedule } from "@/lib/calendar-schedule";
import type { Member } from "@/lib/data/members";

// "Today" doesn't change during a session and isn't observable from React
// state, so there's nothing to subscribe to — this never notifies.
function subscribeToNothing() {
  return () => {};
}

function getTodayIndex() {
  return (new Date().getDay() + 6) % 7;
}

// Avoids a server/client mismatch: the server doesn't know the visitor's
// local date, so it renders no "Hoy" badge until the client snapshot runs.
function getServerTodayIndex() {
  return null;
}

export function CalendarAccordion({
  week,
  members,
}: {
  week: DaySchedule[];
  members: Member[];
}) {
  const todayIndex = useSyncExternalStore(
    subscribeToNothing,
    getTodayIndex,
    getServerTodayIndex
  );
  const memberIndexById = new Map(members.map((m, i) => [m.id, i]));

  return (
    <Accordion>
      {week.map((day) => {
        const groups = getPersonGroupsForDay(day, members);
        return (
          <AccordionItem key={day.dayOfWeek} value={day.dayOfWeek}>
            <AccordionTrigger className="py-4">
              <span className="flex items-center gap-2.5">
                <span className="font-display text-lg font-semibold">
                  {day.dayName}
                </span>
                {day.dayOfWeek === todayIndex && (
                  <Badge className="text-[10px]">Hoy</Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2.5">
                {groups.map((group) => (
                  <PersonTaskGroup
                    key={group.member.id}
                    group={group}
                    memberIndex={memberIndexById.get(group.member.id) ?? 0}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
