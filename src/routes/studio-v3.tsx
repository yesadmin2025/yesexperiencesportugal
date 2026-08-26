import { createFileRoute } from "@tanstack/react-router";
import { LivingAtlasStudioPage } from "@/components/studio-v3/LivingAtlasStudioPage";
import { breadcrumbLd, studioServiceLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { ensureP14YourDayCtaVariant } from "@/lib/studio-v3/experiments";
import { STUDIO_FAQ } from "@/content/seo-faq";
import ogImg from "@/assets/decision-studio.jpg";

/**
 * /studio-v3 — the canonical public Experience Studio.
 *
 * Renders the Living Atlas implementation (entry → date → interests →
 * priority → result → shape → guest details → Stripe checkout handoff).
 * /experience-studio, /studio, /studio-v2 and /studio-living-atlas-preview
 * are permanent redirects into this route, so there is a single indexable
 * Studio surface.
 */

const CANONICAL_URL = "https://yesexperiencesportugal.com/studio-v3";

function StudioV3Route() {
  // P14 assigns before the child Studio mounts, so the very first funnel row
  // for this session already carries its experiment arm. No traveller answers,
  // saved links or durable drafts participate in assignment.
  ensureP14YourDayCtaVariant();
  return <LivingAtlasStudioPage />;
}

export const Route = createFileRoute("/studio-v3")({
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
          { name: "Experience Studio", path: "/studio-v3" },
        ]),
      ),
      jsonLdScript(
        studioServiceLd({
          path: "/studio-v3",
          name: "YES Experience Studio — Design your private Portugal day",
          description:
            "A cinematic, guided composer that designs and reserves a private Portugal day in minutes — feeling, company, rhythm, then live pricing and instant confirmation across Lisbon, Sintra, Arrábida and Sesimbra.",
        }),
      ),
      jsonLdScript(faqPageLd(STUDIO_FAQ)),
    ],
  }),
  component: StudioV3Route,
});
