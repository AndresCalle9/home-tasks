"use client";

import { useMemo } from "react";
import { Pill } from "@/components/pill";
import { Avatar } from "@/components/avatar";
import { TaskRow } from "@/components/task-row";
import { TaskSheet } from "@/components/task-sheet";
import { DuelOverlay } from "@/components/duel-overlay";
import { useCurrentMember } from "@/components/current-member-provider";
import { useTaskSheetController, findDuelCandidates } from "@/lib/hooks/use-task-sheet-controller";
import { useGreeting, useTodayIndex } from "@/lib/hooks/use-client-clock";
import type { Assignment } from "@/lib/data/assignments";
import type { Task } from "@/lib/data/tasks";
import type { Member } from "@/lib/data/members";

export function InicioView({
  householdName,
  members,
  tasks,
  assignments,
}: {
  householdName: string;
  members: Member[];
  tasks: Task[];
  assignments: Assignment[];
}) {
  const { currentMemberId, setCurrentMemberId } = useCurrentMember();
  const todayIndex = useTodayIndex();
  const greeting = useGreeting();

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const { sheetAssignment, openSheet, closeSheet, duel, startDuel, closeDuel } =
    useTaskSheetController(assignments, taskById);

  const todaysAssignments = useMemo(
    () => (todayIndex == null ? [] : assignments.filter((a) => a.dayOfWeek === todayIndex)),
    [assignments, todayIndex]
  );
  const myToday = todaysAssignments.filter((a) => a.memberId === currentMemberId);
  const doneToday = todaysAssignments.filter((a) => a.status === "completed").length;

  return (
    <div className="flex flex-col gap-6 px-5 py-6">
      <div>
        <div className="text-2xl font-bold">{greeting ?? "Hola"} 👋</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Esto es lo que tenemos hoy en {householdName}
        </p>
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
        {members.map((m) => (
          <Pill
            key={m.id}
            active={currentMemberId === m.id}
            color={m.color}
            onClick={() => setCurrentMemberId(m.id)}
          >
            {m.name}
          </Pill>
        ))}
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
        <div className="text-sm font-bold">{todaysAssignments.length} tareas para hoy</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {todaysAssignments.length - doneToday} pendientes · {doneToday} completadas
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-lg font-bold">Tu misión de hoy</div>
        {myToday.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            Nada por aquí hoy — respira tranquilo/a ✨
          </p>
        ) : (
          <div className="rounded-2xl bg-card px-3 shadow-xs ring-1 ring-foreground/10">
            {myToday.map((a) => (
              <TaskRow
                key={a.id}
                task={taskById.get(a.taskId)!}
                assignment={a}
                member={a.memberId ? memberById.get(a.memberId) ?? null : null}
                onOpen={openSheet}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2.5 text-lg font-bold">Así va el equipo</div>
        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const mine = todaysAssignments.filter((a) => a.memberId === m.id);
            const done = mine.filter((a) => a.status === "completed").length;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-xs ring-1 ring-foreground/10"
              >
                <Avatar member={m} size={38} />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {done} de {mine.length} listas
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
