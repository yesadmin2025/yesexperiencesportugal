import { createFileRoute } from "@tanstack/react-router";
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
      {/* Short indexable intro — kept compact so it never delays the questionnaire. */}
      <section
        aria-label="About the YES Studio"
        className="bg-[color:var(--sand)] border-b border-[color:var(--border)] py-8 md:py-10"
      >
        <div className="container-x max-w-3xl">
          <div className="space-y-4 text-[14.5px] md:text-[15px] text-[color:var(--charcoal-soft)] leading-relaxed">
            <p>
              The YES Studio is an interactive way to design a private Portugal experience around
              your interests.
            </p>
            <p>
              Instead of beginning with a fixed itinerary, it begins with the traveller. Choose the
              themes, landscapes and experiences that matter to you, and the Studio will shape them
              into a coherent private day using real regional possibilities.
            </p>
            <p>
              Wine, coast, food, heritage, traditional crafts and local encounters can be combined
              without turning the day into an exhausting checklist. The final journey remains
              subject to real availability, geography and timing, so creativity is supported by
              practical local knowledge.
            </p>
            <p className="text-[13px]">
              <a
                href="/portugal-travel-designer"
                className="text-[color:var(--teal)] underline underline-offset-4 decoration-[color:var(--gold)]/60 hover:decoration-[color:var(--gold)] transition-colors"
              >
                Learn how our Portugal travel design works →
              </a>
            </p>
          </div>
        </div>
      </section>
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
