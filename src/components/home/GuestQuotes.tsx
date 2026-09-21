/**
 * GuestQuotes — homepage social proof block.
 *
 * 1. Trust headline reads from the public review certificate so visible
 *    rating/count never drift from the verified badge.
 * 2. Up to 6 curated 5★ quotes from `tour_reviews` (admin-marked
 *    is_featured). When none exist, the quote row is hidden.
 * 3. Trust line: "Based on verified guest reviews across major booking
 *    platforms." — visible, non-decorative.
 */
import { useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  getCuratedHomepageReviews,
  type PublicReview,
} from "@/lib/reviews.functions";
import { REVIEW_CERTIFICATE, REVIEW_COUNT_DISPLAY } from "@/config/trust-certificate";
import { ReviewSourceLink } from "@/components/ui/ReviewSourceLink";

export function GuestQuotes() {
  const quotesFn = useServerFn(getCuratedHomepageReviews);
  const [quotes, setQuotes] = useState<PublicReview[]>([]);
  const [quotesSettled, setQuotesSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    quotesFn({ data: { limit: 8 } })
      .then((q) => {
        if (cancelled) return;
        setQuotes(q);
        setQuotesSettled(true);
      })
      .catch(() => {
        if (!cancelled) setQuotesSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [quotesFn]);


  return (
    <div className="text-center">
      <div
        className="inline-flex items-center gap-1 mb-3 text-[color:var(--gold)]"
        aria-hidden="true"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
        ))}
      </div>

      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
        {REVIEW_CERTIFICATE.ratingValue}/5 · {REVIEW_COUNT_DISPLAY} guest reviews
      </p>
      <h2 className="editorial-title-safe mt-1.5 font-serif text-[1.25rem] font-medium leading-[1.2] text-[color:var(--charcoal)] md:text-[1.5rem]">
        Real guests. <em className="font-normal text-[color:var(--teal)]">Real Portugal.</em>
      </h2>

      {/* Platform badge row removed — each review card now carries its
          own source label ("via Tripadvisor" etc.), so the standalone
          badge strip was redundant. */}

      <ReviewCarousel quotes={quotes} settled={quotesSettled} />
    </div>
  );
}

/**
 * Premium editorial carousel — horizontal snap on every breakpoint (mobile:
 * one card, tablet: ~2, desktop: ~3), edge fade masks, dot navigation, and
 * arrow controls on ≥md. Uses native scroll-snap for buttery inertia.
 * Reserves min-height BEFORE data arrives so there is no CLS.
 */
function ReviewCarousel({
  quotes,
  settled,
}: {
  quotes: PublicReview[];
  settled: boolean;
}) {
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
    <div
      className={`relative -mx-5 sm:mx-0 ${
        quotes.length > 0 || !settled
          ? "mt-4 min-h-[10.75rem] sm:min-h-[11.5rem] md:mt-5"
          : "mt-0 min-h-0"
      }`}
    >
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
                className="he-card-lift shrink-0 snap-start w-[82vw] sm:w-[46%] lg:w-[31.5%] flex flex-col min-h-[10.75rem] sm:min-h-[11.5rem] rounded-[6px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-5 md:p-6 relative shadow-[var(--shadow-card)]"
              >
                <Quote
                  aria-hidden="true"
                  size={32}
                  className="absolute -top-2 right-4 text-[color:var(--gold)]/15 rotate-180"
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
                {/* No line clamp: the excerpt already ends naturally with an
                    ellipsis, so clamping only cut a visible line mid-word. */}
                <p className="mt-2.5 font-serif italic text-[13.5px] md:text-[14px] leading-[1.62] text-[color:var(--charcoal)]/88">
                  “{q.body.length > 200 ? `${q.body.slice(0, 197).trimEnd()}…` : q.body}”
                </p>
                <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-[color:var(--charcoal)]/8">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium tracking-[0.01em] text-[color:var(--charcoal)] truncate">
                      {q.reviewer_name ?? "Guest"}
                    </p>
                    {q.reviewer_country && (
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)] truncate">
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
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-[color:var(--ivory)] border border-[color:var(--charcoal)]/12 text-[color:var(--charcoal)] shadow-sm hover:border-[color:var(--gold)] transition-colors"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next review"
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-[color:var(--ivory)] border border-[color:var(--charcoal)]/12 text-[color:var(--charcoal)] shadow-sm hover:border-[color:var(--gold)] transition-colors"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>

          {/* Dots */}
          {quotes.length > 1 && (
            <div
              className="mt-4 flex items-center justify-center gap-1.5"
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
