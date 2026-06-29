/**
 * /reviews — public reviews aggregator.
 *
 * Groups visible reviews per tour and emits a single first-party-only
 * AggregateRating block (Google policy: schema values must match what is
 * displayed and be first-party). Trust copy is explicit: "Based on
 * verified guest reviews across major booking platforms."
 *
 * Read-only. No external review links — guests stay on site.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import {
  getGlobalReviewStats,
  getTourReviewStats,
  getTourReviews,
  type GlobalStats,
  type PublicReview,
  type TourStats,
} from "@/lib/reviews.functions";
import { VIATOR_META } from "@/data/signatureToursViator";
import { findTour } from "@/data/signatureTours";
import { SITE_URL } from "@/lib/seo";

const SOURCE_LABEL: Record<string, string> = {
  viator: "Viator",
  tripadvisor: "Tripadvisor",
  getyourguide: "GetYourGuide",
  google: "Google",
  first_party: "Verified guest",
};

export const Route = createFileRoute("/reviews")({
  component: ReviewsPage,
  loader: async ({ context }) => {
    // Pull stats server-side so AggregateRating ships in initial HTML.
    const { getGlobalReviewStats: getGlobalSrv } = await import(
      "@/lib/reviews.functions"
    );
    const stats = await getGlobalSrv();
    return { stats };
  },
  head: ({ loaderData }) => {
    const fpCount = loaderData?.stats.first_party_count ?? 0;
    const fpAvg = loaderData?.stats.first_party_avg ?? null;
    const meta = [
      {
        title:
          "Real guest reviews · YES Experiences Portugal",
      },
      {
        name: "description",
        content:
          "Verified guest reviews across Viator, Tripadvisor, GetYourGuide and first-party submissions for our private tours from Lisbon.",
      },
      { name: "robots", content: "index, follow" },
      { rel: "canonical", href: `${SITE_URL}/reviews` },
    ];
    const links = [{ rel: "canonical", href: `${SITE_URL}/reviews` }];
    const scripts =
      fpCount >= 10 && fpAvg
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: "YES Experiences Portugal — Real guest reviews",
                url: `${SITE_URL}/reviews`,
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: fpAvg.toFixed(2),
                  reviewCount: fpCount,
                  bestRating: 5,
                  worstRating: 1,
                },
              }),
            },
          ]
        : [];
    return { meta, links, scripts };
  },
});

const TOUR_IDS = Object.keys(VIATOR_META);

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[color:var(--gold)]"
      aria-label={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          fill={i < Math.round(rating) ? "currentColor" : "none"}
          strokeWidth={i < Math.round(rating) ? 0 : 1.5}
        />
      ))}
    </span>
  );
}

type Bundle = { stats: TourStats; reviews: PublicReview[] };

function ReviewsPage() {
  const { stats: initialStats } = Route.useLoaderData();
  const globalFn = useServerFn(getGlobalReviewStats);
  const statsFn = useServerFn(getTourReviewStats);
  const reviewsFn = useServerFn(getTourReviews);
  const [global, setGlobal] = useState<GlobalStats>(initialStats);
  const [bundles, setBundles] = useState<Record<string, Bundle>>({});

  useEffect(() => {
    let cancelled = false;
    globalFn({}).then((g) => !cancelled && setGlobal(g)).catch(() => undefined);
    (async () => {
      const out: Record<string, Bundle> = {};
      for (const id of TOUR_IDS) {
        try {
          const [s, r] = await Promise.all([
            statsFn({ data: { tourId: id } }),
            reviewsFn({ data: { tourId: id, limit: 6 } }),
          ]);
          if (s.total_reviews > 0 || r.length > 0) {
            out[id] = { stats: s, reviews: r };
          }
        } catch {
          /* skip */
        }
        if (cancelled) return;
        setBundles({ ...out });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [globalFn, statsFn, reviewsFn]);

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-8 py-14">
      <header className="text-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/55">
          Real guest reviews
        </div>
        <h1 className="serif mt-2 text-[2.2rem] md:text-[3rem] leading-tight font-medium text-[color:var(--charcoal)]">
          What guests <span className="italic font-normal text-[color:var(--teal)]">actually</span> say.
        </h1>
        {global.total_reviews >= 25 && (
          <p className="mt-4 text-[1.05rem] text-[color:var(--charcoal)]/80">
            <span className="tabular-nums">
              {global.total_reviews.toLocaleString("en-US")}
            </span>{" "}
            reviews
            {global.average_rating && (
              <>
                {" "}
                · <span className="tabular-nums">{global.average_rating.toFixed(1)}</span>★
              </>
            )}{" "}
            across platforms.
          </p>
        )}
        <p className="mt-3 text-[12.5px] text-[color:var(--charcoal)]/60">
          Based on verified guest reviews across major booking platforms.
        </p>
      </header>

      <section className="mt-14 space-y-14">
        {TOUR_IDS.filter((id) => bundles[id]).map((id) => {
          const b = bundles[id];
          if (!b) return null;
          return (
            <article key={id}>
              <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--charcoal)]/10 pb-3">
                <Link
                  to="/tours/$tourId"
                  params={{ tourId: id }}
                  className="serif text-[1.4rem] md:text-[1.7rem] font-medium text-[color:var(--charcoal)] hover:underline underline-offset-4"
                >
                  {findTour(id)?.title ?? id}
                </Link>
                <div className="text-sm text-[color:var(--charcoal)]/70">
                  {b.stats.average_rating && (
                    <>
                      <span className="tabular-nums">
                        {b.stats.average_rating.toFixed(1)}
                      </span>
                      ★ ·{" "}
                    </>
                  )}
                  <span className="tabular-nums">{b.stats.total_reviews}</span> reviews
                </div>
              </header>

              {b.reviews.length > 0 ? (
                <ul className="mt-5 grid gap-4 md:grid-cols-2 list-none p-0">
                  {b.reviews.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Stars rating={r.rating} />
                        <span className="text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/55">
                          {r.is_first_party
                            ? "Verified guest"
                            : `via ${SOURCE_LABEL[r.source]}`}
                        </span>
                      </div>
                      {r.title && (
                        <p className="mt-3 font-medium text-[color:var(--charcoal)]">
                          {r.title}
                        </p>
                      )}
                      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--charcoal)]/85">
                        {r.body}
                      </p>
                      <p className="mt-3 text-[12px] text-[color:var(--charcoal)]/60">
                        {r.reviewer_name ?? "Guest"}
                        {r.reviewer_country ? ` · ${r.reviewer_country}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[color:var(--charcoal)]/60">
                  Aggregate data above is verified from the platform listing. Curated
                  quotes will appear here as guests submit them.
                </p>
              )}
            </article>
          );
        })}
      </section>

      <footer className="mt-16 text-center">
        <Link
          to="/experiences"
          className="inline-block text-sm underline underline-offset-4"
        >
          Browse all Signature experiences →
        </Link>
      </footer>
    </main>
  );
}
