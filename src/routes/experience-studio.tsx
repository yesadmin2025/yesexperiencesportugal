import { createFileRoute } from "@tanstack/react-router";
import { StudioExperiencePage } from "@/components/studio-v3/StudioExperiencePage";
import { breadcrumbLd, studioServiceLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { STUDIO_FAQ } from "@/content/seo-faq";
import ogImg from "@/assets/decision-studio.jpg";

/**
 * /experience-studio — the canonical public Experience Studio.
 *
 * Renders the Studio V3 / Living Atlas implementation. `/studio-v3` and
 * `/studio` remain as alias / redirect entry points, but every public
 * navigation entry, canonical URL and JSON-LD node points here.
 */

const CANONICAL_URL = "https://yesexperiencesportugal.com/experience-studio";

export const Route = createFileRoute("/experience-studio")({
  head: () => ({
    meta: [
      { title: "Design Your Portugal Experience | YES Studio" },
      {
        name: "description",
        content:
          "Build a private Portugal experience through the YES Studio, combining regions, wine, coast, food, heritage and local activities around your interests.",
      },

      { property: "og:title", content: "Design your Portugal day." },
      {
        property: "og:description",
        content: "A cinematic, guided composer — not a form. Portugal responds as you choose.",
      },
      { property: "og:url", content: CANONICAL_URL },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "YES Studio — design your private Portugal day" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [{ rel: "canonical", href: CANONICAL_URL }],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Experience Studio", path: "/experience-studio" },
        ]),
      ),
      jsonLdScript(
        studioServiceLd({
          path: "/experience-studio",
          name: "YES Experience Studio — Design your private Portugal day",
          description:
            "A cinematic, guided composer that designs and reserves a private Portugal day in minutes — feeling, company, rhythm, then live pricing and instant confirmation across Lisbon, Sintra, Arrábida and Sesimbra.",
        }),
      ),
      jsonLdScript(faqPageLd(STUDIO_FAQ)),
    ],
  }),
  component: StudioExperiencePage,
});
