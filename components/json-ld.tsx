import { HUB_URL } from "@/lib/hub";
import { SITE_URL } from "@/lib/site";

// schema.org/WebApplication for the whole app. Rendered once in the root
// layout — no per-page JSON-LD, since every route describes the same
// application. `isPartOf` links it to the Trastero hub as a WebSite.
export function JsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Nest",
    description: "Reparte las tareas del hogar entre todos, semana a semana.",
    url: SITE_URL,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    isPartOf: {
      "@type": "WebSite",
      name: "Trastero",
      url: HUB_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
