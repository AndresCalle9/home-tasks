import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

// The one per-request Supabase client for everything that isn't a hand-run
// maintenance script: Supabase Auth (sign up/in/out, session lookup) AND
// every household-scoped data query in lib/data/*.ts. Once the session
// cookie identifies a user, every request this client makes — auth calls
// and .from() table queries alike — carries that user's access token, so
// Postgres's Row Level Security policies (keyed on auth.uid(), see
// supabase/schema.sql) actually enforce per-household isolation. Cached
// per request via React.cache so repeated calls reuse one instance.
// Never imported from a "use client" file — anon key stays server-only.
export const createServerAuthClient = cache(async function createServerAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, which can't set
          // cookies — safe to ignore since middleware.ts refreshes the
          // session on every request instead.
        }
      },
    },
  });
});
