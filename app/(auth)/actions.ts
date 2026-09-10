"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server-auth-client";
import { createHousehold } from "@/lib/data/household";

export type AuthActionState = { error?: string };

// Sign-up assumes the Supabase project has "Confirm email" turned OFF, so
// signUp() returns an active session immediately — see
// openspec/changes/multi-tenant-households/design.md's Open Questions.
// If confirmation is required, `data.session` comes back null and the
// household row can't be created yet (no authenticated request to satisfy
// its RLS policy); that case is surfaced as an error rather than silently
// leaving an orphaned Auth user with no household.
export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const accountPassword = String(formData.get("accountPassword") ?? "");
  const actionPassword = String(formData.get("actionPassword") ?? "").trim();

  if (!email || !accountPassword) {
    return { error: "Completa el correo y la contraseña de la cuenta." };
  }
  if (!actionPassword) {
    return { error: "Elige una clave de acciones." };
  }

  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: accountPassword,
  });

  // Supabase returns an empty `identities` array (no error) when the email
  // already belongs to a confirmed account — treat both cases the same
  // generic way so we never reveal which emails are registered.
  if (error || !data.user || data.user.identities?.length === 0) {
    return { error: "No se pudo crear la cuenta con esos datos. Intenta de nuevo." };
  }

  if (!data.session) {
    return {
      error:
        "Cuenta creada, pero falta confirmar el correo antes de poder entrar. Revisa tu bandeja de entrada.",
    };
  }

  const result = await createHousehold(data.user.id, actionPassword);
  if ("error" in result) return result;

  redirect("/");
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Completa el correo y la contraseña." };
  }

  const supabase = await createServerAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
