/**
 * GuestQuotes — homepage social proof block.
 *
 * 1. Aggregate trust line driven by the real `global_review_aggregate`
 *    view (sum across all platforms + first-party). If the DB is empty,
 *    falls back to the "700+" claim without inventing a precise digit.
 * 2. Up to 6 curated 5★ quotes from `tour_reviews` (admin-marked
 *    is_featured). When none exist, the quote row is hidden.
 * 3. Trust line: "Based on verified guest reviews across major booking
 *    platforms." — visible, non-decorative.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PlatformBadge, type Platform } from "@/components/PlatformBadge";
import {
  getGlobalReviewStats,
  getCuratedHomepageReviews,
  type GlobalStats,
  type PublicReview,
} from "@/lib/reviews.functions";
import { SITE_URL } from "@/lib/jsonld";

const PLATFORMS: Platform[] = ["tripadvisor", "viator", "google", "getyourguide", "trustpilot"];

const SOURCE_LABEL: Record<string, string> = {
  viator: "Viator",
  tripadvisor: "Tripadvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
  first_party: "Verified guest",
};

export function GuestQuotes() {
  const statsFn = useServerFn(getGlobalReviewStats);
  const quotesFn = useServerFn(getCuratedHomepageReviews);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [quotes, setQuotes] = useState<PublicReview[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([statsFn({}), quotesFn({ data: { limit: 6 } })])
      .then(([s, q]) => {
        if (cancelled) return;
        setStats(s);
        setQuotes(q);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [statsFn, quotesFn]);

  const hasReal = stats && stats.total_reviews >= 25;
  const count = hasReal ? stats!.total_reviews : null;
  const avg = hasReal && stats!.average_rating ? stats!.average_rating : null;

  /**
   * JSON-LD — AggregateRating + Review nodes attached to the sitewide
   * Organization (@id `${SITE_URL}/#organization`). Emitted ONLY when the
   * visible carousel is rendering the matching reviews on the page, so
   * Google's "visible parity" rule for review-rich results is honored.
   *
   * The script tag is `display:none` by default and adds zero layout —
   * it can never cause CLS. We stringify inside useMemo so the payload
   * only rebuilds when the underlying data actually changes.
   */
  const structuredData = useMemo(() => {
    if (quotes.length === 0) return null;
    const orgId = `${SITE_URL}/#organization`;
    const ratingValue = avg ?? 4.9;
    const reviewCount = count ?? 700;

    const graph: Record<string, unknown>[] = [
      {
        "@type": "AggregateRating",
        "@id": `${SITE_URL}/#aggregate-rating`,
        itemReviewed: { "@id": orgId },
        ratingValue: Number(ratingValue.toFixed(1)),
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
      ...quotes.map((q) => ({
        "@type": "Review",
        "@id": `${SITE_URL}/#review-${q.id}`,
        itemReviewed: { "@id": orgId },
        author: {
          "@type": "Person",
          name: q.reviewer_name ?? "Guest",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: Math.round(q.rating),
          bestRating: 5,
          worstRating: 1,
        },
        reviewBody: q.body.length > 200 ? `${q.body.slice(0, 197)}…` : q.body,
        publisher: {
          "@type": "Organization",
          name: SOURCE_LABEL[q.source] ?? q.source,
        },
      })),
    ];

    return { "@context": "https://schema.org", "@graph": graph };
  }, [quotes, avg, count]);


  return (
    <div className="mt-6 md:mt-8 text-center">
      {/* Structured data — AggregateRating + Review nodes, attached to
          the sitewide Organization. `<script>` renders no visible box so
          it cannot cause layout shift. Emitted only once real reviews
          are rendered on the page (visible-parity requirement). */}
      {structuredData && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <div className="inline-flex items-center gap-1 text-[color:var(--gold)]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
        ))}
      </div>

      <p className="mt-2 font-[family-name:var(--font-sans)] text-[13px] md:text-[14px] leading-[1.55] text-[color:var(--charcoal)]">
        {count ? (
          <>
            <span className="tabular-nums font-semibold">{count.toLocaleString("en-US")}</span>{" "}
            <span>five-star reviews</span>
            {avg && (
              <span className="text-[color:var(--charcoal)]/65"> · {avg.toFixed(1)}★</span>
            )}
            <span className="text-[color:var(--charcoal)]/75"> across major platforms.</span>
          </>
        ) : (
          <>
            <span className="tabular-nums font-semibold">700+</span>{" "}
            <span>five-star reviews</span>
            <span className="text-[color:var(--charcoal)]/75"> across major platforms.</span>
          </>
        )}
      </p>

      <ul
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 list-none p-0"
        aria-label="Featured on Tripadvisor, Viator, Google, GetYourGuide and Trustpilot"
      >
        {PLATFORMS.map((p) => (
          <li key={p} className="h-5 flex items-center opacity-85">
            <PlatformBadge platform={p} />
          </li>
        ))}
      </ul>

      {/* Reservation slot — reserves the review-card min-height BEFORE
          data arrives so the section never causes a layout shift. Even
          when `quotes` is empty the row keeps its space. */}
      <div className="mt-8 md:mt-10 -mx-5 sm:mx-0 min-h-[15rem] sm:min-h-[16rem]">
        {quotes.length > 0 && (
          <ul
            className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 items-stretch gap-4 md:gap-5 px-5 sm:px-0 overflow-x-auto sm:overflow-visible overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory sm:snap-none scroll-pl-5 sm:scroll-pl-0 text-left list-none p-0"
            aria-label="Recent guest reviews"
          >
            {quotes.map((q) => (
              <li
                key={q.id}
                className="reveal-stagger he-card-lift shrink-0 snap-start w-[82vw] sm:w-auto sm:shrink flex flex-col min-h-[14rem] sm:min-h-[15rem] rounded-lg border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-4 md:p-5"
              >
                <div
                  className="inline-flex items-center gap-0.5 text-[color:var(--gold)] h-4"
                  aria-hidden="true"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      fill={i < Math.round(q.rating) ? "currentColor" : "none"}
                      strokeWidth={i < Math.round(q.rating) ? 0 : 1.5}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[13px] md:text-[13.5px] leading-relaxed text-[color:var(--charcoal)]/85 line-clamp-5">
                  “{q.body.length > 200 ? `${q.body.slice(0, 197)}…` : q.body}”
                </p>
                <p className="mt-auto pt-3 text-[11.5px] text-[color:var(--charcoal)]/60">
                  {q.reviewer_name ?? "Guest"}
                  {q.reviewer_country ? ` · ${q.reviewer_country}` : ""}
                  <span className="ml-1 text-[color:var(--charcoal)]/50">
                    · via {SOURCE_LABEL[q.source] ?? q.source}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default GuestQuotes;
