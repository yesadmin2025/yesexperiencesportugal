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
import { canonicalViatorUrl } from "@/data/signatureToursSourceOfTruth";
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
      className="inline-flex items-center gap-0.5 text-[color:var(--teal)]"
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

export type InitialFirstParty = {
  count: number;
  average: number | null;
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    body: string;
    reviewer_name: string | null;
    reviewer_country: string | null;
    published_at: string;
  }[];
} | null;

export function TourReviews({
  tourId,
  initialFirstParty = null,
}: {
  tourId: string;
  /**
   * Server-rendered first-party rows — the exact rows used in the page's
   * Product review structured data, so schema and visible content match.
   */
  initialFirstParty?: InitialFirstParty;
}) {
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

  // Server-rendered first-party rows: the exact reviews used in this page's
  // Product review structured data, so the schema is always matched by
  // visible, crawlable content in the initial HTML.
  const ssrFirstParty = filterVisibleReviews(initialFirstParty?.reviews ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    reviewer_name: r.reviewer_name,
    reviewer_country: r.reviewer_country,
    published_at: r.published_at,
    source: "first_party",
    is_first_party: true,
    source_url: null as string | null,
  }));

  // Fallback: when the DB has no reviews at all, surface the curated
  // Viator/Tripadvisor reviews from VIATOR_META so every Signature page still
  // shows real guest voices (source-linked, attributed, non-first-party).
  // These external reviews are visible social proof only — they never feed the
  // page's review structured data.
  const meta = getViatorMeta(tourId);
  const clientReviews = filterVisibleReviews(reviews);
  const hasDbReviews = (!!stats && stats.total_reviews > 0) || ssrFirstParty.length > 0;
  const canFallback = !!meta && meta.topReviews.length > 0;
  const useFallback = !hasDbReviews && canFallback;

  if (!hasDbReviews && !canFallback) return null;

  const fpAverage =
    initialFirstParty && initialFirstParty.count > 0 && initialFirstParty.average != null
      ? initialFirstParty.average
      : null;
  const displayRating = useFallback
    ? meta!.rating
    : (stats?.average_rating ?? fpAverage ?? 5);
  const displayTotal = useFallback
    ? meta!.reviewCount
    : (stats?.total_reviews ?? initialFirstParty?.count ?? 0);
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
        source_url: canonicalViatorUrl(tourId) ?? meta!.viatorUrl,
      }))
    : [
        // Schema-backed first-party rows always stay visible, then any other
        // stored quotes the DB returns after hydration.
        ...ssrFirstParty,
        ...clientReviews
          .filter((r) => !ssrFirstParty.some((f) => f.id === r.id))
          .map((r) => ({ ...r, source_url: null })),
      ];


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
          {useFallback
            ? `Verified platform reviews · ${displayTotal}`
            : `Reviews collected directly by YES · ${initialFirstParty?.count ?? displayTotal}`}
        </div>
        <h2
          id="tour-reviews-heading"
          className="mt-2 text-[1.8rem] md:text-[2.2rem] font-medium text-[color:var(--charcoal)] leading-tight"
        >
          <span className="tabular-nums">{displayRating.toFixed(1)}</span>
          <span className="text-[color:var(--teal)] mx-2">★</span>
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
              href={canonicalViatorUrl(tourId) ?? meta.viatorUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline-offset-2 hover:underline"
            >
              Read all reviews on Viator &amp; Tripadvisor →
            </a>
          </p>
        )}

        <p className="mt-4 text-[12px] text-[color:var(--charcoal)]/70">
          <a href="#leave-a-review" className="underline-offset-2 hover:underline">
            Travelled with us? Write a review →
          </a>
        </p>
      </div>

      {displayReviews.length > 1 && (
        <div
          className="mt-8 flex items-center justify-center gap-2"
          role="group"
          aria-label="Sort reviews"
        >
          <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)] mr-1">
            Sort
          </span>
          {(
            [
              { id: "recent", label: "Most recent" },
              { id: "highest", label: "Highest rated" },
            ] as const
          ).map((opt) => {
            const active = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                aria-pressed={active}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-[12.5px] transition-colors ${
                  active
                    ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-white"
                    : "border-[color:var(--charcoal)]/15 text-[color:var(--charcoal)]/75 hover:border-[color:var(--charcoal)]/35"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {sortedReviews.length > 0 && (
        <ul className="mt-6 grid gap-5 md:grid-cols-2 list-none p-0">
          {sortedReviews.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Stars rating={r.rating} />
                <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
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
        {useFallback
          ? "Based on verified guest reviews across major booking platforms."
          : "Collected directly by YES Experiences Portugal."}
      </p>
    </section>
  );
}

export default TourReviews;
