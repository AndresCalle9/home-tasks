import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Every route under "(app)" requires a signed-in household (see proxy.ts)
// and its content is entirely household-specific, so it has nothing
// generic to offer a crawler. Only the actual public entry points belong
// here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/login`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/signup`,
      changeFrequency: "yearly",
      priority: 0.8,
    },
  ];
}
