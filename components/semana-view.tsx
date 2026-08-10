"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/pill";
import { Avatar } from "@/components/avatar";
import { TaskRow } from "@/components/task-row";
import { TaskSheet } from "@/components/task-sheet";
import { DuelOverlay } from "@/components/duel-overlay";
import { useCurrentMember } from "@/components/current-member-provider";
import { useTaskSheetController, findDuelCandidates } from "@/lib/hooks/use-task-sheet-controller";
import { useTodayIndex } from "@/lib/hooks/use-client-clock";
import { DAY_ABBR, DAY_NAMES } from "@/lib/days";
import type { Assignment } from "@/lib/data/assignments";
import type { Task } from "@/lib/data/tasks";
import type { Member } from "@/lib/data/members";

const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6];

export function SemanaView({
  members,
  tasks,
  assignments,
}: {
  members: Member[];
  tasks: Task[];
  assignments: Assignment[];
}) {
  const { currentMemberId } = useCurrentMember();
  const todayIndex = useTodayIndex();
  const [view, setView] = useState<"dia" | "persona">("dia");
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? null);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const { sheetAssignment, openSheet, closeSheet, duel, startDuel, closeDuel } =
    useTaskSheetController(assignments, taskById);

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <div className="text-2xl font-bold">Nuestra semana</div>

      <div className="flex gap-2">
        <Pill active={view === "dia"} onClick={() => setView("dia")}>
          Por día
        </Pill>
        <Pill active={view === "persona"} onClick={() => setView("persona")}>
          Por persona
        </Pill>
      </div>

      {view === "dia" && (
        <>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
            {DAY_INDICES.map((d) => (
              <Pill key={d} active={selectedDay === d} onClick={() => setSelectedDay(d)}>
                {DAY_ABBR[d]}
                {d === todayIndex ? " •" : ""}
              </Pill>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {members.map((m) => {
              const dayTasks = assignments.filter(
                (a) => a.dayOfWeek === selectedDay && a.memberId === m.id
              );
              if (dayTasks.length === 0) return null;
              return (
                <div key={m.id}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <Avatar member={m} size={26} />
                    <span className="text-sm font-bold">{m.name}</span>
                  </div>
                  <div className="rounded-2xl bg-card px-3 shadow-xs ring-1 ring-foreground/10">
                    {dayTasks.map((a) => (
                      <TaskRow
                        key={a.id}
                        task={taskById.get(a.taskId)!}
                        assignment={a}
                        member={m}
                        onOpen={openSheet}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {assignments
              .filter((a) => a.dayOfWeek === selectedDay && !a.memberId)
              .map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl bg-card px-3 shadow-xs ring-1 ring-destructive/30"
                >
                  <TaskRow task={taskById.get(a.taskId)!} assignment={a} member={null} onOpen={openSheet} />
                </div>
              ))}
          </div>
        </>
      )}

      {view === "persona" && (
        <>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
            {members.map((m) => (
              <Pill
                key={m.id}
                active={selectedMemberId === m.id}
                color={m.color}
                onClick={() => setSelectedMemberId(m.id)}
              >
                {m.name}
              </Pill>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {DAY_INDICES.map((d) => {
              const dayTasks = assignments.filter(
                (a) => a.dayOfWeek === d && a.memberId === selectedMemberId
              );
              if (dayTasks.length === 0) return null;
              return (
                <div key={d}>
                  <div className="mb-1.5 text-sm font-bold text-muted-foreground">
                    {DAY_NAMES[d]}
                  </div>
                  <div className="rounded-2xl bg-card px-3 shadow-xs ring-1 ring-foreground/10">
                    {dayTasks.map((a) => (
                      <TaskRow
                        key={a.id}
                        task={taskById.get(a.taskId)!}
                        assignment={a}
                        member={memberById.get(a.memberId!) ?? null}
                        onOpen={openSheet}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {sheetAssignment && (
        <TaskSheet
          assignment={sheetAssignment}
          task={taskById.get(sheetAssignment.taskId)!}
          member={sheetAssignment.memberId ? memberById.get(sheetAssignment.memberId) ?? null : null}
          eligibleMembers={taskById
            .get(sheetAssignment.taskId)!
            .eligibleMemberIds.map((id) => memberById.get(id))
            .filter((m): m is Member => m != null)}
          isMine={sheetAssignment.memberId === currentMemberId}
          hasDuelOptions={findDuelCandidates(sheetAssignment, assignments, taskById).length > 0}
          onClose={closeSheet}
          onStartDuel={startDuel}
        />
      )}

      {duel && (
        <DuelOverlay duel={duel} taskById={taskById} memberById={memberById} onClose={closeDuel} />
      )}
    </div>
  );
}
