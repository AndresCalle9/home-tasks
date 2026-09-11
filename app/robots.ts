import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everything under "(app)" requires a signed-in household and shows
// nothing but that household's private data (see proxy.ts) — no reason
// for a crawler to index it. Only the signed-out entry points are public.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup"],
      disallow: ["/semana", "/equipo", "/ajustes"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
