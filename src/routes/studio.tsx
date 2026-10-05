import { createFileRoute } from "@tanstack/react-router";
import { LivingAtlasStudioPage } from "@/components/studio-v3/LivingAtlasStudioPage";
import { breadcrumbLd, studioServiceLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { STUDIO_FAQ } from "@/content/seo-faq";
import ogImg from "@/assets/decision-studio.jpg";
import atmCoastal from "@/assets/studio/atm-coastal-cinematic.jpg";

/**
 * /studio — the canonical public Experience Studio.
 *
 * Renders the Living Atlas implementation (entry → date → interests →
 * priority → result → shape → guest details → Stripe checkout handoff).
 * /experience-studio, /studio-v3, /studio-v2 and /studio-living-atlas-preview
 * are permanent redirects into this route, so there is a single indexable
 * Studio surface.
 */

const CANONICAL_URL = "https://yesexperiencesportugal.com/studio";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Design Your Own Private Portugal Day | YES Studio" },
      {
        name: "description",
        content:
          "Design your own private day in Portugal online — choose the region, wine, coast and food, watch the route take shape, and confirm it instantly.",
      },

      { property: "og:title", content: "Design your Portugal day." },
      {
        property: "og:description",
        content: "Design your own private day and confirm it instantly. See your route and live price as you choose.",
      },
      { property: "og:url", content: CANONICAL_URL },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "YES Studio — design your private Portugal day" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [
      { rel: "canonical", href: CANONICAL_URL },
      { rel: "preload", as: "image", href: atmCoastal, fetchPriority: "high" },
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Experience Studio", path: "/studio" },
        ]),
      ),
      jsonLdScript(
        studioServiceLd({
          path: "/studio",
          name: "YES Experience Studio — Design your private Portugal day",
          description:
            "A cinematic, guided composer that designs and reserves a private Portugal day in minutes — feeling, company, rhythm, then live pricing and instant confirmation across Lisbon, Sintra, Arrábida and Sesimbra.",
        }),
      ),
      jsonLdScript(faqPageLd(STUDIO_FAQ)),
    ],
  }),
  component: LivingAtlasStudioPage,
});
