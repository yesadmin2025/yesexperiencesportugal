/**
 * LiveReviews — one shared, live guest-testimonial block.
 *
 * Used on the homepage (all tours) and on every region page (filtered to
 * the tours that genuinely run there). Content is real:
 *   1. Published rows from `tour_reviews` (first-party + verified platform
 *      quotes entered by the team), fetched after hydration.
 *   2. When the database has no rows for those tours yet, the verified
 *      Viator quotes already published on the matching tour pages.
 * Nothing here is invented, and the visible rating always matches the
 * public certificate used by the footer badge and the Organization schema.
 */
import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { trackEvent } from "@/lib/analytics-events";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { REVIEW_CERTIFICATE } from "@/config/trust-certificate";
import { getViatorMeta } from "@/data/signatureToursViator";
import {
  getCuratedHomepageReviews,
  getReviewsForTours,
  type PublicReview,
} from "@/lib/reviews.functions";

type Testimonial = {
  key: string;
  title: string | null;
  body: string;
  author: string;
  source: string;
  rating: number;
};

const SOURCE_LABEL: Record<string, string> = {
  viator: "Viator",
  tripadvisor: "Tripadvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
  first_party: "Verified guest",
};

function trim(text: string, max = 220) {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function fromDb(rows: PublicReview[]): Testimonial[] {
  return rows
    .filter((r) => r.body?.trim() && Number(r.rating) >= 4)
    .map((r) => ({
      key: r.id,
      title: r.title,
      body: trim(r.body),
      author: r.reviewer_name?.trim() || "Verified guest",
      source: SOURCE_LABEL[r.source] ?? "Verified guest",
      rating: Number(r.rating),
    }));
}

/** Verified platform quotes already published on the tour pages. */
function fromTourPages(tourIds: readonly string[], limit: number): Testimonial[] {
  const out: Testimonial[] = [];
  for (const id of tourIds) {
    const meta = getViatorMeta(id);
    if (!meta) continue;
    for (const r of meta.topReviews ?? []) {
      if (!r.text?.trim()) continue;
      out.push({
        key: `${id}-${out.length}`,
        title: r.title ?? null,
        body: trim(r.text),
        author: r.author?.trim() || "Verified guest",
        source: r.source ?? "Viator",
        rating: meta.rating,
      });
      break; // one quote per tour keeps the block varied
    }
    if (out.length >= limit) break;
  }
  return out;
}

export interface LiveReviewsProps {
  /** Restrict to these Signature tours (region pages). Omit for site-wide. */
  tourIds?: readonly string[];
  /** Fallback tours whose published quotes fill the block if the DB is empty. */
  fallbackTourIds?: readonly string[];
  eyebrow?: string;
  titleLead?: string;
  titleEm?: string;
  standfirst?: string;
  limit?: number;
  /** Section id, so pages can link straight to their reviews. */
  id?: string;
  ariaLabelledBy?: string;
  className?: string;
}

export function LiveReviews({
  tourIds,
  fallbackTourIds,
  eyebrow = "Real guest reviews",
  titleLead = "In the words of",
  titleEm = "recent guests",
  standfirst,
  limit = 3,
  id = "live-reviews",
  ariaLabelledBy = "live-reviews-title",
  className = "bg-[color:var(--ivory)]",
}: LiveReviewsProps) {
  const curated = useServerFn(getCuratedHomepageReviews);
  const perTour = useServerFn(getReviewsForTours);
  const fallbackIds = fallbackTourIds ?? tourIds ?? [];
  const [quotes, setQuotes] = useState<Testimonial[]>(() => fromTourPages(fallbackIds, limit));

  useEffect(() => {
    let cancelled = false;
    const request =
      tourIds && tourIds.length > 0
        ? perTour({ data: { tourIds: [...tourIds], limit } })
        : curated({ data: { limit } });
    request
      .then((rows) => {
        if (cancelled) return;
        const live = fromDb(rows).slice(0, limit);
        if (live.length > 0) setQuotes(live);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curated, perTour, limit, tourIds?.join(",")]);

  if (quotes.length === 0) return null;

  return (
    <section
      id={id}
      className={`he-section-rule section-enter py-16 md:py-20 border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28 ${className}`}
      aria-labelledby={ariaLabelledBy}
    >
      <div className="container-x">
        <div className="reveal mx-auto mb-8 max-w-2xl text-center md:mb-12">
          <Eyebrow className="mb-5">{eyebrow}</Eyebrow>
          <SectionTitle as="h2" id={ariaLabelledBy} spacing="tight">
            {titleLead} <SectionTitle.Em>{titleEm}</SectionTitle.Em>.
          </SectionTitle>
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-sans text-[11.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            <span className="inline-flex items-center gap-1.5">
              <Star size={13} className="text-[color:var(--gold)]" aria-hidden />
              {REVIEW_CERTIFICATE.ratingValue} / {REVIEW_CERTIFICATE.bestRating} average
            </span>
            <span>Verified guests across major booking platforms</span>
          </p>
          {standfirst ? (
            <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
              {standfirst}
            </p>
          ) : null}
        </div>

        <ul className="mx-auto grid max-w-5xl list-none gap-5 p-0 md:grid-cols-3">
          {quotes.map((q) => (
            <li
              key={q.key}
              className="reveal-stagger he-card-lift flex flex-col rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] p-5 md:p-6"
            >
              <div
                className="inline-flex items-center gap-0.5 text-[color:var(--gold)]"
                aria-label={`${q.rating} out of 5`}
              >
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={13} fill="currentColor" strokeWidth={0} aria-hidden />
                ))}
              </div>
              {q.title ? (
                <p className="mt-3 text-[14.5px] font-medium leading-[1.4] text-[color:var(--charcoal)]">
                  {q.title}
                </p>
              ) : null}
              <p className="mt-2 flex-1 text-[13.5px] leading-[1.65] text-[color:var(--charcoal-soft)]">
                <Quote
                  size={13}
                  className="mr-1 inline-block text-[color:var(--gold)]"
                  aria-hidden
                />
                {q.body}
              </p>
              <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                {q.author} · via {q.source}
              </p>
            </li>
          ))}
        </ul>

        <p className="reveal mt-8 text-center md:mt-10">
          <a
            href="/reviews#leave-a-review"
            onClick={() => trackEvent("review_cta_click", { placement: id ?? "live-reviews" })}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 font-sans text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] underline decoration-[color:var(--gold)] decoration-1 underline-offset-[6px] transition-colors hover:text-[color:var(--charcoal)]"
          >
            Travelled with us? Share your experience
            <span aria-hidden className="text-[color:var(--gold)]">
              →
            </span>
          </a>
        </p>
      </div>
    </section>
  );
}

export default LiveReviews;
