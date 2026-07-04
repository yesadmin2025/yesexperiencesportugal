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
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PlatformBadge, type Platform } from "@/components/PlatformBadge";
import {
  getGlobalReviewStats,
  getCuratedHomepageReviews,
  type GlobalStats,
  type PublicReview,
} from "@/lib/reviews.functions";

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

  return (
    <div className="mt-10 md:mt-14 text-center">
      <div className="inline-flex items-center gap-1.5 text-[color:var(--gold)]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
        ))}
      </div>

      <p className="serif mt-3 text-[1.85rem] md:text-[2.4rem] leading-[1.15] text-[color:var(--charcoal)] font-medium">
        {count ? (
          <>
            <span className="tabular-nums">{count.toLocaleString("en-US")}</span>
            <span className="ml-2">reviews</span>
            {avg && (
              <span className="ml-2 text-[color:var(--charcoal)]/75">· {avg.toFixed(1)}★</span>
            )}
            <span className="italic font-normal text-[color:var(--teal)]"> across platforms.</span>
          </>
        ) : (
          <>
            <span className="tabular-nums">700+</span>
            <span className="ml-2">five-star reviews</span>
            <span className="italic font-normal text-[color:var(--teal)]"> across platforms.</span>
          </>
        )}
      </p>

      <p className="mt-3 text-[12.5px] text-[color:var(--charcoal)]/65">
        Based on verified guest reviews across major booking platforms.
      </p>

      <ul
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-5 h-6 md:h-7 list-none p-0"
        aria-label="Featured on Tripadvisor, Viator, Google, GetYourGuide and Trustpilot"
      >
        {PLATFORMS.map((p) => (
          <li key={p} className="h-full flex items-center">
            <PlatformBadge platform={p} />
          </li>
        ))}
      </ul>

      {quotes.length > 0 && (
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-left list-none p-0">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="reveal-stagger he-card-lift rounded-lg border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-5"
            >
              <div className="inline-flex items-center gap-0.5 text-[color:var(--gold)]" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    fill={i < Math.round(q.rating) ? "currentColor" : "none"}
                    strokeWidth={i < Math.round(q.rating) ? 0 : 1.5}
                  />
                ))}
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--charcoal)]/85">
                “{q.body.length > 220 ? `${q.body.slice(0, 217)}…` : q.body}”
              </p>
              <p className="mt-3 text-[12px] text-[color:var(--charcoal)]/60">
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
  );
}

export default GuestQuotes;
