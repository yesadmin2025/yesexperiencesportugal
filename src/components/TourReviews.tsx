/**
 * TourReviews — per-tour real review block.
 *
 * Shows: aggregate rating across all sources, per-platform count + link
 * to original, and a list of real reviews (first-party + admin-curated
 * third-party). Third-party reviews link to their source. Schema emission
 * is the consumer's job — and ONLY for first-party rows (Google policy).
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import {
  getTourReviewStats,
  getTourReviews,
  type PublicReview,
  type TourStats,
} from "@/lib/reviews.functions";
import { getViatorMeta } from "@/data/signatureToursViator";
import { filterVisibleReviews } from "@/lib/tour-reviews-filter";

const SOURCE_LABEL: Record<string, string> = {
  viator: "Viator",
  tripadvisor: "Tripadvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
  first_party: "Verified guest",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[color:var(--gold)]"
      aria-label={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          fill={i < Math.round(rating) ? "currentColor" : "none"}
          strokeWidth={i < Math.round(rating) ? 0 : 1.5}
        />
      ))}
    </span>
  );
}

export function TourReviews({ tourId }: { tourId: string }) {
  const statsFn = useServerFn(getTourReviewStats);
  const reviewsFn = useServerFn(getTourReviews);
  const [stats, setStats] = useState<TourStats | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recent" | "highest">("recent");


  useEffect(() => {
    let cancelled = false;
    Promise.all([statsFn({ data: { tourId } }), reviewsFn({ data: { tourId, limit: 8 } })])
      .then(([s, r]) => {
        if (cancelled) return;
        setStats(s);
        setReviews(r);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tourId, statsFn, reviewsFn]);

  // Fallback: when the DB has no reviews yet, surface the curated
  // Viator/Tripadvisor reviews from VIATOR_META so every Signature
  // page still shows real guest voices (source-linked, non-first-party).
  const meta = getViatorMeta(tourId);
  const dbEmpty = !loading && (!stats || stats.total_reviews === 0);
  const useFallback = dbEmpty && meta && meta.topReviews.length > 0;

  if (loading) return null;
  if (!useFallback && (!stats || stats.total_reviews === 0)) return null;

  const displayRating = useFallback ? meta!.rating : (stats?.average_rating ?? 5);
  const displayTotal = useFallback ? meta!.reviewCount : (stats?.total_reviews ?? 0);
  const perSource = useFallback ? [] : (stats?.per_source ?? []);
  const displayReviews: Array<{
    id: string;
    rating: number;
    title?: string | null;
    body: string;
    reviewer_name: string | null;
    reviewer_country: string | null;
    source: string;
    is_first_party: boolean;
    source_url?: string | null;
  }> = useFallback
    ? meta!.topReviews.slice(0, 6).map((r, i) => ({
        id: `viator-${i}`,
        rating: 5,
        title: r.title,
        body: r.text,
        reviewer_name: r.author,
        reviewer_country: null,
        source: (r.source ?? "Viator").toLowerCase(),
        is_first_party: false,
        source_url: meta!.viatorUrl,
      }))
    : filterVisibleReviews(reviews).map((r) => ({ ...r, source_url: null }));

  const sortedReviews = [...displayReviews].sort((a, b) => {
    if (sortBy === "highest" && b.rating !== a.rating) return b.rating - a.rating;
    const aDate = Date.parse((a as { published_at?: string }).published_at ?? "") || 0;
    const bDate = Date.parse((b as { published_at?: string }).published_at ?? "") || 0;
    return bDate - aDate;
  });





  return (
    <section className="mt-16 md:mt-20" aria-labelledby="tour-reviews-heading">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
          Real guest reviews
        </div>
        <h2
          id="tour-reviews-heading"
          className="mt-2 text-[1.8rem] md:text-[2.2rem] font-medium text-[color:var(--charcoal)] leading-tight"
        >
          <span className="tabular-nums">{displayRating.toFixed(1)}</span>
          <span className="text-[color:var(--gold)] mx-2">★</span>
          <span className="font-normal text-[color:var(--charcoal)]/75">
            across <span className="tabular-nums">{displayTotal}</span> reviews
          </span>
        </h2>

        {perSource.length > 0 && (
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[color:var(--charcoal)]/70">
            {perSource.map((s) => (
              <li key={s.source}>
                {s.source_url ? (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="underline-offset-2 hover:underline"
                  >
                    {SOURCE_LABEL[s.source]} {s.rating.toFixed(1)}★ · {s.review_count}
                  </a>
                ) : (
                  <span>
                    {SOURCE_LABEL[s.source]} {s.rating.toFixed(1)}★ · {s.review_count}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {useFallback && meta && (
          <p className="mt-4 text-[12px] text-[color:var(--charcoal)]/70">
            <a
              href={meta.viatorUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline-offset-2 hover:underline"
            >
              Read all reviews on Viator &amp; Tripadvisor →
            </a>
          </p>
        )}
      </div>

      {displayReviews.length > 0 && (
        <ul className="mt-10 grid gap-5 md:grid-cols-2 list-none p-0">
          {displayReviews.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Stars rating={r.rating} />
                <span className="text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  {r.is_first_party
                    ? "Verified guest"
                    : `via ${SOURCE_LABEL[r.source] ?? r.source}`}
                </span>
              </div>
              {r.title && (
                <p className="mt-3 font-medium text-[color:var(--charcoal)]">{r.title}</p>
              )}
              <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--charcoal)]/85">
                {r.body}
              </p>
              <p className="mt-3 text-[12px] text-[color:var(--charcoal)]/60">
                {r.reviewer_name ?? "Guest"}
                {r.reviewer_country ? ` · ${r.reviewer_country}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-center text-[12px] text-[color:var(--charcoal)]/60">
        Based on verified guest reviews across major booking platforms.
      </p>
    </section>
  );
}

export default TourReviews;
