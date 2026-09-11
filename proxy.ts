import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];

// Refreshes the Supabase Auth session cookie on every request (the
// standard @supabase/ssr pattern — Server Components can read cookies but
// not write them, so this is the one place a refreshed token gets
// persisted) and redirects unauthenticated requests away from every
// protected route, per the household-auth spec's "every page requires a
// signed-in household" requirement. Named `proxy` per Next.js 16's file
// convention (the `middleware.ts` name/export is deprecated).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
  }

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // manifest.webmanifest and sw.js must stay reachable without a
    // session — the browser/OS fetches them (install prompts, PWA
    // metadata) without auth context, including from the signed-out
    // /login and /signup pages. robots.txt and sitemap.xml must stay
    // reachable without a session for the same reason — search engine
    // crawlers never have one.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
