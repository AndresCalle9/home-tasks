import "server-only";
import { createServerAuthClient } from "@/lib/supabase/server-auth-client";
import { hashActionPassword, verifyActionPassword } from "@/lib/security/password";
import type { MutationResult } from "@/lib/data/errors";

export async function updateHouseholdName(
  householdId: string,
  name: string
): Promise<MutationResult> {
  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("household")
    .update({ name })
    .eq("id", householdId);
  if (error) return { error: "Ocurrió un error guardando el nombre. Intenta de nuevo." };
  return { ok: true };
}

// Verifies `password` against the signed-in household's own stored hash —
// used by every action gated behind the shared "clave de acciones"
// (sorteo, reset, manual reassignment). Never compares across households:
// `householdId` always comes from the caller's own session
// (getCurrentHousehold()), and RLS additionally ensures this select can
// only ever return that household's own row.
export async function verifyHouseholdActionPassword(
  householdId: string,
  password: string
): Promise<boolean> {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase
    .from("household")
    .select("action_password_hash")
    .eq("id", householdId)
    .single();
  if (error || !data) return false;
  return verifyActionPassword(password, data.action_password_hash);
}

export async function changeActionPassword(
  householdId: string,
  currentPassword: string,
  newPassword: string
): Promise<MutationResult> {
  const isCurrentCorrect = await verifyHouseholdActionPassword(householdId, currentPassword);
  if (!isCurrentCorrect) return { error: "La clave actual no es correcta." };

  const supabase = await createServerAuthClient();
  const { error } = await supabase
    .from("household")
    .update({ action_password_hash: hashActionPassword(newPassword) })
    .eq("id", householdId);
  if (error) return { error: "Ocurrió un error guardando la nueva clave. Intenta de nuevo." };
  return { ok: true };
}

// Creates the household row for a brand-new Supabase Auth user (sign-up
// flow only). Runs through the same session-scoped client as everything
// else: by the time this is called the user is already authenticated
// (signUp() started their session), so the insert's `user_id = auth.uid()`
// satisfies the household RLS policy without needing the service-role key.
export async function createHousehold(
  userId: string,
  actionPassword: string
): Promise<{ id: string } | { error: string }> {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase
    .from("household")
    .insert({
      user_id: userId,
      action_password_hash: hashActionPassword(actionPassword),
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: "Ocurrió un error creando el hogar. Intenta de nuevo." };
  }
  return { id: data.id };
}
