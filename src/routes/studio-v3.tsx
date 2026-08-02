import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { trackEvent } from "@/lib/analytics-events";
import { StudioV3 } from "@/components/studio-v3/StudioV3";
import { breadcrumbLd, studioServiceLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { STUDIO_FAQ } from "@/content/seo-faq";
import ogImg from "@/assets/decision-studio.jpg";

/**
 * /studio-v3 — Cinematic Journey Composer (prototype).
 *
 * Lives in parallel to /studio-v2 so we can iterate the phased flow
 * without touching the production Studio or its CI guards. Phases 1–3
 * (Feeling, Who, Rhythm) ship in this file; the map, curation,
 * storyboard, signature and booking phases follow in later turns.
 */

const CANONICAL_URL = "https://yesexperiencesportugal.com/studio-v3";

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
  component: StudioV3Page,
});

const STUDIO_START_KEY = "yes.studio.started.v1";

function StudioV3Page() {
  // Studio start — once per browser session, no PII.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STUDIO_START_KEY)) return;
      window.sessionStorage.setItem(STUDIO_START_KEY, "1");
    } catch {
      /* storage blocked — still fire once per mount */
    }
    trackEvent("studio_started", { placement: "studio_v3" });
  }, []);

  return (
    <>
      {/* SSR-visible intent for crawlers and no-JS users. */}
      <header className="sr-only">
        <h1>Design your private Portugal day.</h1>
        <p>
          A cinematic composer in three quiet steps — choose how the day should feel, who is
          travelling and the rhythm you want. The map and stops reveal themselves as you go.
        </p>
        <p>
          As you choose, the route, the stops and the price move with you. When the configuration is
          standard you can reserve it directly; when it needs local judgement, the same team reviews
          it and confirms before anything is charged.
        </p>
        <p>
          For a complete journey across Portugal rather than a single private day, a human designer
          composes it with you —{" "}
          <a href="/portugal-travel-designer">work with our Portugal Travel Designer</a>. Advisors
          and agencies planning for clients can work with us directly through{" "}
          <a href="/trade">our travel trade partnerships</a>.
        </p>
      </header>
      <StudioV3 />
    </>
  );
}
