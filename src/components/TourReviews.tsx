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

const SOURCE_LABEL: Record<string, string> = {
  viator: "Viator",
  tripadvisor: "Tripadvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
  first_party: "Verified guest",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[color:var(--gold)]" aria-label={`${rating} out of 5`}>
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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      statsFn({ data: { tourId } }),
      reviewsFn({ data: { tourId, limit: 8 } }),
    ])
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

  if (loading || !stats || stats.total_reviews === 0) return null;

  return (
    <section className="mt-16 md:mt-20" aria-labelledby="tour-reviews-heading">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/55">
          Real guest reviews
        </div>
        <h2
          id="tour-reviews-heading"
          className="mt-2 text-[1.8rem] md:text-[2.2rem] font-medium text-[color:var(--charcoal)] leading-tight"
        >
          <span className="tabular-nums">{stats.average_rating?.toFixed(1) ?? "—"}</span>
          <span className="text-[color:var(--gold)] mx-2">★</span>
          <span className="font-normal text-[color:var(--charcoal)]/75">
            across <span className="tabular-nums">{stats.total_reviews}</span> reviews
          </span>
        </h2>

        {stats.per_source.length > 0 && (
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[color:var(--charcoal)]/70">
            {stats.per_source.map((s) => (
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
      </div>


      {reviews.length > 0 && (
        <ul className="mt-10 grid gap-5 md:grid-cols-2 list-none p-0">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Stars rating={r.rating} />
                <span className="text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/55">
                  {r.is_first_party ? "Verified guest" : `via ${SOURCE_LABEL[r.source]}`}
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
