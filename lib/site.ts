// This app's own public URL — not the hub's (see lib/hub.ts). Used for
// metadataBase, sitemap.ts, robots.ts and the JSON-LD schema. Prefers an
// explicit override, then Vercel's own runtime env vars (populated
// automatically on every deployment, no manual config needed there),
// falling back to localhost for local dev.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
