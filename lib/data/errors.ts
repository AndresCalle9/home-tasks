import type { PostgrestError } from "@supabase/supabase-js";

export type MutationResult = { ok: true } | { error: string };

// Maps the Postgres error codes this app's constraints can trigger to a
// friendly Spanish message. See supabase/schema.sql for the constraints.
export function mapDbError(
  error: PostgrestError,
  entity: "integrante" | "tarea"
): string {
  switch (error.code) {
    case "23505":
      return `Ya existe un/a ${entity} con ese nombre.`;
    case "23503":
      return entity === "integrante"
        ? "No se puede eliminar: sigue asignado/a como responsable fijo de una tarea. Reasígnala primero."
        : "No se puede eliminar: esta tarea sigue referenciada en otro registro.";
    case "23514":
      return entity === "integrante"
        ? "La edad debe ser un número mayor o igual a 0."
        : "Si la tarea es fija, debe tener un integrante responsable asignado.";
    default:
      return `Ocurrió un error guardando el/la ${entity}. Intenta de nuevo.`;
  }
}
