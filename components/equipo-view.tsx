"use client";

import { useActionState, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberSheet } from "@/components/member-sheet";
import { createMemberAction, type ActionState } from "@/app/equipo/actions";
import { useCloseOnActionSuccess } from "@/lib/hooks/use-close-on-action-success";
import { MEMBER_COLOR_PALETTE } from "@/lib/color";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/data/members";
import type { Task } from "@/lib/data/tasks";
import type { Assignment } from "@/lib/data/assignments";

function AddMemberCard() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(MEMBER_COLOR_PALETTE[0]);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createMemberAction,
    {}
  );
  useCloseOnActionSuccess(state, (next) => {
    setOpen(next);
    if (!next) setName("");
  });

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={18} /> Añadir integrante
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-xs ring-1 ring-foreground/10"
    >
      <input type="hidden" name="color" value={color} />
      <div className="text-sm font-bold">Nuevo integrante</div>
      <Input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre"
        required
      />
      <div className="flex gap-2">
        {MEMBER_COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn(
              "size-7 rounded-full border-2",
              color === c ? "border-foreground" : "border-transparent"
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="bg-card" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Añadiendo…" : "Añadir"}
        </Button>
      </div>
    </form>
  );
}

export function EquipoView({
  members,
  tasks,
  assignments,
}: {
  members: Member[];
  tasks: Task[];
  assignments: Assignment[];
}) {
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const editingMember = members.find((m) => m.id === editingMemberId) ?? null;

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <div className="text-2xl font-bold">¿Quiénes hacen equipo?</div>

      <div className="flex flex-col gap-2.5">
        {members.map((m) => {
          const mine = assignments.filter((a) => a.memberId === m.id);
          const eligibleCount = tasks.filter((t) => t.eligibleMemberIds.includes(m.id)).length;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setEditingMemberId(m.id)}
              className="flex items-center gap-3.5 rounded-2xl bg-card p-3.5 text-left shadow-xs ring-1 ring-foreground/10"
            >
              <Avatar member={m} size={46} />
              <div className="flex-1">
                <div className="text-base font-bold">{m.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {mine.length} tareas esta semana · puede hacer {eligibleCount}
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground/40" />
            </button>
          );
        })}
      </div>

      <AddMemberCard />

      {editingMember && (
        <MemberSheet
          member={editingMember}
          tasks={tasks}
          onClose={() => setEditingMemberId(null)}
        />
      )}
    </div>
  );
}
