import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server-auth-client";

export type CurrentHousehold = {
  id: string;
  name: string;
};

// Resolves once per request (React.cache): every page and Server Action
// calls this first and threads its `id` explicitly into lib/data/*.ts,
// rather than relying on ambient global state. middleware.ts already
// redirects unauthenticated requests before they reach a page, so the
// redirects here are a defensive second layer, not the primary guard.
export const getCurrentHousehold = cache(async (): Promise<CurrentHousehold> => {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("household")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (error || !data) redirect("/login");

  return data;
});
