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
import {
  getGlobalReviewStats,
  getCuratedHomepageReviews,
  type GlobalStats,
  type PublicReview,
} from "@/lib/reviews.functions";
import { ReviewSourceLink } from "@/components/ui/ReviewSourceLink";
import { buildGuestQuotesJsonLd, SOURCE_LABEL } from "@/lib/guest-quotes-jsonld";

export function GuestQuotes() {
  const statsFn = useServerFn(getGlobalReviewStats);
  const quotesFn = useServerFn(getCuratedHomepageReviews);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [quotes, setQuotes] = useState<PublicReview[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([statsFn({}), quotesFn({ data: { limit: 8 } })])
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
   * Organization. Built by the pure `buildGuestQuotesJsonLd` module so
   * the exact shape shipped to browsers is guarded by
   * `src/__tests__/guest-quotes-jsonld.test.ts` — schema regressions
   * (missing author, missing itemReviewed.name, invalid rating range,
   * malformed datePublished, non-absolute review URL) fail the build.
   *
   * `<script>` renders no visible box, so it can never cause CLS.
   */
  const structuredData = useMemo(
    () =>
      buildGuestQuotesJsonLd(
        quotes.map((q) => ({
          id: q.id,
          source: q.source,
          rating: q.rating,
          body: q.body,
          reviewer_name: q.reviewer_name,
          reviewer_country: q.reviewer_country,
          source_url: q.source_url,
          published_at: q.published_at ?? null,
        })),
        { count, avg },
      ),
    [quotes, avg, count],
  );

  return (
    <div className="mt-6 md:mt-8 text-center">
      {/* Structured data — AggregateRating + Review nodes, attached to
          the sitewide Organization. `<script>` renders no visible box so
          it cannot cause layout shift. Emitted only once real reviews
          are rendered on the page (visible-parity requirement). */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <div
        className="inline-flex items-center gap-1 mb-5 text-[color:var(--gold)]"
        aria-hidden="true"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
        ))}
      </div>

      <h2 className="serif mt-3 text-[1.5rem] sm:text-[2rem] md:text-[3.4rem] leading-[1.15] md:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance">
        {count ? (
          <>
            {count.toLocaleString("en-US")} five-star reviews{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              — real guests, real stories.
            </span>
          </>
        ) : (
          <>
            700+ five-star reviews{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              — real guests, real stories.
            </span>
          </>
        )}
      </h2>

      {/* Platform badge row removed — each review card now carries its
          own source label ("via Tripadvisor" etc.), so the standalone
          badge strip was redundant. */}

      <ReviewCarousel quotes={quotes} />
    </div>
  );
}

/**
 * Premium editorial carousel — horizontal snap on every breakpoint (mobile:
 * one card, tablet: ~2, desktop: ~3), edge fade masks, dot navigation, and
 * arrow controls on ≥md. Uses native scroll-snap for buttery inertia.
 * Reserves min-height BEFORE data arrives so there is no CLS.
 */
function ReviewCarousel({ quotes }: { quotes: PublicReview[] }) {
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || quotes.length === 0) return;
    const onScroll = () => {
      const card = el.querySelector<HTMLLIElement>("li");
      if (!card) return;
      const gap = parseFloat(getComputedStyle(el).columnGap || "16");
      const step = card.offsetWidth + gap;
      const idx = Math.round(el.scrollLeft / step);
      setActiveIndex(Math.max(0, Math.min(quotes.length - 1, idx)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [quotes.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLLIElement>("li");
    if (!card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || "16");
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: "smooth" });
  };

  return (
    <div className="relative mt-8 md:mt-10 -mx-5 sm:mx-0 min-h-[15rem] sm:min-h-[16rem]">
      {quotes.length === 0 ? null : (
        <>
          {/* Edge fade masks — premium editorial cue that content continues */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 z-10 bg-gradient-to-r from-[color:var(--ivory)] to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-[color:var(--ivory)] to-transparent"
          />

          <ul
            ref={trackRef}
            className="flex items-stretch gap-4 md:gap-5 px-5 sm:px-6 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory scroll-pl-5 sm:scroll-pl-6 text-left list-none p-0"
            aria-label="Recent guest reviews"
          >
            {quotes.map((q, idx) => (
              <li
                key={q.id}
                className="he-card-lift shrink-0 snap-start w-[82vw] sm:w-[46%] lg:w-[31.5%] flex flex-col min-h-[15rem] sm:min-h-[16rem] rounded-[2px] border border-[color:var(--charcoal)]/10 bg-white p-6 md:p-7 relative shadow-[0_1px_0_rgba(46,46,46,0.04),0_10px_28px_-18px_rgba(46,46,46,0.14)]"
              >
                <Quote
                  aria-hidden="true"
                  size={44}
                  className="absolute -top-3 right-4 text-[color:var(--gold)]/18 rotate-180"
                  strokeWidth={1}
                  fill="currentColor"
                />
                <div
                  className="inline-flex items-center gap-0.5 text-[color:var(--gold)] h-4"
                  aria-hidden="true"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < Math.round(q.rating) ? "currentColor" : "none"}
                      strokeWidth={i < Math.round(q.rating) ? 0 : 1.5}
                    />
                  ))}
                </div>
                <p className="mt-4 font-[family-name:var(--font-serif)] italic text-[15px] md:text-[16px] leading-[1.7] text-[color:var(--charcoal)]/90 line-clamp-6">
                  “{q.body.length > 220 ? `${q.body.slice(0, 217)}…` : q.body}”
                </p>
                <div className="mt-auto pt-5 flex items-center justify-between gap-3 border-t border-[color:var(--charcoal)]/8">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium tracking-[0.01em] text-[color:var(--charcoal)] truncate">
                      {q.reviewer_name ?? "Guest"}
                    </p>
                    {q.reviewer_country && (
                      <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--text-muted)] truncate">
                        {q.reviewer_country}
                      </p>
                    )}
                  </div>
                  <ReviewSourceLink
                    source={q.source}
                    sourceUrl={q.source_url}
                    reviewerName={q.reviewer_name}
                    dim={idx !== activeIndex}
                  />
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop arrow controls */}
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous review"
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-white border border-[color:var(--charcoal)]/12 text-[color:var(--charcoal)] shadow-sm hover:border-[color:var(--gold)] transition-colors"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next review"
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-white border border-[color:var(--charcoal)]/12 text-[color:var(--charcoal)] shadow-sm hover:border-[color:var(--gold)] transition-colors"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>

          {/* Dots */}
          {quotes.length > 1 && (
            <div
              className="mt-5 flex items-center justify-center gap-1.5"
              role="tablist"
              aria-label="Review pagination"
            >
              {quotes.map((_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-5 bg-[color:var(--gold)]"
                      : "w-1.5 bg-[color:var(--charcoal)]/20"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// SourceBadge moved to `@/components/ui/ReviewSourceLink` — shared primitive
// used by both the homepage carousel and per-tour review grid.

export default GuestQuotes;
