import { createFileRoute } from "@tanstack/react-router";
import { StudioV3 } from "@/components/studio-v3/StudioV3";
import { breadcrumbLd, studioServiceLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { STUDIO_FAQ } from "@/content/seo-faq";

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
        <p>
          For multi-day journeys across Portugal, a human designer composes it with you —{" "}
          <a href="/multi-day">work with our Travel Designer</a>.
        </p>
      </header>
      <StudioV3 />
      <aside
        aria-label="Beyond a single day"
        className="bg-[color:var(--ivory)] border-t border-[color:var(--border)] py-10 text-center"
      >
        <div className="container-x max-w-xl">
          <p className="text-[13px] md:text-[14px] text-[color:var(--charcoal-soft)] leading-[1.7]">
            Studio composes a single private day. For a multi-day Portugal — stitched across
            regions, hotels and rhythm —{" "}
            <a
              href="/multi-day"
              className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)] transition-colors"
            >
              work with our Travel Designer
            </a>
            .
          </p>
        </div>
      </aside>
    </>
  );
}
