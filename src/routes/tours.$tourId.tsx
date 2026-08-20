import {
  createFileRoute,
  Link,
  Outlet,
  notFound,
  redirect,
  useRouterState,
} from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { Clock, MapPin, ArrowLeft, Check, Sparkles, Info, Heart, Shield, Star } from "lucide-react";
import {
  signatureTours,
  findTour,
  isValidTourId,
  type SignatureTour,
  type TourStop,
} from "@/data/signatureTours";
import { getViatorMeta, type ViatorMeta } from "@/data/signatureToursViator";
import { toEditorialChapters } from "@/lib/tailor-chapters";
import {
  bookableIncluded,
  bookableStops,
  validateTour,
  logTourValidation,
} from "@/lib/viatorValidation";
import { useEffect, lazy, Suspense } from "react";
import { SimpleBookingForm } from "@/components/SimpleBookingForm";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { Scene } from "@/components/motion/Scene";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";

import { CtaPair } from "@/components/ui/CtaPair";
import { breadcrumbLd, tourProductLd, faqPageLd, jsonLdScript } from "@/lib/jsonld";
import { withAggregateAndReviews } from "@/lib/aggregate-review-schema";
import { getFaqForTour } from "@/content/seo-faq";
import { getTourGallery, getHeroAlt } from "@/lib/tour-gallery";
import { getTourContent, signatureDurationLabel } from "@/lib/tourContent";
import { sotItinerary } from "@/data/signatureToursSourceOfTruth";
import { TourReviews } from "@/components/TourReviews";
import { RecognisedByGuides } from "@/components/RecognisedByGuides";
import { CredentialStrip } from "@/components/ui/CredentialStrip";
import { TourImage } from "@/components/tours/TourImage";
import { TourFaq } from "@/components/tours/TourFaq";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";
import { useAdminTourPhotos } from "@/lib/useAdminTourPhotos";
// Lazy-loaded below the fold — keeps Leaflet (~140KB) out of the initial tour bundle
import { SignatureRouteMapShell } from "@/components/SignatureRouteMapShell";

const SignatureRouteMap = lazy(() =>
  import("@/components/SignatureRouteMap").then((m) => ({ default: m.SignatureRouteMap })),
);
import { CANCELLATION } from "@/config/business-nap";
import { resolveLegacyTourId } from "@/lib/legacy-tour-redirects";

export const Route = createFileRoute("/tours/$tourId")({
  beforeLoad: ({ params }) => {
    const current = resolveLegacyTourId(params.tourId);
    if (current) {
      throw redirect({
        to: "/tours/$tourId",
        params: { tourId: current },
        statusCode: 301,
        replace: true,
      });
    }
  },
  loader: ({ params }) => {
    const tour = findTour(params.tourId);
    if (!tour) throw notFound();
    return { tour };
  },

  head: ({ params, loaderData }) => {
    const url = `https://yesexperiencesportugal.com/tours/${params.tourId}`;
    // loaderData is undefined during SSR head evaluation in some cases —
    // resolve the tour directly from params to guarantee JSON-LD is emitted.
    const t = loaderData?.tour ?? findTour(params.tourId);
    if (!t)
      return {
        meta: [
          { title: "Signature not found — YES experiences Portugal" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    const img = t.img?.startsWith("http") ? t.img : `https://yesexperiencesportugal.com${t.img}`;
    // LCP preload — the hero <img> on this route uses the same resolution
    // chain (localGallery → viator gallery → t.img). We preload t.img
    // as the safe cross-render candidate; the actual hero will hit warm
    // cache when it renders (or fall back cleanly if the resolver picks
    // a different source). Absolute URL keeps SSR + CDN happy.
    const lcpHref = t.img?.startsWith("http") ? t.img : t.img;

    // Keep <title> under 60 chars for SERP truncation. When the tour supplies
    // an explicit `seoTitle` (Phase 2 SEO focus tours) use it verbatim.
    // Otherwise auto-build: full brand suffix → short suffix → raw → truncated.
    const SUFFIX_FULL = " — YES experiences Portugal";
    const SUFFIX_SHORT = " | YES Portugal";
    const pageTitle =
      t.seoTitle ??
      (t.title.length + SUFFIX_FULL.length <= 60
        ? `${t.title}${SUFFIX_FULL}`
        : t.title.length + SUFFIX_SHORT.length <= 60
          ? `${t.title}${SUFFIX_SHORT}`
          : t.title.length <= 60
            ? t.title
            : `${t.title.slice(0, 57)}…`);
    const pageDescription = t.seoDescription ?? t.blurb;

    return {
      meta: [
        { title: pageTitle },
        { name: "description", content: pageDescription },
        { property: "og:title", content: pageTitle },
        { property: "og:description", content: pageDescription },

        { property: "og:image", content: img },
        { name: "twitter:image", content: img },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
      ],

      links: [
        { rel: "canonical", href: url },
        { rel: "preload", as: "image", href: lcpHref, fetchPriority: "high" },
      ],
      scripts: [
        jsonLdScript(
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Signature Experiences", path: "/experiences" },
            { name: t.title, path: `/tours/${params.tourId}` },
          ]),
        ),
        jsonLdScript(
          withAggregateAndReviews(
            (() => {
              // Prefer the SoT itinerary (verified against Viator) for JSON-LD.
              // Falls back to legacy tour.stops when SoT is not populated for a tour.
              const content = getTourContent(params.tourId);
              const sotStops = content.itinerary
                .filter((c) => !c.optional)
                .map((c) => ({ label: c.label, story: c.description }));
              const stops =
                sotStops.length > 0
                  ? sotStops
                  : (t.stops ?? []).map((s) => ({ label: s.label, story: s.story }));
              return tourProductLd({
                id: params.tourId,
                title: t.title,
                blurb: t.blurb,
                img: t.img,
                priceFrom: (t as { priceFrom?: number }).priceFrom,
                currency: "EUR",
                rating: getViatorMeta(params.tourId)?.rating ?? null,
                reviewCount: getViatorMeta(params.tourId)?.reviewCount ?? null,
                region: (t as { region?: string }).region ?? null,
                durationHours: signatureDurationLabel(
                  t.id,
                  (t as { durationHours?: string }).durationHours ?? null,
                ),
                stops,
              });
            })(),
            params.tourId,
          ),
        ),
        jsonLdScript(faqPageLd(getFaqForTour(params.tourId))),
      ],
    };
  },

  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-xl text-center">
          <h1 className="serif text-4xl" data-mixed-emphasis="exempt">
            Experience not found
          </h1>
          <p className="mt-4 text-[color:var(--charcoal-soft)]">
            That Signature Experience doesn't exist anymore.
          </p>
          <Link
            to="/experiences"
            className="mt-8 inline-flex items-center gap-2 border border-[color:var(--border)] hover:border-[color:var(--gold)] px-5 py-3 text-sm"
          >
            <ArrowLeft size={14} /> Back to all experiences
          </Link>
        </div>
      </section>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-xl text-center">
          <h1 className="serif text-3xl" data-mixed-emphasis="exempt">
            Something went sideways
          </h1>
          <p className="mt-3 text-[color:var(--charcoal-soft)] text-sm">{error.message}</p>
          <Link
            to="/experiences"
            className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[color:var(--teal)]"
          >
            <ArrowLeft size={12} /> Back to experiences
          </Link>
        </div>
      </section>
    </SiteLayout>
  ),
  component: TourDetailPage,
});

function TourDetailPage() {
  useMarketingMotion();
  const { tour } = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { resolveImg } = useImportedTourImages();
  const meta = getViatorMeta(tour.id);
  const adminPhotos = useAdminTourPhotos(tour.id, {
    defaultAlt: `${tour.title} — ${tour.region}`,
  });
  const validation = validateTour(tour, meta);
  useEffect(() => {
    logTourValidation(validation);
  }, [validation]);
  useEffect(() => {
    // GA4 view_item — fired once per tour page.
    void import("@/lib/analytics-ga4").then((m) => m.gaViewItem({ tour }));
  }, [tour.id]);

  if (pathname.replace(/\/$/, "").endsWith(`/tours/${tour.id}/tailor`)) {
    return <Outlet />;
  }

  return (
    <SiteLayout>
      {/* ── 1 · HERO ─────────────────────────────────────────────── */}
      <TourHero tour={tour} resolveImg={resolveImg} meta={meta} adminPhotos={adminPhotos} />

      {/* ── 2 · TRUST MICROCOPY ─────────────────────────────────── */}
      <TrustStrip meta={meta} />

      {/* ── 3 · SHORT INTRO ─────────────────────────────────────── */}
      <IntroBlock tour={tour} />

      {/* ── 4 · HIGHLIGHTS ─────────────────────────────────────── */}
      <HighlightsBlock tour={tour} />

      {/* ── 5 · ITINERARY (real Viator stops only) ────────────── */}
      <ItineraryTimeline tour={tour} meta={meta} />

      {/* ── 6 · MAP — real geographic map with driving route (lazy) ─ */}
      <Suspense fallback={<SignatureRouteMapShell />}>
        <SignatureRouteMap tour={tour} />
      </Suspense>

      {/* ── 7 · WHAT'S INCLUDED ────────────────────────────────── */}
      <IncludedAndIdeal tour={tour} meta={meta} />

      {/* ── 9 · GALLERY (real photos) ──────────────────────────── */}
      <GalleryStrip tour={tour} resolveImg={resolveImg} meta={meta} adminPhotos={adminPhotos} />

      {/* ── 10 · RESERVE THIS DAY (simple booking) ─────────────── */}
      <BookingBlock tour={tour} />

      {/* ── 11 · REVIEWS ───────────────────────────────────────── */}
      <section className="container-x py-6">
        <TourReviews tourId={tour.id} />
      </section>

      {/* ── 11b · FAQ (matches FAQPage JSON-LD in <head>) ──────── */}
      <TourFaq tourId={tour.id} />

      {/* Editorial mentions — shown ONLY on Arrábida-region signatures
          (the dataset's `arrabida-tour` placement) so other tours don't
          get the same trust strip when no real article exists for them. */}
      {(tour.id === "arrabida-wine-allinclusive" ||
        tour.id === "arrabida-boat" ||
        tour.id === "azeitao-cheese") && <RecognisedByGuides placement="arrabida-tour" compact />}

      {/* ── 12 · FINAL CTA ─────────────────────────────────────── */}
      <FinalCta tour={tour} />

      <RelatedTours currentId={tour.id} />
    </SiteLayout>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 1 · HERO
 * ════════════════════════════════════════════════════════════ */
function TourHero({
  tour,
  resolveImg,
  meta,
  adminPhotos,
}: {
  tour: SignatureTour;
  resolveImg: ReturnType<typeof useImportedTourImages>["resolveImg"];
  meta: ViatorMeta | undefined;
  adminPhotos: ReturnType<typeof useAdminTourPhotos>;
}) {
  const heroResolved = resolveImg(tour, "hero");
  // Prefer admin-uploaded photos (cover first), then locally-baked YES photos,
  // then Viator gallery cover, then the imported tour image.
  const adminCover = adminPhotos[0];
  const heroSrc =
    adminCover?.src ?? meta?.localGallery?.[0]?.src ?? meta?.gallery?.[0] ?? heroResolved.src;
  const heroSrcSet = adminCover?.srcSet ?? heroResolved.srcSet;
  const heroAlt = adminCover?.alt || getHeroAlt(tour, meta);
  return (
    <>
      {/* Breadcrumb */}
      <section className="pt-24 pb-3">
        <div className="container-x max-w-6xl">
          <Link
            to="/experiences"
            className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <ArrowLeft size={12} /> All Signature Experiences
          </Link>
        </div>
      </section>

      <section className="pb-8">
        <div className="container-x max-w-6xl">
          {/* Cinematic hero — unified 3:2 frame, blur-up on load. */}
          <ParallaxLayer amount="md">
            <TourImage
              src={heroSrc}
              srcSet={heroSrcSet}
              alt={heroAlt}
              ratio="3/2"
              priority
              focal={tour.focal ?? "50% 50%"}
              sizes="(min-width: 1024px) 1152px, 100vw"
              className="shadow-[0_30px_60px_-30px_rgba(46,46,46,0.4)]"
              imgClassName="motion-safe:animate-[heroZoom_28s_ease-out_infinite_alternate]"
            />
          </ParallaxLayer>

          {/* Editorial header — title, blurb and meta sit BELOW the hero
              so the cinematic image reads as a single quiet frame. */}
          <div className="mt-6 sm:mt-8">
            <Eyebrow>Signature Experience</Eyebrow>
            <h1 className="serif mt-3 text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl leading-[1.08] sm:leading-[1.02] tracking-[-0.015em] max-w-3xl text-[color:var(--charcoal)]">
              {tour.title}
            </h1>
            <p className="serif italic font-normal mt-4 text-[15px] sm:text-lg md:text-xl text-[color:var(--charcoal-soft)] max-w-2xl leading-snug">
              {tour.blurb}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
              <span className="flex items-center gap-2">
                <MapPin size={12} className="text-[color:var(--gold)]" /> {tour.region}
              </span>
              <span aria-hidden className="h-3 w-px bg-[color:var(--border)]" />
              <span className="flex items-center gap-2">
                <Clock size={12} className="text-[color:var(--gold)]" />{" "}
                {signatureDurationLabel(tour.id, tour.durationHours)}
              </span>
              {meta && meta.reviewCount > 0 && (
                <>
                  <span aria-hidden className="h-3 w-px bg-[color:var(--border)]" />
                  <span className="flex items-center gap-1.5 normal-case tracking-normal text-[12px] text-[color:var(--charcoal)]">
                    <Star
                      size={11}
                      fill="currentColor"
                      strokeWidth={0}
                      className="text-[color:var(--gold)]"
                    />
                    <span className="font-semibold">{meta.rating.toFixed(1)}</span>
                    <span className="text-[color:var(--charcoal-soft)]">
                      · {meta.reviewCount} reviews
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-start gap-4">
            {typeof (tour as { priceFrom?: number }).priceFrom === "number" ? (
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                  From
                </span>
                <span className="serif text-[24px] sm:text-[28px] leading-none font-semibold text-[color:var(--charcoal)]">
                  <PriceEur amountEur={(tour as { priceFrom: number }).priceFrom} role="from" />
                </span>
                <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                  per person
                </span>
                <PriceCurrencyChip align="start" />
              </div>
            ) : null}
            <CtaButton
              href="#book"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              data-analytics="signature_reserve_click"
              data-analytics-placement="hero"
              data-analytics-experience-id={tour.id}
              data-analytics-experience-type="signature"
            >
              Check availability &amp; reserve
            </CtaButton>
            <CtaButton
              to="/tours/$tourId/tailor"
              params={{ tourId: tour.id }}
              variant="hairline"
              data-analytics="signature_tailor_click"
              data-analytics-placement="hero"
              data-analytics-experience-id={tour.id}
              data-analytics-experience-type="signature"
            >
              Tailor this day
            </CtaButton>
          </div>
        </div>
      </section>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 2 · TRUST STRIP
 * ════════════════════════════════════════════════════════════ */
function TrustStrip({ meta }: { meta?: ViatorMeta }) {
  const items = [
    { icon: <Shield size={14} />, label: "Instant confirmation" },
    { icon: <Check size={14} />, label: CANCELLATION.signature.en },
    { icon: <Check size={14} />, label: "A local on WhatsApp if you need help" },
    {
      icon: <Star size={14} />,
      label:
        meta && meta.reviewCount > 0
          ? `${meta.rating.toFixed(1)} · ${meta.reviewCount} reviews`
          : "Trusted local guide",
    },
  ];
  return (
    <section className="border-y border-[color:var(--border)] bg-[color:var(--ivory)] reveal">
      <div className="container-x max-w-6xl py-4">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2">
              <span className="text-[color:var(--gold)]">{it.icon}</span>
              {it.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 3 · INTRO
 * ════════════════════════════════════════════════════════════ */
function IntroBlock({ tour }: { tour: SignatureTour }) {
  return (
    <section className="py-14 md:py-20 reveal">
      <div className="container-x max-w-3xl text-center">
        <Eyebrow flank>The day, in short</Eyebrow>
        <p className="serif mt-5 text-[1.5rem] sm:text-2xl md:text-[1.85rem] leading-snug text-[color:var(--charcoal)]">
          {tour.intro}
        </p>
        {tour.contextParagraph && (
          <p className="mt-6 text-[15px] md:text-[16px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            {tour.contextParagraph}
          </p>
        )}
        {tour.contextLink && (
          <p className="mt-4 text-[14px]">
            <a
              href={tour.contextLink.href}
              className="underline decoration-[color:var(--gold)]/60 underline-offset-4 text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
            >
              {tour.contextLink.label} →
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 4 · HIGHLIGHTS — clean bullets only
 * ════════════════════════════════════════════════════════════ */
function HighlightsBlock({ tour }: { tour: SignatureTour }) {
  const content = getTourContent(tour.id);
  const items = content.highlights.length > 0 ? content.highlights : (tour.highlights ?? []);
  if (items.length === 0) return null;
  return (
    <section className="pb-14 md:pb-16 reveal">
      <div className="container-x max-w-5xl">
        <div className="text-center mb-8">
          <Eyebrow flank>Highlights</Eyebrow>
          <SectionTitle size="compact">
            What you'll <SectionTitle.Em>actually do</SectionTitle.Em>
          </SectionTitle>
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-4 max-w-3xl mx-auto">
          {items.map((h) => (
            <li
              key={h}
              className="flex gap-3 text-[15px] leading-relaxed text-[color:var(--charcoal)]"
            >
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] flex-shrink-0" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 5 · ITINERARY — visual timeline (Viator stops when available)
 * ════════════════════════════════════════════════════════════ */
function ItineraryTimeline({ tour, meta }: { tour: SignatureTour; meta?: ViatorMeta }) {
  // Source of truth (in order of preference):
  //   1. Viator-verified SoT itinerary (pass-bys excluded)
  //   2. Tailor blueprint, projected to editorial chapters
  //   3. Raw Viator stops (passBy excluded)
  //   4. Internal tour.stops — last resort
  type Chapter = { label: string; story?: string; optional?: boolean };
  const sot = sotItinerary(tour.id) ?? [];
  const fromSot = sot
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((c) => c.stopType !== "pass-by")
    .map((c) => ({ label: c.label, story: c.description, optional: c.optional }));
  const fromBlueprint = toEditorialChapters(tour.id);
  const viator = meta?.stops?.filter((s) => !s.passBy) ?? [];
  const chapters: Chapter[] =
    fromSot.length > 0
      ? fromSot
      : fromBlueprint && fromBlueprint.length > 0
        ? fromBlueprint.map((c) => ({ label: c.label, story: c.story, optional: c.optional }))
        : viator.length > 0
          ? viator.map((s) => ({ label: s.name, story: s.desc }))
          : (tour.stops ?? []).map((s) => ({ label: s.label, story: s.story }));

  if (chapters.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-[color:var(--sand)]/40 border-y border-[color:var(--border)] reveal">
      <div className="container-x max-w-5xl">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
          <div>
            <Eyebrow>Itinerary</Eyebrow>
            <SectionTitle size="compact">
              The day, <SectionTitle.Em>chapter by chapter</SectionTitle.Em>
            </SectionTitle>
          </div>
          <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
            {chapters.length} chapters · in this order
          </span>
        </div>

        <Scene as="ol" className="relative space-y-7">
          <span
            className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[color:var(--gold)]/60 via-[color:var(--gold)]/30 to-transparent md:left-[19px]"
            aria-hidden
          />
          {chapters.map((s, i) => (
            <li key={s.label + i} className="scene-item relative pl-12 md:pl-16">
              <span className="absolute left-0 top-1 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-[color:var(--ivory)] border border-[color:var(--gold)] text-[12px] md:text-[13px] text-[color:var(--teal)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)]">
                {i + 1}
              </span>

              <div className="pt-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] uppercase tracking-[0.26em] text-[color:var(--charcoal)]">
                    Chapter {i + 1}
                  </span>
                  {s.optional && (
                    <span className="text-[12px] uppercase tracking-[0.12em] px-2 py-[3px] rounded-full border border-[color:var(--gold)]/40 text-[color:var(--charcoal)] bg-[color:var(--gold)]/[0.06]">
                      Optional
                    </span>
                  )}
                </div>
                <h3
                  className="serif text-[17px] md:text-[19px] leading-snug mt-2 text-[color:var(--charcoal)] font-normal"
                  data-mixed-emphasis="exempt"
                >
                  {s.label}
                </h3>
                {s.story && (
                  <p className="mt-2 text-[13.5px] md:text-[14px] text-[color:var(--charcoal-soft)] leading-relaxed max-w-2xl">
                    {s.story}
                  </p>
                )}
              </div>
            </li>
          ))}
        </Scene>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 7 · INCLUDED + IDEAL FOR
 * ════════════════════════════════════════════════════════════ */
function IncludedAndIdeal({ tour, meta }: { tour: SignatureTour; meta?: ViatorMeta }) {
  const inc = bookableIncluded(tour, meta);
  const ideal = tour.idealFor ?? [];
  const notes = tour.notes ?? [];
  const hasInc = inc.items.length > 0;
  const hasIdeal = ideal.length > 0;
  if (!hasInc && !hasIdeal && notes.length === 0) return null;
  return (
    <section className="py-14 md:py-20 bg-[color:var(--ivory)] border-y border-[color:var(--border)] reveal">
      <div className="container-x max-w-5xl grid md:grid-cols-2 gap-10 md:gap-14">
        {hasInc && (
          <Block icon={<Check size={14} />} title="What's included">
            <ul className="space-y-3 text-[14.5px] leading-relaxed">
              {inc.items.map((h) => (
                <li key={h} className="flex gap-2.5">
                  <Check size={15} className="mt-0.5 text-[color:var(--teal)] flex-shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {hasIdeal && (
          <Block icon={<Heart size={14} />} title="Who it's for">
            <ul className="space-y-3 text-[14.5px] leading-relaxed">
              {ideal.map((h) => (
                <li key={h} className="flex gap-2.5">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[color:var(--teal)] flex-shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {notes.length > 0 && (
          <div className="md:col-span-2">
            <Block icon={<Info size={14} />} title="Good to know">
              <ul className="space-y-2 text-[13.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                {notes.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[color:var(--charcoal-soft)] flex-shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </Block>
          </div>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 9 · GALLERY — real photos only
 * ════════════════════════════════════════════════════════════ */
function GalleryStrip({
  tour,
  resolveImg,
  meta,
  adminPhotos,
}: {
  tour: SignatureTour;
  resolveImg: ReturnType<typeof useImportedTourImages>["resolveImg"];
  meta?: ViatorMeta;
  adminPhotos: ReturnType<typeof useAdminTourPhotos>;
}) {
  const seen = new Set<string>();
  const photos: { src: string; alt: string; srcSet?: string; focal?: string }[] = [];
  const push = (src: string, alt: string, srcSet?: string, focal?: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    photos.push({ src, alt, srcSet, focal });
  };

  // Priority: admin-uploaded YES photos first (cover then sort_order),
  // then baked local gallery, then curated Viator gallery.
  for (const p of adminPhotos) push(p.src, p.alt, p.srcSet);
  for (const p of getTourGallery(tour, meta)) push(p.src, p.alt);

  if (photos.length < 3) return null;

  return (
    <section className="py-14 md:py-20 reveal">
      <div className="container-x max-w-6xl">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <Eyebrow>Gallery</Eyebrow>
            <SectionTitle size="compact">
              Inside <SectionTitle.Em>the day</SectionTitle.Em>
            </SectionTitle>
          </div>
          <p className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
            Real photos · real stops
          </p>
        </div>

        <div className="-mx-4 px-4 overflow-x-auto overscroll-x-contain scrollbar-thin">
          <div className="flex gap-3 md:gap-4 snap-x snap-mandatory">
            {photos.map((p, i) => (
              <figure
                key={p.src + i}
                className={`shrink-0 snap-start relative ${
                  i === 0
                    ? "w-[80vw] sm:w-[60vw] md:w-[42rem]"
                    : "w-[64vw] sm:w-[40vw] md:w-[22rem]"
                }`}
              >
                <TourImage
                  src={p.src}
                  srcSet={p.srcSet}
                  sizes={
                    i === 0 ? "(min-width: 768px) 42rem, 80vw" : "(min-width: 768px) 22rem, 64vw"
                  }
                  alt={p.alt}
                  ratio="3/2"
                  focal={p.focal ?? "50% 50%"}
                  imgClassName="transition-transform duration-700 hover:scale-[1.04]"
                >
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[color:var(--charcoal-deep)]/80 to-transparent">
                    <figcaption className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--ivory)]/90">
                      {p.alt}
                    </figcaption>
                  </div>
                </TourImage>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 10 · BOOK — reserve the Signature as designed
 * ════════════════════════════════════════════════════════════ */
function BookingBlock({ tour }: { tour: SignatureTour }) {
  return (
    <section
      id="book"
      className="py-14 md:py-20 bg-[color:var(--sand)]/50 scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-x max-w-3xl">
        <SimpleBookingForm tour={tour} />
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 11 · REVIEWS / SOCIAL PROOF — handled by <TourReviews /> above
 * ════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════
 * 12 · FINAL CTA
 * ════════════════════════════════════════════════════════════ */
function FinalCta({ tour }: { tour: SignatureTour }) {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden reveal">
      <div className="absolute inset-0">
        <img
          src={tour.img}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          style={{ objectPosition: tour.focal ?? "50% 50%" }}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal-deep)]/95 via-[color:var(--charcoal-deep)]/75 to-[color:var(--charcoal-deep)]/55" />
      </div>

      <div className="relative container-x max-w-3xl text-center text-[color:var(--ivory)]">
        <Eyebrow flank tone="onDark">
          Ready when you are
        </Eyebrow>
        <SectionTitle size="default" spacing="loose" className="text-[color:var(--ivory)]">
          {tour.title.split("—")[0].trim()}
        </SectionTitle>
        <p className="serif italic font-normal mt-4 text-lg md:text-xl text-[color:var(--ivory)]/85">
          Confirm in real time. The day is yours.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <CtaButton
            href="#book"
            variant="primary"
            iconLeading={<Sparkles size={14} aria-hidden="true" />}
          >
            Check availability & reserve
          </CtaButton>
          <Link
            to="/tours/$tourId/tailor"
            params={{ tourId: tour.id }}
            data-analytics="signature_tailor_click"
            data-analytics-placement="final"
            data-analytics-experience-id={tour.id}
            data-analytics-experience-type="signature"
            className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.12em] text-[color:var(--ivory)]/85 hover:text-[color:var(--gold)] transition-colors min-h-[44px]"
          >
            Tailor this day{" "}
            <span aria-hidden="true" className="text-[color:var(--gold)]">
              →
            </span>
          </Link>
        </div>

        <p className="mt-5 text-[12px] uppercase tracking-[0.12em] text-[color:var(--ivory)]/65">
          Instant confirmation · {CANCELLATION.signature.en} · A local on WhatsApp if you need help
        </p>
        <CredentialStrip variant="dark" className="mt-6" />
        <p className="mt-6 text-[13px] text-[color:var(--ivory)]/75">
          Want a different shape of day?{" "}
          <Link
            to="/studio-v3"
            className="underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--gold)] transition-colors"
          >
            Design your own private Portugal day in the Studio
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Helpers
 * ════════════════════════════════════════════════════════════ */
function Block({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
        <span className="text-[color:var(--gold)]">{icon}</span>
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RelatedTours({ currentId }: { currentId: string }) {
  // Relevance from existing metadata only: same region first (case-insensitive
  // region string already on each Signature), then the rest of the collection
  // in published order. Never links to the current page or a legacy slug —
  // every href is built from the canonical `/tours/$tourId` route.
  const current = signatureTours.find((t) => t.id === currentId);
  const currentRegion = (current?.region ?? "").trim().toLowerCase();
  const pool = signatureTours.filter((t) => t.id !== currentId && isValidTourId(t.id));
  const sameRegion = pool.filter((t) => t.region.trim().toLowerCase() === currentRegion);
  const others = [...sameRegion, ...pool.filter((t) => !sameRegion.includes(t))].slice(0, 3);
  const { resolveImg } = useImportedTourImages();
  if (others.length === 0) return null;
  return (
    <section className="py-16 bg-[color:var(--ivory)] border-t border-[color:var(--border)] reveal">
      <div className="container-x max-w-5xl">
        <Eyebrow>More like this</Eyebrow>
        <SectionTitle size="compact">
          Other <SectionTitle.Em>Signature Experiences</SectionTitle.Em>
        </SectionTitle>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {others.map((t) => (
            <Link
              key={t.id}
              to="/tours/$tourId"
              params={{ tourId: t.id }}
              className="group flex flex-col"
            >
              <TourImage
                {...resolveImg(t, "md")}
                alt={t.title}
                ratio="3/2"
                focal={t.focal ?? "50% 50%"}
                className="mb-3"
                imgClassName="transition-transform duration-700 group-hover:scale-105"
              />
              <h3 className="serif text-lg">{t.title}</h3>
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] mt-1">
                {t.region}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
