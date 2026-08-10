import "server-only";
import { cache } from "react";
import { supabase } from "@/lib/supabase/server-client";
import type { MutationResult } from "@/lib/data/errors";

export const getHouseholdName = cache(async (): Promise<string> => {
  const { data, error } = await supabase
    .from("household")
    .select("name")
    .eq("id", 1)
    .single();

  if (error) throw new Error(error.message);
  return data.name;
});

export async function updateHouseholdName(name: string): Promise<MutationResult> {
  const { error } = await supabase
    .from("household")
    .update({ name })
    .eq("id", 1);
  if (error) return { error: "Ocurrió un error guardando el nombre. Intenta de nuevo." };
  return { ok: true };
}
