"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reassignMemberAction, toggleCompleteAction, type ActionState } from "@/app/actions";
import { useCloseOnActionSuccess } from "@/lib/hooks/use-close-on-action-success";
import { DAY_NAMES } from "@/lib/days";
import { EFFORT_LABEL } from "@/lib/effort";
import type { Assignment } from "@/lib/data/assignments";
import type { Task } from "@/lib/data/tasks";
import type { Member } from "@/lib/data/members";

export function TaskSheet({
  assignment,
  task,
  member,
  eligibleMembers,
  isMine,
  hasDuelOptions,
  onClose,
  onStartDuel,
}: {
  assignment: Assignment;
  task: Task;
  member: Member | null;
  eligibleMembers: Member[];
  isMine: boolean;
  hasDuelOptions: boolean;
  onClose: () => void;
  onStartDuel: (assignment: Assignment) => void;
}) {
  const [mode, setMode] = useState<"root" | "reassign">("root");
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [reassignState, reassignFormAction, reassignPending] = useActionState<
    ActionState,
    FormData
  >(reassignMemberAction, {});
  const [completePending, setCompletePending] = useState(false);

  const done = assignment.status === "completed";
  const reassignCandidates = eligibleMembers.filter((m) => m.id !== assignment.memberId);

  async function toggleCompletion() {
    setCompletePending(true);
    const formData = new FormData();
    formData.set("assignmentId", assignment.id);
    formData.set("completed", String(!done));
    await toggleCompleteAction({}, formData);
    setCompletePending(false);
    onClose();
  }

  function confirmReassign() {
    if (!pendingMemberId) return;
    const formData = new FormData();
    formData.set("assignmentId", assignment.id);
    formData.set("taskId", task.id);
    formData.set("memberId", pendingMemberId);
    formData.set("password", password);
    reassignFormAction(formData);
  }

  useCloseOnActionSuccess(reassignState, (open) => {
    if (!open) onClose();
  });

  return (
    <BottomSheet open onOpenChange={(open) => !open && onClose()}>
      {mode === "root" && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{task.icon}</span>
            <div>
              <div className="text-lg font-bold">{task.name}</div>
              <div className="text-sm text-muted-foreground">
                {DAY_NAMES[assignment.dayOfWeek]}
              </div>
            </div>
          </div>

          <div className="my-4 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Asignada a</span>
            {member ? (
              <span className="font-bold" style={{ color: member.color }}>
                {member.name}
              </span>
            ) : (
              <span className="font-bold text-destructive">nadie todavía</span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Button
              variant="secondary"
              onClick={toggleCompletion}
              disabled={completePending}
            >
              <Check size={18} />
              {done ? "Marcar como pendiente" : "Marcar como hecha"}
            </Button>

            {reassignCandidates.length > 0 && (
              <Button variant="outline" onClick={() => setMode("reassign")}>
                Cambiar responsable
              </Button>
            )}

            {isMine && (
              <>
                <Button
                  variant="outline"
                  disabled={!hasDuelOptions}
                  className="border-primary/25 bg-secondary text-secondary-foreground"
                  onClick={() => onStartDuel(assignment)}
                >
                  ✌️ Retar por intercambio
                </Button>
                {!hasDuelOptions && (
                  <p className="-mt-1 text-center text-xs text-muted-foreground">
                    Solo puedes retar por tareas de nivel {EFFORT_LABEL[task.effort]}
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {mode === "reassign" && (
        <>
          <div className="mb-3 text-lg font-bold">¿Quién se encarga?</div>
          <div className="flex flex-col gap-2">
            {reassignCandidates.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPendingMemberId(m.id)}
                className="flex items-center gap-3 rounded-xl bg-card p-3 text-left shadow-xs ring-1 ring-foreground/10 data-[selected=true]:ring-2 data-[selected=true]:ring-primary"
                data-selected={pendingMemberId === m.id}
              >
                <Avatar member={m} size={34} />
                <span className="text-sm font-semibold">{m.name}</span>
              </button>
            ))}
          </div>

          {pendingMemberId && (
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="task-sheet-password">Clave</Label>
              <Input
                id="task-sheet-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {reassignState.error && (
                <p className="text-sm text-destructive">{reassignState.error}</p>
              )}
              <Button
                className="mt-2"
                onClick={confirmReassign}
                disabled={reassignPending}
              >
                {reassignPending ? "Guardando…" : "Confirmar"}
              </Button>
            </div>
          )}

          <Button variant="ghost" className="mt-3" onClick={() => setMode("root")}>
            Volver
          </Button>
        </>
      )}
    </BottomSheet>
  );
}
