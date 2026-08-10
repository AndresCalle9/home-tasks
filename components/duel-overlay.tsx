"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { resolveDuelAction, type ActionState } from "@/app/actions";
import { useCloseOnActionSuccess } from "@/lib/hooks/use-close-on-action-success";
import { EFFORT_LABEL } from "@/lib/effort";
import type { Duel } from "@/lib/hooks/use-task-sheet-controller";
import type { Task } from "@/lib/data/tasks";
import type { Member } from "@/lib/data/members";

type Move = "rock" | "paper" | "scissors";
const MOVES: Array<{ key: Move; icon: string; label: string }> = [
  { key: "rock", icon: "🪨", label: "Piedra" },
  { key: "paper", icon: "📄", label: "Papel" },
  { key: "scissors", icon: "✂️", label: "Tijera" },
];

function beats(a: Move, b: Move): "tie" | "p1" | "p2" {
  if (a === b) return "tie";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "scissors" && b === "paper") ||
    (a === "paper" && b === "rock")
  ) {
    return "p1";
  }
  return "p2";
}

type Stage =
  | "choose"
  | "confirm"
  | "invite"
  | "pass-p1"
  | "play-p1"
  | "pass-p2"
  | "play-p2"
  | "reveal"
  | "result-tie"
  | "result-p1"
  | "result-p2";

export function DuelOverlay({
  duel,
  taskById,
  memberById,
  onClose,
}: {
  duel: Duel;
  taskById: Map<string, Task>;
  memberById: Map<string, Member>;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("choose");
  const [targetAssignmentId, setTargetAssignmentId] = useState<string | null>(null);
  const [p1Move, setP1Move] = useState<Move | null>(null);
  const [p2Move, setP2Move] = useState<Move | null>(null);
  const [resolveState, resolveFormAction, resolvePending] = useActionState<
    ActionState,
    FormData
  >(resolveDuelAction, {});
  useCloseOnActionSuccess(resolveState, (open) => {
    if (!open) onClose();
  });

  const requester = memberById.get(duel.assignment.memberId ?? "");
  const myTask = taskById.get(duel.assignment.taskId);
  const targetAssignment = duel.candidates.find((a) => a.id === targetAssignmentId) ?? null;
  const challenged = targetAssignment ? memberById.get(targetAssignment.memberId ?? "") : null;
  const theirTask = targetAssignment ? taskById.get(targetAssignment.taskId) : null;

  if (!requester || !myTask) return null;

  const finish = (requesterWon: boolean) => {
    if (!requesterWon || !targetAssignment) {
      onClose();
      return;
    }
    const formData = new FormData();
    formData.set("assignmentAId", duel.assignment.id);
    formData.set("memberAId", targetAssignment.memberId ?? "");
    formData.set("assignmentBId", targetAssignment.id);
    formData.set("memberBId", requester.id);
    resolveFormAction(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full bg-foreground/5"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center px-6 pb-10 text-center">
          {stage === "choose" && (
            <div className="w-full max-w-sm">
              <div className="mb-1.5 text-xl font-bold">¿Por cuál la cambiarías?</div>
              <p className="mb-5 text-sm text-muted-foreground">
                Ofreces <b className="text-foreground">{myTask.icon} {myTask.name}</b> · solo
                tareas del mismo día y de nivel{" "}
                <b className="text-foreground">{EFFORT_LABEL[myTask.effort]}</b>
              </p>
              <div className="flex flex-col gap-2 text-left">
                {duel.candidates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nadie tiene hoy una tarea de nivel{" "}
                    {EFFORT_LABEL[myTask.effort].toLowerCase()} disponible para retar.
                  </p>
                )}
                {duel.candidates.map((a) => {
                  const t = taskById.get(a.taskId);
                  const m = memberById.get(a.memberId ?? "");
                  if (!t || !m) return null;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setTargetAssignmentId(a.id);
                        setStage("confirm");
                      }}
                      className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-xs ring-1 ring-foreground/10"
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{t.name}</span>
                        <span className="text-xs font-semibold" style={{ color: m.color }}>
                          {m.name}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {stage === "confirm" && challenged && theirTask && (
            <div className="w-full max-w-xs">
              <div className="mb-6 text-xl font-bold">✌️ Duelo en casa</div>
              <DuelVs a={{ member: requester, task: myTask }} b={{ member: challenged, task: theirTask }} />
              <p className="my-6 text-sm text-muted-foreground">Si ganas, intercambiáis las tareas.</p>
              <Button onClick={() => setStage("invite")}>Enviar reto</Button>
              <Button variant="ghost" className="mt-2" onClick={() => setStage("choose")}>
                Volver
              </Button>
            </div>
          )}

          {stage === "invite" && challenged && theirTask && (
            <div className="w-full max-w-xs">
              <Avatar member={challenged} size={64} />
              <div className="mt-4 mb-1 text-lg font-bold">👋 {challenged.name}, te retan</div>
              <p className="mb-6 text-sm text-muted-foreground">
                {requester.name} quiere cambiar <b className="text-foreground">{myTask.name}</b> por{" "}
                <b className="text-foreground">{theirTask.name}</b>
              </p>
              <Button onClick={() => setStage("pass-p1")}>✌️ Aceptar duelo</Button>
              <Button variant="ghost" className="mt-2" onClick={onClose}>
                Ahora no
              </Button>
            </div>
          )}

          {stage === "pass-p1" && (
            <PassScreen name={requester.name} onReady={() => setStage("play-p1")} />
          )}

          {stage === "play-p1" && (
            <MoveScreen
              name={requester.name}
              onPick={(move) => {
                setP1Move(move);
                setStage("pass-p2");
              }}
            />
          )}

          {stage === "pass-p2" && challenged && (
            <PassScreen name={challenged.name} onReady={() => setStage("play-p2")} />
          )}

          {stage === "play-p2" && challenged && (
            <MoveScreen
              name={challenged.name}
              onPick={(move) => {
                setP2Move(move);
                setStage("reveal");
              }}
            />
          )}

          {stage === "reveal" && p1Move && p2Move && challenged && (
            <div className="w-full max-w-xs">
              <div className="mb-5 flex items-center justify-center gap-8">
                <MoveReveal name={requester.name} move={p1Move} />
                <div className="self-center font-bold text-muted-foreground">VS</div>
                <MoveReveal name={challenged.name} move={p2Move} />
              </div>
              <Button onClick={() => setStage(`result-${beats(p1Move, p2Move)}`)}>
                Ver resultado
              </Button>
            </div>
          )}

          {stage.startsWith("result-") && challenged && (
            <ResultScreen
              stage={stage}
              challengedName={challenged.name}
              resolvePending={resolvePending}
              resolveError={resolveState.error}
              onRematch={() => {
                setP1Move(null);
                setP2Move(null);
                setStage("pass-p1");
              }}
              onFinish={finish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DuelVs({
  a,
  b,
}: {
  a: { member: Member; task: Task };
  b: { member: Member; task: Task };
}) {
  return (
    <div className="flex items-center gap-2">
      <DuelSide side={a} />
      <div className="text-sm font-extrabold text-primary">VS</div>
      <DuelSide side={b} />
    </div>
  );
}

function DuelSide({ side }: { side: { member: Member; task: Task } }) {
  return (
    <div className="flex-1">
      <Avatar member={side.member} size={54} />
      <div className="mt-2 text-sm font-bold">{side.member.name}</div>
      <div className="mt-1.5 text-2xl">{side.task.icon}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{side.task.name}</div>
    </div>
  );
}

function PassScreen({ name, onReady }: { name: string; onReady: () => void }) {
  return (
    <div className="w-full max-w-xs">
      <div className="mb-3 text-4xl">📱</div>
      <div className="mb-1.5 text-lg font-bold">Pasa el móvil a {name}</div>
      <p className="mb-5 text-sm text-muted-foreground">Que nadie mire su jugada 👀</p>
      <Button onClick={onReady}>Listo, es mi turno</Button>
    </div>
  );
}

function MoveScreen({
  name,
  onPick,
}: {
  name: string;
  onPick: (move: Move) => void;
}) {
  return (
    <div className="w-full max-w-xs">
      <div className="mb-1 text-lg font-bold">{name}, elige tu jugada</div>
      <p className="mb-6 text-xs text-muted-foreground">3 · 2 · 1 · ¡YA!</p>
      <div className="flex justify-center gap-3.5">
        {MOVES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onPick(m.key)}
            className="flex size-21 items-center justify-center rounded-2xl border-2 border-primary/25 bg-secondary text-3xl"
          >
            {m.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function MoveReveal({ name, move }: { name: string; move: Move }) {
  const m = MOVES.find((x) => x.key === move)!;
  return (
    <div>
      <div className="text-5xl">{m.icon}</div>
      <div className="mt-1.5 text-xs font-semibold">{name}</div>
    </div>
  );
}

function ResultScreen({
  stage,
  challengedName,
  resolvePending,
  resolveError,
  onRematch,
  onFinish,
}: {
  stage: Stage;
  challengedName: string;
  resolvePending: boolean;
  resolveError?: string;
  onRematch: () => void;
  onFinish: (requesterWon: boolean) => void;
}) {
  if (stage === "result-tie") {
    return (
      <div>
        <div className="text-4xl">🤝</div>
        <div className="my-2.5 text-xl font-bold">Empate</div>
        <Button onClick={onRematch}>Revancha</Button>
      </div>
    );
  }

  const requesterWon = stage === "result-p1";
  return (
    <div className="w-full max-w-xs">
      <div className="text-4xl">{requesterWon ? "🎉" : "🛡️"}</div>
      <div className="mt-2.5 mb-2 text-xl font-bold">
        {requesterWon ? "¡Cambio conseguido!" : `${challengedName} defiende su tarea`}
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        {requesterWon
          ? "Trato hecho. Las tareas se han intercambiado."
          : "Las tareas permanecen como estaban."}
      </p>
      {resolveError && <p className="mb-2 text-sm text-destructive">{resolveError}</p>}
      <Button disabled={resolvePending} onClick={() => onFinish(requesterWon)}>
        {resolvePending ? "Guardando…" : "Volver a la semana"}
      </Button>
    </div>
  );
}
