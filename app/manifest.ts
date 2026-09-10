import type { MetadataRoute } from "next";

// Next.js serves this at /manifest.webmanifest and links it automatically
// — no need to add a <link rel="manifest"> by hand. Minimal on purpose:
// enough for "Agregar a inicio" on iOS/Android to open in standalone mode
// with the real icon, no offline support or install-time caching.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nest",
    short_name: "Nest",
    description: "Reparte las tareas del hogar entre todos, semana a semana.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#7766e8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
