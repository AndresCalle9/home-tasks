import { personColorVarByIndex } from "@/lib/person-color";
import { deleteMemberAction } from "@/app/configuracion/actions";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { MemberFormDialog } from "@/components/member-form-dialog";
import type { Member } from "@/lib/data/members";

export function MemberChip({
  member,
  index,
}: {
  member: Member;
  index: number;
}) {
  const color = personColorVarByIndex(index);
  const initial = member.name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 shadow-sm">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
      <span className="flex-1 text-sm font-medium leading-tight">
        {member.name}
      </span>
      <MemberFormDialog member={member} />
      <DeleteConfirmDialog
        id={member.id}
        action={deleteMemberAction}
        title={`Eliminar a ${member.name}`}
        description="Esta acción no se puede deshacer. Si sigue asignado/a como responsable fijo de una tarea, no se podrá eliminar hasta reasignarla."
        triggerLabel={`Eliminar a ${member.name}`}
      />
    </div>
  );
}
