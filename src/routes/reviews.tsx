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
import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Scene } from "@/components/motion/Scene";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
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
import { filterVisibleReviews } from "@/lib/tour-reviews-filter";

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
    const { getGlobalReviewStats: getGlobalSrv } = await import("@/lib/reviews.functions");
    const stats = await getGlobalSrv();
    return { stats };
  },
  head: ({ loaderData }) => {
    const fpCount = loaderData?.stats.first_party_count ?? 0;
    const fpAvg = loaderData?.stats.first_party_avg ?? null;
    const meta = [
      {
        title: "Guest Reviews — Private Portugal Tours by YES",
      },
      {
        name: "description",
        content:
          "Verified guest reviews across Viator, Tripadvisor, GetYourGuide and first-party submissions for our private tours from Lisbon.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Guest Reviews — Private Portugal Tours by YES" },
      {
        property: "og:description",
        content:
          "Verified guest reviews across Viator, Tripadvisor, GetYourGuide and first-party submissions.",
      },
      { property: "og:url", content: `${SITE_URL}/reviews` },
      { property: "og:type", content: "website" },
    ];
    const links = [
      { rel: "canonical", href: `${SITE_URL}/reviews` },
      // Reciprocal hreflang with /pt/reviews.
      ...localeAlternateLinks("/reviews"),
    ];

    const scripts: Array<{ type: string; children: string }> = [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${SITE_URL}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Reviews",
              item: `${SITE_URL}/reviews`,
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${SITE_URL}/reviews#collection`,
          name: "YES Experiences Portugal — Real guest reviews",
          description:
            "Verified guest reviews across Viator, Tripadvisor, GetYourGuide and first-party submissions for our private tours from Lisbon.",
          url: `${SITE_URL}/reviews`,
          inLanguage: "en",
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: { "@id": `${SITE_URL}/#organization` },
          ...(fpCount >= 10 && fpAvg
            ? {
                mainEntity: {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: Number(fpAvg.toFixed(2)),
                    reviewCount: fpCount,
                    bestRating: 5,
                    worstRating: 1,
                  },
                },
              }
            : {}),
        }),
      },
    ];

    return { meta, links, scripts };
  },
});

const TOUR_IDS = Object.keys(VIATOR_META);

function Stars({ rating }: { rating: number }) {
  return (
    <span
      role="img"
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
  useMarketingMotion();
  const { stats: initialStats } = Route.useLoaderData();
  const globalFn = useServerFn(getGlobalReviewStats);
  const statsFn = useServerFn(getTourReviewStats);
  const reviewsFn = useServerFn(getTourReviews);
  const [global, setGlobal] = useState<GlobalStats>(initialStats);
  const [bundles, setBundles] = useState<Record<string, Bundle>>({});

  useEffect(() => {
    let cancelled = false;
    globalFn({})
      .then((g) => !cancelled && setGlobal(g))
      .catch(() => undefined);
    (async () => {
      const out: Record<string, Bundle> = {};
      for (const id of TOUR_IDS) {
        try {
          const [s, r] = await Promise.all([
            statsFn({ data: { tourId: id } }),
            reviewsFn({ data: { tourId: id, limit: 6 } }),
          ]);
          const visible = filterVisibleReviews(r);
          if (s.total_reviews > 0 || visible.length > 0) {
            out[id] = { stats: s, reviews: visible };
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
    <SiteLayout>
      <article>
        <header className="reveal pt-32 md:pt-40 pb-12 md:pb-16 bg-[color:var(--sand)]">
          <div className="container-x max-w-3xl text-center">
            <Scene>
              <div className="scene-atmosphere">
                <Eyebrow flank>Real guest reviews</Eyebrow>
              </div>
              <div className="scene-title">
                <SectionTitle as="h1" size="anchor" spacing="loose">
                  What guests <SectionTitle.Em>actually</SectionTitle.Em> say.
                </SectionTitle>
              </div>
              {global.total_reviews >= 25 && (
                <p className="scene-body mt-6 font-serif italic text-[1.1rem] md:text-[1.25rem] leading-[1.55] text-[color:var(--charcoal-soft)]">
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
              <p className="scene-body mt-4 font-sans text-[12.5px] text-[color:var(--charcoal-soft)]">
                Based on verified guest reviews across major booking platforms.
              </p>
            </Scene>
          </div>
        </header>

        <section className="reveal py-20 md:py-28 bg-[color:var(--ivory)]">
          <div className="container-x max-w-5xl">
            <div className="space-y-16 md:space-y-20">
              {TOUR_IDS.filter((id) => bundles[id]).map((id) => {
                const b = bundles[id];
                if (!b) return null;
                return (
                  <article key={id}>
                    <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--gold-soft)]/40 pb-4">
                      <Link
                        to="/tours/$tourId"
                        params={{ tourId: id }}
                        className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors"
                      >
                        {findTour(id)?.title ?? id}
                      </Link>
                      <div className="font-sans text-[13px] text-[color:var(--charcoal-soft)]">
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
                      <ul className="mt-6 grid gap-5 md:grid-cols-2 list-none p-0">
                        {b.reviews.map((r) => (
                          <li
                            key={r.id}
                            className="rounded-[2px] border border-[color:var(--gold-soft)]/40 bg-[color:var(--ivory)] p-6"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <Stars rating={r.rating} />
                              <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                                {r.is_first_party
                                  ? "Verified guest"
                                  : `via ${SOURCE_LABEL[r.source]}`}
                              </span>
                            </div>
                            {r.title && (
                              <p className="mt-3 font-display font-semibold text-[15px] text-[color:var(--charcoal)]">
                                {r.title}
                              </p>
                            )}
                            <p className="mt-2 text-[14px] text-[color:var(--charcoal)] leading-[1.75]">
                              {r.body}
                            </p>
                            <p className="mt-3 font-sans text-[12px] text-[color:var(--charcoal-soft)]">
                              {r.reviewer_name ?? "Guest"}
                              {r.reviewer_country ? ` · ${r.reviewer_country}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-5 font-sans text-[13px] text-[color:var(--charcoal-soft)]">
                        Aggregate data above is verified from the platform listing. Curated quotes
                        will appear here as guests submit them.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            <aside className="mt-20 pt-12 border-t border-[color:var(--gold-soft)]/40 text-center">
              <CtaButton to="/experiences" variant="primary">
                Browse all Signature experiences
              </CtaButton>
            </aside>
          </div>
        </section>
      </article>
    </SiteLayout>
  );
}
