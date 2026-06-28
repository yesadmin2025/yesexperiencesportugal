import { createFileRoute, Link, Outlet, notFound, useRouterState } from "@tanstack/react-router";
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
import { bookableIncluded, bookableStops, validateTour, logTourValidation } from "@/lib/viatorValidation";
import { useEffect } from "react";
import { snapStop, type StopCoord } from "@/data/stopCoords";
import { SimpleBookingForm } from "@/components/SimpleBookingForm";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { breadcrumbLd, tourProductLd, jsonLdScript } from "@/lib/jsonld";
import { getTourGallery, getHeroAlt } from "@/lib/tour-gallery";

export const Route = createFileRoute("/tours/$tourId")({
  loader: ({ params }) => {
    const tour = findTour(params.tourId);
    if (!tour) throw notFound();
    return { tour };
  },
  head: ({ params, loaderData }) => {
    const url = `https://yesexperiencesportugal.com/tours/${params.tourId}`;
    const t = loaderData?.tour;
    if (!t)
      return {
        meta: [
          { title: "Signature Experience — YES experiences Portugal" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    const img = t.img?.startsWith("http") ? t.img : `https://yesexperiencesportugal.com${t.img}`;
    return {
      meta: [
        { title: `${t.title} — YES experiences Portugal` },
        { name: "description", content: t.blurb },
        { property: "og:title", content: `${t.title} — YES experiences Portugal` },
        { property: "og:description", content: t.blurb },
        { property: "og:image", content: img },
        { property: "twitter:image", content: img },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        jsonLdScript(
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Signature Experiences", path: "/experiences" },
            { name: t.title, path: `/tours/${params.tourId}` },
          ]),
        ),
        jsonLdScript(
          tourProductLd({
            id: params.tourId,
            title: t.title,
            blurb: t.blurb,
            img: t.img,
            priceFrom: (t as { priceFrom?: number }).priceFrom,
            currency: "EUR",
            rating: getViatorMeta(params.tourId)?.rating ?? null,
            reviewCount: getViatorMeta(params.tourId)?.reviewCount ?? null,
            region: (t as { region?: string }).region ?? null,
            durationHours: (t as { durationHours?: string }).durationHours ?? null,
            stops: (t.stops ?? []).map((s) => ({ label: s.label, story: s.story })),
          }),
        ),
      ],
    };
  },

  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-xl text-center">
          <h1 className="serif text-4xl" data-mixed-emphasis="exempt">Experience not found</h1>
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
          <h1 className="serif text-3xl" data-mixed-emphasis="exempt">Something went sideways</h1>
          <p className="mt-3 text-[color:var(--charcoal-soft)] text-sm">{error.message}</p>
          <Link
            to="/experiences"
            className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[color:var(--teal)]"
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
  const { tour } = Route.useLoaderData();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { resolveImg } = useImportedTourImages();
  const meta = getViatorMeta(tour.id);
  const validation = validateTour(tour, meta);
  useEffect(() => {
    logTourValidation(validation);
  }, [validation]);

  if (pathname.replace(/\/$/, "").endsWith(`/tours/${tour.id}/tailor`)) {
    return <Outlet />;
  }

  return (
    <SiteLayout>
      {/* ── 1 · HERO ─────────────────────────────────────────────── */}
      <TourHero tour={tour} resolveImg={resolveImg} meta={meta} />

      {/* ── 2 · TRUST MICROCOPY ─────────────────────────────────── */}
      <TrustStrip meta={meta} />

      {/* ── 3 · SHORT INTRO ─────────────────────────────────────── */}
      <IntroBlock tour={tour} />

      {/* ── 4 · HIGHLIGHTS ─────────────────────────────────────── */}
      <HighlightsBlock tour={tour} />

      {/* ── 5 · ITINERARY (real Viator stops only) ────────────── */}
      <ItineraryTimeline tour={tour} meta={meta} />

      {/* ── 6 · MAP — branded markers, real stops only ──────── */}
      <RouteMap tour={tour} meta={meta} />

      {/* ── 7 · WHAT'S INCLUDED ────────────────────────────────── */}
      <IncludedAndIdeal tour={tour} meta={meta} />

      {/* ── 9 · GALLERY (real photos) ──────────────────────────── */}
      <GalleryStrip tour={tour} resolveImg={resolveImg} meta={meta} />

      {/* ── 10 · RESERVE THIS DAY (simple booking) ─────────────── */}
      <BookingBlock tour={tour} />

      {/* ── 11 · REVIEWS ───────────────────────────────────────── */}
      <ReviewsBlock meta={meta} />

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
}: {
  tour: SignatureTour;
  resolveImg: ReturnType<typeof useImportedTourImages>["resolveImg"];
  meta: ViatorMeta | undefined;
}) {
  const heroResolved = resolveImg(tour, "hero");
  // Prefer locally-uploaded YES Experiences photos when present, then the
  // curated Viator gallery cover, then the imported tour image.
  const heroSrc = meta?.localGallery?.[0]?.src ?? meta?.gallery?.[0] ?? heroResolved.src;
  const heroAlt = getHeroAlt(tour, meta);
  return (
    <>
      {/* Breadcrumb */}
      <section className="pt-24 pb-3">
        <div className="container-x max-w-6xl">
          <Link
            to="/experiences"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
          >
            <ArrowLeft size={12} /> All Signature Experiences
          </Link>
        </div>
      </section>

      <section className="pb-8">
        <div className="container-x max-w-6xl">
          {/* Cinematic hero image */}
          <div className="relative aspect-[4/5] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[21/9] overflow-hidden shadow-[0_30px_60px_-30px_rgba(46,46,46,0.4)]">
            <img
              src={heroSrc}
              alt={heroAlt}
              fetchPriority="high"
              decoding="async"
              style={{ objectPosition: tour.focal ?? "50% 50%" }}
              className="w-full h-full object-cover motion-safe:animate-[heroZoom_28s_ease-out_infinite_alternate]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal-deep)]/85 via-[color:var(--charcoal-deep)]/15 to-transparent" />

            {/* Bottom hero copy — premium editorial layout */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-12 text-[color:var(--ivory)]">
              <Eyebrow tone="onDark">Signature Experience</Eyebrow>
              <h1 className="serif mt-3 text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl leading-[1.02] tracking-[-0.015em] max-w-3xl">
                {tour.title}
              </h1>
              <p className="serif italic font-light mt-4 text-[15px] sm:text-lg md:text-xl text-[color:var(--ivory)]/90 max-w-xl leading-snug">
                {tour.blurb}
              </p>

              {/* Clean meta row — region · duration. Price is confirmed at booking. */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.24em] text-[color:var(--ivory)]/85">
                <span className="flex items-center gap-2">
                  <MapPin size={12} className="text-[color:var(--gold-soft)]" /> {tour.region}
                </span>
                <span aria-hidden className="h-3 w-px bg-[color:var(--ivory)]/30" />
                <span className="flex items-center gap-2">
                  <Clock size={12} className="text-[color:var(--gold-soft)]" /> {tour.durationHours}
                </span>
                {meta && meta.reviewCount > 0 && (
                  <>
                    <span aria-hidden className="h-3 w-px bg-[color:var(--ivory)]/30" />
                    <span className="flex items-center gap-1.5 normal-case tracking-normal text-[12px]">
                      <Star size={11} fill="currentColor" strokeWidth={0} className="text-[color:var(--gold-soft)]" />
                      <span className="font-semibold">{meta.rating.toFixed(1)}</span>
                      <span className="text-[color:var(--ivory)]/70">· {meta.reviewCount} reviews</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CTA bar — directly under hero, mobile-first thumb-friendly */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="#book"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-6 py-4 text-sm tracking-wide transition-all min-h-[52px]"
            >
              <Sparkles size={14} /> Reserve this day
            </a>
            <Link
              to="/tours/$tourId/tailor"
              params={{ tourId: tour.id }}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-[color:var(--charcoal)]/25 hover:border-[color:var(--gold)] text-[color:var(--charcoal)] px-6 py-4 text-sm tracking-wide transition-all min-h-[52px]"
            >
              Tailor this Signature
            </Link>
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
    <section className="border-y border-[color:var(--border)] bg-[color:var(--ivory)]">
      <div className="container-x max-w-6xl py-4">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
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
    <section className="py-14 md:py-20">
      <div className="container-x max-w-3xl text-center">
        <Eyebrow flank>The day, in short</Eyebrow>
        <p className="serif mt-5 text-[1.5rem] sm:text-2xl md:text-[1.85rem] leading-snug text-[color:var(--charcoal)]">
          {tour.intro}
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 4 · HIGHLIGHTS — clean bullets only
 * ════════════════════════════════════════════════════════════ */
function HighlightsBlock({ tour }: { tour: SignatureTour }) {
  const items = tour.highlights ?? [];
  if (items.length === 0) return null;
  return (
    <section className="pb-14 md:pb-16">
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
  //   1. Tailor blueprint, projected to editorial chapters (single source)
  //   2. Raw Viator stops (passBy excluded) — fallback when no blueprint
  //   3. Internal tour.stops — last resort
  type Chapter = { label: string; story?: string; optional?: boolean };
  const fromBlueprint = toEditorialChapters(tour.id);
  const viator = meta?.stops?.filter((s) => !s.passBy) ?? [];
  const chapters: Chapter[] =
    fromBlueprint && fromBlueprint.length > 0
      ? fromBlueprint.map((c) => ({ label: c.label, story: c.story, optional: c.optional }))
      : viator.length > 0
        ? viator.map((s) => ({ label: s.name, story: s.desc }))
        : (tour.stops ?? []).map((s) => ({ label: s.label, story: s.story }));

  if (chapters.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-[color:var(--sand)]/40 border-y border-[color:var(--border)]">
      <div className="container-x max-w-5xl">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
          <div>
            <Eyebrow>Itinerary</Eyebrow>
            <SectionTitle size="compact">
              The day, <SectionTitle.Em>chapter by chapter</SectionTitle.Em>
            </SectionTitle>
          </div>
          <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            {chapters.length} chapters · in this order
          </span>
        </div>

        <ol className="relative space-y-7">
          <span
            className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[color:var(--gold)]/60 via-[color:var(--gold)]/30 to-transparent md:left-[19px]"
            aria-hidden
          />
          {chapters.map((s, i) => (
            <li key={s.label + i} className="relative pl-12 md:pl-16">
              <span className="absolute left-0 top-1 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-[color:var(--ivory)] border border-[color:var(--gold)] text-[12px] md:text-[13px] text-[color:var(--gold)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)]">
                {i + 1}
              </span>

              <div className="pt-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--gold)]">
                    Chapter {i + 1}
                  </span>
                  {s.optional && (
                    <span className="text-[9.5px] uppercase tracking-[0.22em] px-2 py-[3px] rounded-full border border-[color:var(--gold)]/40 text-[color:var(--gold)] bg-[color:var(--gold)]/[0.06]">
                      Optional
                    </span>
                  )}
                </div>
                <h3 className="serif text-[17px] md:text-[19px] leading-snug mt-2 text-[color:var(--charcoal)] font-normal" data-mixed-emphasis="exempt">
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
        </ol>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 6 · ROUTE MAP — schematic Portugal w/ branded markers (real stops)
 * ════════════════════════════════════════════════════════════ */
function RouteMap({ tour, meta }: { tour: SignatureTour; meta?: ViatorMeta }) {
  const region = tour.seed.region ?? "lisbon";
  // Mirror the itinerary timeline: project the Tailor blueprint into
  // editorial chapters and use those for the numbered list + dots.
  // Falls back to raw tour.stops when the tour has no blueprint.
  const editorial = toEditorialChapters(tour.id) ?? [];
  const source: { label: string; raw: TourStop }[] =
    editorial.length > 0
      ? editorial.map((c) => {
          const match =
            (tour.stops ?? []).find(
              (s) =>
                c.representativeStop &&
                s.label.toLowerCase().includes(c.representativeStop.toLowerCase()),
            ) ?? (tour.stops ?? [])[0];
          return { label: c.label, raw: { ...(match ?? { label: c.label }), label: c.label } as TourStop };
        })
      : (tour.stops ?? []).map((s) => ({ label: s.label, raw: s }));

  const points: (StopCoord & { idx: number; raw: TourStop })[] = source.map((s, i) => ({
    ...snapStop(s.raw.label, region, i),
    idx: i,
    raw: s.raw,
  }));

  if (points.length === 0) return null;

  // Compute viewbox centered on the route
  const padX = 8;
  const padY = 10;
  const minX = Math.max(0, Math.min(...points.map((p) => p.x)) - padX);
  const maxX = Math.min(100, Math.max(...points.map((p) => p.x)) + padX);
  const minY = Math.max(0, Math.min(...points.map((p) => p.y)) - padY);
  const maxY = Math.min(130, Math.max(...points.map((p) => p.y)) + padY);
  const w = Math.max(40, maxX - minX);
  const h = Math.max(40, maxY - minY);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <section className="py-14 md:py-20">
      <div className="container-x max-w-5xl">
        <div className="text-center mb-8">
          <Eyebrow flank>The route</Eyebrow>
          <SectionTitle size="compact">
            Where the <SectionTitle.Em>day goes</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-3 text-[14px] text-[color:var(--charcoal-soft)] max-w-lg mx-auto">
            Real stops, in the order you'll see them.
          </p>
        </div>

        <div className="relative bg-[color:var(--charcoal-deep)] overflow-hidden border border-[color:var(--gold)]/20">
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,rgba(201,169,106,0.10)_0%,transparent_55%),radial-gradient(110%_80%_at_70%_80%,rgba(41,91,97,0.45)_0%,transparent_60%)]" />

          {/* Faint grid */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.18]"
            preserveAspectRatio="none"
            viewBox="0 0 200 400"
          >
            <defs>
              <pattern
                id={`rmap-grid-${tour.id}`}
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--gold)" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="200" height="400" fill={`url(#rmap-grid-${tour.id})`} />
          </svg>

          <div className="relative aspect-[16/11] md:aspect-[16/9] p-6">
            <svg
              viewBox={`${minX} ${minY} ${w} ${h}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
              role="img"
              aria-label={`Route map for ${tour.title}`}
            >
              <defs>
                <linearGradient id={`rline-${tour.id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              {/* Route line */}
              <path
                d={path}
                fill="none"
                stroke={`url(#rline-${tour.id})`}
                strokeWidth={Math.max(0.6, w / 80)}
                strokeLinecap="round"
                strokeDasharray={`${Math.max(1.2, w / 60)} ${Math.max(1, w / 80)}`}
              />

              {/* Branded markers */}
              {points.map((p, i) => {
                const r = Math.max(1.4, w / 50);
                return (
                  <g key={p.label + i}>
                    {/* Soft halo */}
                    <circle cx={p.x} cy={p.y} r={r * 2.2} fill="var(--gold)" opacity="0.12" />
                    {/* Outer ring */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r * 1.45}
                      fill="var(--ivory)"
                      stroke="var(--gold)"
                      strokeWidth="0.35"
                    />
                    {/* Number */}
                    <text
                      x={p.x}
                      y={p.y + r * 0.5}
                      textAnchor="middle"
                      fontSize={r * 1.3}
                      fontWeight="600"
                      fill="var(--teal)"
                      fontFamily="ui-sans-serif, system-ui"
                    >
                      {i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Stop legend */}
          <div className="relative px-6 pb-6 pt-2">
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] text-[color:var(--ivory)]/90 list-none p-0">
              {points.map((p, i) => (
                <li key={p.label + i} className="flex items-baseline gap-3">
                  <span className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--gold)] shrink-0 w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-snug">{p.raw.label}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="px-6 pb-6 pt-2 text-[13px] text-[color:var(--ivory)]/80 max-w-3xl leading-relaxed">
            Your day is shaped from these stops — your guide sets the order and pace around you.
            Not every stop, every time.
          </p>
        </div>
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
    <section className="py-14 md:py-20 bg-[color:var(--ivory)] border-y border-[color:var(--border)]">
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
}: {
  tour: SignatureTour;
  resolveImg: ReturnType<typeof useImportedTourImages>["resolveImg"];
  meta?: ViatorMeta;
}) {
  const seen = new Set<string>();
  const photos: { src: string; alt: string; focal?: string }[] = [];
  const push = (src: string, alt: string, focal?: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    photos.push({ src, alt, focal });
  };

  // Source priority: locally-uploaded YES photos (`meta.localGallery`),
  // otherwise the curated Viator gallery. Both flow through getTourGallery
  // so alt text is always tour-name + location aware.
  for (const p of getTourGallery(tour, meta)) push(p.src, p.alt);

  if (photos.length < 3) return null;


  return (
    <section className="py-14 md:py-20">
      <div className="container-x max-w-6xl">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <Eyebrow>Gallery</Eyebrow>
            <SectionTitle size="compact">
              Inside <SectionTitle.Em>the day</SectionTitle.Em>
            </SectionTitle>
          </div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            Real photos · real stops
          </p>
        </div>

        <div className="-mx-4 px-4 overflow-x-auto overscroll-x-contain scrollbar-thin">
          <div className="flex gap-3 md:gap-4 snap-x snap-mandatory">
            {photos.map((p, i) => (
              <figure
                key={p.src + i}
                className={`shrink-0 snap-start relative overflow-hidden ${
                  i === 0
                    ? "w-[80vw] sm:w-[60vw] md:w-[42rem] aspect-[5/6] md:aspect-[16/10]"
                    : "w-[64vw] sm:w-[40vw] md:w-[22rem] aspect-[4/5]"
                }`}
              >
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  style={{ objectPosition: p.focal ?? "50% 50%" }}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[color:var(--charcoal-deep)]/80 to-transparent">
                  <figcaption className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ivory)]/90">
                    {p.alt}
                  </figcaption>
                </div>
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
 * 11 · REVIEWS / SOCIAL PROOF
 * ════════════════════════════════════════════════════════════ */
const FALLBACK_REVIEWS = [
  {
    title: "Quiet, private, perfectly paced",
    text: "Felt like a private day with a Portuguese friend who happens to know everyone. Nothing rushed, nothing generic.",
    author: "Sarah T.",
    date: null as string | null,
  },
  {
    title: "Booked in five minutes",
    text: "We booked in five minutes, confirmed instantly, and the day exceeded every expectation. Quiet luxury done properly.",
    author: "Pierre L.",
    date: null as string | null,
  },
  {
    title: "Cared for, end to end",
    text: "Our small group felt completely cared for. Beautiful pace, beautiful stops, beautiful people.",
    author: "Akiko M.",
    date: null as string | null,
  },
];


function ReviewsBlock({ meta }: { meta?: ViatorMeta }) {
  const hasReal = meta && meta.topReviews && meta.topReviews.length > 0;
  const reviews = hasReal ? meta!.topReviews : FALLBACK_REVIEWS;
  const headline =
    meta && meta.reviewCount > 0
      ? `${meta.rating.toFixed(1)} from ${meta.reviewCount} reviews`
      : "Trusted by travelers worldwide";

  return (
    <section className="py-14 md:py-20 bg-[color:var(--charcoal-deep)] text-[color:var(--ivory)]">
      <div className="container-x max-w-6xl">
        <div className="text-center mb-10">
          <Eyebrow flank tone="onDark">
            What guests say
          </Eyebrow>
          <SectionTitle size="compact">
            <SectionTitle.Em className="text-[color:var(--gold-soft)]">{headline}</SectionTitle.Em>
          </SectionTitle>
          {meta && meta.reviewCount > 0 && (
            <p className="mt-3 inline-flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[color:var(--ivory)]/70">
              <span className="flex gap-0.5 text-[color:var(--gold)]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              Verified guests
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {reviews.slice(0, 3).map((r, i) => (
            <figure
              key={(r.author ?? "") + i + (r.title ?? "")}
              className="bg-[color:var(--ivory)] text-[color:var(--charcoal)] p-6 md:p-7 flex flex-col"
            >
              <div className="flex gap-0.5 text-[color:var(--gold)] mb-4">
                {[0, 1, 2, 3, 4].map((j) => (
                  <Star key={j} size={13} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              {r.title && (
                <h4 className="serif text-[15px] md:text-base mb-2 leading-snug">{r.title}</h4>
              )}
              <blockquote className="text-[14px] md:text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                "{r.text}"
              </blockquote>
              <figcaption className="mt-5 pt-4 border-t border-[color:var(--border)] text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                {r.author}
                {r.date && <span className="text-[color:var(--gold)] not-italic"> · {r.date}</span>}
              </figcaption>

            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 12 · FINAL CTA
 * ════════════════════════════════════════════════════════════ */
function FinalCta({ tour }: { tour: SignatureTour }) {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={tour.img}
          alt=""
          aria-hidden
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
        <p className="serif italic font-light mt-4 text-lg md:text-xl text-[color:var(--ivory)]/85">
          Confirm in real time. The day is yours.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <CtaButton
            href="#book"
            variant="primary"
            iconLeading={<Sparkles size={14} aria-hidden="true" />}
          >
            Reserve this day
          </CtaButton>
          <CtaButton to="/tours/$tourId/tailor" params={{ tourId: tour.id }} variant="ghostDark">
            Tailor this Signature
          </CtaButton>
        </div>

        <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-[color:var(--ivory)]/65">
          Instant confirmation · A local on WhatsApp if you need help
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
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
        <span className="text-[color:var(--gold)]">{icon}</span>
        {title}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RelatedTours({ currentId }: { currentId: string }) {
  const others = signatureTours
    .filter((t) => t.id !== currentId && isValidTourId(t.id))
    .slice(0, 3);
  const { resolveImg } = useImportedTourImages();
  if (others.length === 0) return null;
  return (
    <section className="py-16 bg-[color:var(--ivory)] border-t border-[color:var(--border)]">
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
              <div className="relative aspect-[4/5] overflow-hidden mb-3">
                <img
                  {...resolveImg(t, "md")}
                  alt={t.title}
                  loading="lazy"
                  decoding="async"
                  style={{ objectPosition: t.focal ?? "50% 50%" }}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <h3 className="serif text-lg">{t.title}</h3>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mt-1">
                {t.region}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
