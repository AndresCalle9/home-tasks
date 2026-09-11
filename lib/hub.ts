import type { HubApp } from "@andrescalle9/ui";

// Public by design: rendered in a header/footer link, never sensitive.
// Set NEXT_PUBLIC_HUB_URL to the hub's Vercel URL for now, then to
// https://trastero.dev once that domain is live.
export const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "";

export const HUB_APPS: HubApp[] = [{ name: "Trastero", url: HUB_URL }];
