import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import {
  Clock,
  MapPin,
  ArrowLeft,
  Check,
  Sparkles,
  Info,
  Heart,
  Shield,
  Star,
  Users,
} from "lucide-react";
import {
  signatureTours,
  findTour,
  isValidTourId,
  stopImage,
  stopFocal,
  type SignatureTour,
  type TourStop,
} from "@/data/signatureTours";
import { getViatorMeta, type ViatorMeta } from "@/data/signatureToursViator";
import { snapStop, type StopCoord } from "@/data/stopCoords";
import { SimpleTailorForm } from "@/components/SimpleTailorForm";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";

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
    };
  },

  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-xl text-center">
          <h1 className="serif text-4xl">Experience not found</h1>
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
          <h1 className="serif text-3xl">Something went sideways</h1>
          <p className="mt-3 text-[color:var(--charcoal-soft)] text-sm">{error.message}</p>
          <Link to="/experiences" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[color:var(--teal)]">
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
  const { resolveImg } = useImportedTourImages();
  const meta = getViatorMeta(tour.id);

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

      {/* ── 5 · ITINERARY (visual timeline) ────────────────────── */}
      <ItineraryTimeline tour={tour} />

      {/* ── 6 · MAP — branded markers, real stops only ──────── */}
      <RouteMap tour={tour} />

      {/* ── 7 · WHAT'S INCLUDED ────────────────────────────────── */}
      <IncludedAndIdeal tour={tour} />

      {/* ── 9 · GALLERY (real photos) ──────────────────────────── */}
      <GalleryStrip tour={tour} resolveImg={resolveImg} meta={meta} />

      {/* ── 10 · TAILOR THIS SIGNATURE ─────────────────────────── */}
      <TailorBlock tour={tour} />

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
  // If we have Viator gallery, use the first image (curated cover) instead.
  const heroSrc = meta?.gallery?.[0] ?? heroResolved.src;
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
              alt={tour.title}
              fetchPriority="high"
              decoding="async"
              style={{ objectPosition: tour.focal ?? "50% 50%" }}
              className="w-full h-full object-cover motion-safe:animate-[heroZoom_28s_ease-out_infinite_alternate]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal-deep)]/85 via-[color:var(--charcoal-deep)]/15 to-transparent" />

            {/* Top tags */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
              <span className="text-[10px] uppercase tracking-[0.28em] bg-[color:var(--ivory)]/95 text-[color:var(--teal)] px-3 py-1.5">
                {tour.theme}
              </span>
              <span className="text-[10px] uppercase tracking-[0.24em] bg-[color:var(--gold)]/95 text-[color:var(--charcoal)] px-3 py-1.5">
                Signature
              </span>
            </div>

            {/* Bottom hero copy */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-12 text-[color:var(--ivory)]">
              <Eyebrow tone="onDark">Signature Experience</Eyebrow>
              <h1 className="serif mt-3 text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl leading-[1.02] tracking-[-0.015em] max-w-3xl">
                {tour.title}
              </h1>
              <p className="serif italic font-light mt-4 text-[15px] sm:text-lg md:text-xl text-[color:var(--ivory)]/90 max-w-xl leading-snug">
                {tour.blurb}
              </p>

              {/* Rating pill (only when we have Viator data) */}
              {meta && meta.reviewCount > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 bg-[color:var(--ivory)]/95 text-[color:var(--charcoal)] px-3 py-1.5 text-[12px]">
                  <span className="flex gap-0.5 text-[color:var(--gold)]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                  <span className="tracking-tight font-medium">{meta.rating.toFixed(1)}</span>
                  <span className="text-[color:var(--charcoal-soft)]">· {meta.reviewCount} reviews</span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--ivory)]/80">
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} /> {tour.region}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={12} /> {tour.durationHours}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={12} /> Private — your group only
                </span>
                <span className="text-[color:var(--gold-soft)]">From €{tour.priceFrom}</span>
              </div>
            </div>
          </div>

          {/* CTA bar — directly under hero, mobile-first thumb-friendly */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="#tailor"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-6 py-4 text-sm tracking-wide transition-all min-h-[52px]"
            >
              <Sparkles size={14} /> Reserve instantly
            </a>
            <Link
              to="/tours/$tourId/tailor"
              params={{ tourId: tour.id }}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-[color:var(--charcoal)]/25 hover:border-[color:var(--gold)] text-[color:var(--charcoal)] px-6 py-4 text-sm tracking-wide transition-all min-h-[52px]"
            >
              Make it yours
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
    { icon: <Check size={14} />, label: "No forms. No waiting." },
    {
      icon: <Star size={14} />,
      label: meta && meta.reviewCount > 0 ? `${meta.rating.toFixed(1)} · ${meta.reviewCount} reviews` : "Trusted local guide",
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
        <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-[color:var(--gold)]">
          Fits best · {tour.fitsBest}
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 4 · HIGHLIGHTS — clean bullets only
 * ════════════════════════════════════════════════════════════ */
function HighlightsBlock({ tour }: { tour: SignatureTour }) {
  return (
    <section className="pb-14 md:pb-16">
      <div className="container-x max-w-5xl">
        <div className="text-center mb-8">
          <Eyebrow flank>Highlights</Eyebrow>
          <SectionTitle size="compact">What you'll <SectionTitle.Em>actually do</SectionTitle.Em></SectionTitle>
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-4 max-w-3xl mx-auto">
          {(tour.highlights ?? []).map((h) => (
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
 * 5 · ITINERARY — visual timeline (real stops only)
 * ════════════════════════════════════════════════════════════ */
function ItineraryTimeline({ tour }: { tour: SignatureTour }) {
  const stops = tour.stops ?? [];
  return (
    <section className="py-14 md:py-20 bg-[color:var(--sand)]/40 border-y border-[color:var(--border)]">
      <div className="container-x max-w-5xl">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
          <div>
            <Eyebrow>Itinerary</Eyebrow>
            <SectionTitle size="compact">The story, <SectionTitle.Em>stop by stop</SectionTitle.Em></SectionTitle>
          </div>
          <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            {stops.length} chapters · in this order
          </span>
        </div>

        <ol className="relative space-y-8">
          {/* Vertical timeline rail */}
          <span
            className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[color:var(--gold)]/60 via-[color:var(--gold)]/30 to-transparent md:left-[19px]"
            aria-hidden
          />
          {stops.map((s, i) => (
            <li key={s.label + i} className="relative pl-12 md:pl-16">
              {/* Numbered marker on the rail */}
              <span className="absolute left-0 top-1 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-[color:var(--ivory)] border border-[color:var(--gold)] text-[12px] md:text-[13px] text-[color:var(--gold)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)]">
                {i + 1}
              </span>

              <div className="grid md:grid-cols-[1fr_1.4fr] gap-5 bg-[color:var(--card)] border border-[color:var(--border)] overflow-hidden">
                <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[180px] overflow-hidden">
                  <img
                    src={stopImage(s)}
                    alt={s.label}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: stopFocal(s) }}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <div className="p-5 md:py-6 md:pr-6 md:pl-0 flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--gold)]">
                    Chapter {i + 1}
                  </span>
                  <h3 className="serif text-xl md:text-2xl leading-snug mt-2">{s.label}</h3>
                  <p className="mt-2.5 text-[14px] text-[color:var(--charcoal-soft)] leading-relaxed">
                    {s.story}
                  </p>
                </div>
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
function RouteMap({ tour }: { tour: SignatureTour }) {
  const region = tour.seed.region ?? "lisbon";
  const points: (StopCoord & { idx: number; raw: TourStop })[] = (tour.stops ?? []).map(
    (s, i) => ({ ...snapStop(s.label, region, i), idx: i, raw: s }),
  );

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

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <section className="py-14 md:py-20">
      <div className="container-x max-w-5xl">
        <div className="text-center mb-8">
          <Eyebrow flank>The route</Eyebrow>
          <SectionTitle size="compact">Where the <SectionTitle.Em>day goes</SectionTitle.Em></SectionTitle>
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
              <pattern id={`rmap-grid-${tour.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
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
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 7 · INCLUDED + IDEAL FOR
 * ════════════════════════════════════════════════════════════ */
function IncludedAndIdeal({ tour }: { tour: SignatureTour }) {
  return (
    <section className="py-14 md:py-20 bg-[color:var(--ivory)] border-y border-[color:var(--border)]">
      <div className="container-x max-w-5xl grid md:grid-cols-2 gap-10 md:gap-14">
        <Block icon={<Check size={14} />} title="What's included">
          <ul className="space-y-3 text-[14.5px] leading-relaxed">
            {(tour.included ?? []).map((h) => (
              <li key={h} className="flex gap-2.5">
                <Check
                  size={15}
                  className="mt-0.5 text-[color:var(--teal)] flex-shrink-0"
                />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block icon={<Heart size={14} />} title="Who it's for">
          <ul className="space-y-3 text-[14.5px] leading-relaxed">
            {(tour.idealFor ?? []).map((h) => (
              <li key={h} className="flex gap-2.5">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[color:var(--teal)] flex-shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </Block>

        {(tour.notes?.length ?? 0) > 0 && (
          <div className="md:col-span-2">
            <Block icon={<Info size={14} />} title="Good to know">
              <ul className="space-y-2 text-[13.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                {(tour.notes ?? []).map((h) => (
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
}: {
  tour: SignatureTour;
  resolveImg: ReturnType<typeof useImportedTourImages>["resolveImg"];
}) {
  // Build gallery from real assets: tour gallery if present, otherwise stop images
  const seen = new Set<string>();
  const photos: { src: string; alt: string; focal?: string }[] = [];
  const push = (src: string, alt: string, focal?: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    photos.push({ src, alt, focal });
  };

  // Hero first
  const hero = resolveImg(tour, "hero");
  push(hero.src, tour.title, tour.focal);

  // Stop photos in order
  for (const s of tour.stops ?? []) {
    push(stopImage(s), s.label, stopFocal(s));
  }
  // Then any extra gallery shots
  for (const g of tour.gallery ?? []) {
    push(g, tour.title);
  }

  if (photos.length < 2) return null;

  return (
    <section className="py-14 md:py-20">
      <div className="container-x max-w-6xl">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <Eyebrow>Gallery</Eyebrow>
            <SectionTitle size="compact">Inside <SectionTitle.Em>the day</SectionTitle.Em></SectionTitle>
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
 * 10 · TAILOR — adjust details inside this Signature
 * ════════════════════════════════════════════════════════════ */
function TailorBlock({ tour }: { tour: SignatureTour }) {
  const adjustables = [
    "Pick your date and pickup time",
    "Set the pace — slower, balanced, or full",
    "Choose your guide language",
    "Swap between available stops within this tour",
    "Add small extras when offered (lunch, tasting, transfer)",
  ];
  return (
    <section
      id="tailor"
      className="py-14 md:py-20 bg-[color:var(--sand)]/50 scroll-mt-24 md:scroll-mt-28"
    >
      <div className="container-x max-w-6xl">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-start">
          <div>
            <Eyebrow>Make it yours</Eyebrow>
            <SectionTitle size="compact" spacing="loose">
              Keep the experience.
              <br />
              <SectionTitle.Em>Adjust the details.</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-5 text-[15px] text-[color:var(--charcoal-soft)] leading-relaxed max-w-lg">
              This Signature is designed as it is. You can fine-tune a few details
              inside this specific tour — without redesigning the day.
            </p>

            <ul className="mt-6 space-y-2.5 text-[14px]">
              {adjustables.map((a) => (
                <li key={a} className="flex gap-2.5">
                  <Check size={15} className="mt-0.5 text-[color:var(--teal)] flex-shrink-0" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[12px] italic text-[color:var(--charcoal-soft)] leading-relaxed max-w-md">
              Want to start from a blank page instead?{" "}
              <Link to="/builder" className="underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--teal)]">
                Open the Studio
              </Link>{" "}
              and build your own day.
            </p>
          </div>

          <SimpleTailorForm tour={tour} />
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 11 · REVIEWS / SOCIAL PROOF
 * ════════════════════════════════════════════════════════════ */
const TOUR_REVIEWS = [
  {
    quote:
      "Felt like a private day with a Portuguese friend who happens to know everyone. Nothing rushed, nothing generic.",
    name: "Sarah T.",
    location: "San Francisco",
    platform: "Google",
  },
  {
    quote:
      "We booked in five minutes, confirmed instantly, and the day exceeded every expectation. Quiet luxury done properly.",
    name: "Pierre L.",
    location: "Paris",
    platform: "TripAdvisor",
  },
  {
    quote:
      "Our small group felt completely cared for. Beautiful pace, beautiful stops, beautiful people.",
    name: "Akiko M.",
    location: "Tokyo",
    platform: "Trustpilot",
  },
];

function ReviewsBlock() {
  return (
    <section className="py-14 md:py-20 bg-[color:var(--charcoal-deep)] text-[color:var(--ivory)]">
      <div className="container-x max-w-6xl">
        <div className="text-center mb-10">
          <Eyebrow flank tone="onDark">What guests say</Eyebrow>
          <SectionTitle size="compact">
            700+{" "}
            <SectionTitle.Em className="text-[color:var(--gold-soft)]">5-star reviews</SectionTitle.Em>
          </SectionTitle>
        </div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {TOUR_REVIEWS.map((r) => (
            <figure
              key={r.name}
              className="bg-[color:var(--ivory)] text-[color:var(--charcoal)] p-6 md:p-7 flex flex-col"
            >
              <div className="flex gap-0.5 text-[color:var(--gold)] mb-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <blockquote className="serif text-[16px] md:text-[17px] leading-snug italic">
                "{r.quote}"
              </blockquote>
              <figcaption className="mt-5 pt-4 border-t border-[color:var(--border)] text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                {r.name} · {r.location}
                <span className="block mt-1 text-[color:var(--gold)] not-italic normal-case tracking-[0.18em]">
                  via {r.platform}
                </span>
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
        <Eyebrow flank tone="onDark">Ready when you are</Eyebrow>
        <SectionTitle size="default" spacing="loose" className="text-[color:var(--ivory)]">
          {tour.title.split("—")[0].trim()}
        </SectionTitle>
        <p className="serif italic font-light mt-4 text-lg md:text-xl text-[color:var(--ivory)]/85">
          Confirm in real time. The day is yours.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <CtaButton
            href="#tailor"
            variant="primary"
            iconLeading={<Sparkles size={14} aria-hidden="true" />}
          >
            Reserve instantly
          </CtaButton>
          <CtaButton
            to="/tours/$tourId/tailor"
            params={{ tourId: tour.id }}
            variant="ghostDark"
          >
            Make it yours
          </CtaButton>
        </div>

        <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-[color:var(--ivory)]/65">
          Instant confirmation · Secured on this site
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
        <SectionTitle size="compact">Other <SectionTitle.Em>Signature Experiences</SectionTitle.Em></SectionTitle>
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
