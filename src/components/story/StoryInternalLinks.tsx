/**
 * StoryInternalLinks — contextual internal-linking block for Local
 * Stories landing pages (Lisbon wine / day-trip / private-tour intent).
 *
 * Routes visitors — American travellers in particular — from the
 * editorial page into the three highest-converting next steps:
 *
 *   1. The Itinerary Builder (Studio) — "design your own private day"
 *   2. The parent Signature tour — pre-built, instant confirmation
 *   3. The best-fit multi-day planning itinerary from /plan/*
 *
 * Sits directly after the article body, before the related-experiences
 * rail. No invented copy — labels are derived from the article's own
 * region + signatureSlug. Brand-guardrail compliant: sand section,
 * gold rule, editorial three-tile grid, motion within allowed budget.
 */
import { Link } from "@tanstack/react-router";
import type { LocalStoryArticle } from "@/content/local-stories-articles";
import { findTour } from "@/data/signatureTours";

type PlanTarget = {
  to:
    | "/plan/5-day-portugal-itinerary"
    | "/plan/7-day-portugal-itinerary"
    | "/plan/14-day-portugal-itinerary";
  label: string;
  detail: string;
};

/** Pick the closest multi-day planning itinerary for the article's region. */
function planItineraryFor(region: string | undefined): PlanTarget {
  const r = (region ?? "").toLowerCase();
  if (r.includes("comporta") || r.includes("alentejo") || r.includes("vicentina")) {
    return {
      to: "/plan/14-day-portugal-itinerary",
      label: "14-day private Portugal itinerary",
      detail: "Lisbon → Alentejo → Comporta → the wild south coast, at a slow private pace.",
    };
  }
  if (r.includes("douro") || r.includes("porto") || r.includes("north")) {
    return {
      to: "/plan/7-day-portugal-itinerary",
      label: "7-day private Portugal itinerary",
      detail: "Lisbon, Sintra & Douro across one refined week — private, unhurried.",
    };
  }
  // Default: Lisbon-anchored week (Sintra, Arrábida, Setúbal, Évora).
  return {
    to: "/plan/7-day-portugal-itinerary",
    label: "7-day private Portugal itinerary",
    detail: "The Lisbon week we design most often — Sintra, Arrábida, Alentejo.",
  };
}

export function StoryInternalLinks({ article }: { article: LocalStoryArticle }) {
  const parent = findTour(article.signatureSlug);
  const plan = planItineraryFor(parent?.region);

  return (
    <section
      className="py-16 md:py-24 bg-[color:var(--sand)]"
      aria-labelledby="story-internal-links-heading"
    >
      <div className="container-x max-w-5xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
            Keep planning
          </span>
          <h2
            id="story-internal-links-heading"
            className="font-display font-semibold text-[1.6rem] md:text-[2rem] leading-[1.2] text-[color:var(--charcoal)]"
          >
            Take this story further
          </h2>
          <p className="mt-4 text-[15px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.75]">
            Three ways to travel it — designed with you, booked with a licensed local operator, or
            stretched into a full private week.
          </p>
          <div
            aria-hidden="true"
            className="mx-auto mt-8 h-px w-16 bg-[color:var(--gold)]/60"
          />
        </div>

        <ul className="mt-12 grid gap-6 md:grid-cols-3 list-none p-0">
          {/* 1. Studio builder — primary conversion path */}
          <li className="group bg-[color:var(--ivory)] border border-[color:var(--gold-soft)]/50 p-7 md:p-8 transition-transform duration-200 hover:-translate-y-[2px]">
            <span className="block font-sans text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--teal)] mb-3">
              Design your own
            </span>
            <h3 className="font-display font-semibold text-[1.15rem] md:text-[1.25rem] leading-[1.3] text-[color:var(--charcoal)] mb-3">
              Build your private Portugal day in the Studio
            </h3>
            <p className="text-[14.5px] leading-[1.7] text-[color:var(--charcoal)]/80 mb-6">
              A guided, real-time itinerary builder — pick the region, the pace and the moments
              that matter. Confirmed instantly.
            </p>
            <Link
              to="/studio-v3"
              className="inline-flex items-center gap-2 font-sans text-[11.5px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--gold-warm)] transition-colors"
            >
              Open the Studio
              <span aria-hidden="true" className="text-[color:var(--gold)]">→</span>
            </Link>
          </li>

          {/* 2. Parent Signature tour — pre-designed alternative */}
          {parent && (
            <li className="group bg-[color:var(--ivory)] border border-[color:var(--gold-soft)]/50 p-7 md:p-8 transition-transform duration-200 hover:-translate-y-[2px]">
              <span className="block font-sans text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--teal)] mb-3">
                Signature · pre-designed
              </span>
              <h3 className="font-display font-semibold text-[1.15rem] md:text-[1.25rem] leading-[1.3] text-[color:var(--charcoal)] mb-3">
                {parent.title}
              </h3>
              <p className="text-[14.5px] leading-[1.7] text-[color:var(--charcoal)]/80 mb-6">
                {parent.blurb}
              </p>
              <Link
                to="/tours/$tourId"
                params={{ tourId: parent.id }}
                className="inline-flex items-center gap-2 font-sans text-[11.5px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--gold-warm)] transition-colors"
              >
                See the Signature
                <span aria-hidden="true" className="text-[color:var(--gold)]">→</span>
              </Link>
            </li>
          )}

          {/* 3. Best-fit multi-day planning itinerary */}
          <li className="group bg-[color:var(--ivory)] border border-[color:var(--gold-soft)]/50 p-7 md:p-8 transition-transform duration-200 hover:-translate-y-[2px]">
            <span className="block font-sans text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--teal)] mb-3">
              Stretch it into a week
            </span>
            <h3 className="font-display font-semibold text-[1.15rem] md:text-[1.25rem] leading-[1.3] text-[color:var(--charcoal)] mb-3">
              {plan.label}
            </h3>
            <p className="text-[14.5px] leading-[1.7] text-[color:var(--charcoal)]/80 mb-6">
              {plan.detail}
            </p>
            <Link
              to={plan.to}
              className="inline-flex items-center gap-2 font-sans text-[11.5px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--gold-warm)] transition-colors"
            >
              See the itinerary
              <span aria-hidden="true" className="text-[color:var(--gold)]">→</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default StoryInternalLinks;
