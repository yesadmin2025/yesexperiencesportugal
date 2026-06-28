import { createFileRoute } from "@tanstack/react-router";
import { StudioV3 } from "@/components/studio-v3/StudioV3";
import { breadcrumbLd, studioServiceLd, jsonLdScript } from "@/lib/jsonld";

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
      { title: "Studio — Design your Portugal day | YES experiences" },
      {
        name: "description",
        content:
          "Compose a private Portugal journey one quiet decision at a time — feeling, company, rhythm. The map awakens as you choose.",
      },
      { property: "og:title", content: "Design your Portugal day." },
      {
        property: "og:description",
        content: "A cinematic, guided composer — not a form. Portugal responds as you choose.",
      },
      { property: "og:url", content: CANONICAL_URL },
    ],
    links: [{ rel: "canonical", href: CANONICAL_URL }],
  }),
  component: StudioV3Page,
});

function StudioV3Page() {
  return (
    <>
      {/* SSR-visible intent for crawlers and no-JS users. */}
      <header className="sr-only">
        <h1>Design your private Portugal day.</h1>
        <p>
          A cinematic composer in three quiet steps — choose how the day should feel, who is
          travelling and the rhythm you want. The map and stops reveal themselves as you go.
        </p>
      </header>
      <StudioV3 />
    </>
  );
}
