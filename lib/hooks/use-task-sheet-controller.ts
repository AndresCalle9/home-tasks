import { useState } from "react";
import type { Assignment } from "@/lib/data/assignments";
import type { Task } from "@/lib/data/tasks";

export type Duel = {
  assignment: Assignment;
  candidates: Assignment[];
};

// Other assignments the requester could offer to swap for: same effort
// level as their own task, held by someone else, not already done, and
// something the requester is actually eligible to take on.
export function findDuelCandidates(
  assignment: Assignment,
  assignments: Assignment[],
  taskById: Map<string, Task>
): Assignment[] {
  const requesterId = assignment.memberId;
  const myTask = taskById.get(assignment.taskId);
  if (!requesterId || !myTask) return [];

  return assignments.filter((a) => {
    if (a.id === assignment.id || !a.memberId || a.memberId === requesterId) return false;
    if (a.status === "completed") return false;
    const task = taskById.get(a.taskId);
    if (!task) return false;
    return task.eligibleMemberIds.includes(requesterId) && task.effort === myTask.effort;
  });
}

// Shared between Inicio and Semana: both let you open a task's detail
// sheet and, from there, start a duel to swap it for another task.
export function useTaskSheetController(
  assignments: Assignment[],
  taskById: Map<string, Task>
) {
  const [sheetAssignment, setSheetAssignment] = useState<Assignment | null>(null);
  const [duel, setDuel] = useState<Duel | null>(null);

  function startDuel(assignment: Assignment) {
    setSheetAssignment(null);
    setDuel({ assignment, candidates: findDuelCandidates(assignment, assignments, taskById) });
  }

  return {
    sheetAssignment,
    openSheet: setSheetAssignment,
    closeSheet: () => setSheetAssignment(null),
    duel,
    startDuel,
    closeDuel: () => setDuel(null),
  };
}
