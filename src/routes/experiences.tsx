import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { breadcrumbLd, itemListLd, jsonLdScript, organizationUsCaAudienceLd } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { getTourContent, signatureDurationLabel } from "@/lib/tourContent";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { TourImage } from "@/components/tours/TourImage";
import ogImg from "@/assets/hero-coast.jpg";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { Scene } from "@/components/motion/Scene";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";
import { CTA_LABELS } from "@/content/cta-vocabulary";
import { getViatorMeta } from "@/data/signatureToursViator";
import { Star } from "lucide-react";
import { listPublishedExperienceContent } from "@/lib/experienceContent.functions";
import { CompareControl, ExperienceCompare } from "@/components/experiences/ExperienceCompare";

const EXPERIENCE_FILTERS = [
  { id: "all", label: "All" },
  { id: "wine-food", label: "Wine & food" },
  { id: "coast", label: "Coast" },
  { id: "heritage", label: "Heritage" },
] as const;

type ExperienceFilter = (typeof EXPERIENCE_FILTERS)[number]["id"];

function matchesExperienceFilter(tour: SignatureTour, filter: ExperienceFilter) {
  if (filter === "all") return true;
  if (filter === "wine-food") return tour.theme === "Wine" || tour.theme === "Gastronomy";
  if (filter === "coast") return tour.theme === "Coastal";
  return tour.theme === "Heritage";
}

export const Route = createFileRoute("/experiences")({
  loader: async () => ({ contentOverrides: await listPublishedExperienceContent() }),
  head: () => ({
    meta: [
      { title: "Signature Private Tours in Portugal — Designed by Locals" },
      {
        name: "description",
        content:
          "Signature private days in Portugal — Sintra, Arrábida, Évora and the coast. Book as designed or tailor the details. Hotel pickup, instant confirmation.",
      },
      { property: "og:title", content: "Signature Private Tours in Portugal — Designed by Locals" },
      {
        property: "og:description",
        content:
          "Signature private days in Portugal — Sintra, Arrábida, Évora and the coast. Book as designed or tailor the details. Hotel pickup, instant confirmation.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/experiences" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "YES Signature Experiences — private Portugal days" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/experiences" },
      ...localeAlternateLinks("/experiences"),
    ],
    scripts: [
      jsonLdScript(organizationUsCaAudienceLd()),
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Signature Experiences", path: "/experiences" },
        ]),
      ),
      jsonLdScript(
        itemListLd({
          name: "Signature Experiences",
          path: "/experiences",
          items: signatureTours.map((tour) => ({
            id: tour.id,
            name: tour.title,
            description: tour.blurb,
            image: tour.img,
          })),
        }),
      ),
    ],
  }),
  component: ExperiencesPage,
});

function ExperiencesPage() {
  const { contentOverrides } = Route.useLoaderData();
  useMarketingMotion();
  const { resolveImg } = useImportedTourImages();
  const [selectedTours, setSelectedTours] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ExperienceFilter>("all");
  const tours = signatureTours.map((tour) => {
    const canonicalContent = getTourContent(tour.id);
    const override = contentOverrides.find((row) => row.tourId === tour.id);
    return override
      ? {
          ...tour,
          blurb: override.blurb ?? tour.blurb,
          highlights: override.highlights ?? canonicalContent.highlights,
        }
      : { ...tour, highlights: canonicalContent.highlights };
  });
  const visibleTours = tours.filter((tour) => matchesExperienceFilter(tour, activeFilter));

  const toggleComparison = (id: string) => {
    setSelectedTours((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 2 ? [...current, id] : current);
  };

  return (
    <SiteLayout>
      <section className="page-hero text-center">
        <div className="container-x">
          <SiteBreadcrumbs
            containerClassName=""
            className="bg-transparent pt-0 pb-6 text-left"
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Signature Experiences", path: "/experiences" },
            ]}
          />
          <Eyebrow flank>Signature Collection</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Private days, <SectionTitle.Em>ready when you are.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-3 max-w-[52ch] mx-auto text-[15px] md:text-[16px] leading-[1.65] text-[color:var(--charcoal-soft)]">
            Choose a private day, see the price and reserve it as designed. Prefer a different pace?
            Tailor the same experience around your group.
          </p>
          <div className="mt-5 flex justify-center">
            <PriceCurrencyChip />
          </div>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
            Private · Hotel pickup · Local support · Secure checkout
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Filter Signature Experiences">
            {EXPERIENCE_FILTERS.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`min-h-[38px] rounded-full border px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] ${
                    active
                      ? "border-[color:var(--teal)] bg-[color:var(--teal)] text-white"
                      : "border-[color:var(--border)] bg-[color:var(--ivory)] text-[color:var(--charcoal)] hover:border-[color:var(--gold)]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="reveal section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)]"
        aria-label="Signature collection"
      >
        <div className="container-x">
          <Scene className="experiences-editorial-grid experiences-story grid gap-6 md:grid-cols-2 md:gap-7 lg:gap-8">
            {visibleTours.map((tour, index) => (
              <TourCard key={tour.id} tour={tour} resolveImg={resolveImg} featured={index < 2} compareActive={selectedTours.includes(tour.id)} compareDisabled={selectedTours.length >= 2 && !selectedTours.includes(tour.id)} onCompare={() => toggleComparison(tour.id)} />
            ))}
          </Scene>
          <ExperienceCompare tours={tours} selected={selectedTours} onToggle={toggleComparison} onClear={() => setSelectedTours([])} />
        </div>
      </section>

      <CtaStrip />
    </SiteLayout>
  );
}

type ResolveImg = ReturnType<typeof useImportedTourImages>["resolveImg"];

function TourCard({
  tour,
  resolveImg,
  featured = false,
  compareActive,
  compareDisabled,
  onCompare,
}: {
  tour: SignatureTour;
  resolveImg: ResolveImg;
  featured?: boolean;
  compareActive: boolean;
  compareDisabled: boolean;
  onCompare: () => void;
}) {
  // Teaser reads through the tour-content getter so the collection stays
  // source-of-truth with the experience detail page.
  const content = getTourContent(tour.id);
  const rawTeaser = tour.blurb ?? content.overview ?? "";
  // One complete idea per card. Previously clamped to two lines, which cut the
  // sentence mid-word; instead we keep the first full sentence so nothing is
  // visually truncated and the rest lives on the experience page.
  const firstSentence = rawTeaser.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? rawTeaser.trim();
  const teaser = firstSentence.length > 0 ? firstSentence : rawTeaser;
  const meta = getViatorMeta(tour.id);
  const verifiedRating = meta?.rating;
  const verifiedReviewCount = meta?.reviewCount;
  const highlights = tour.highlights.slice(0, 2);
  // Fourth decision fact, read straight from the tour source of truth.
  const idealFor = tour.idealFor?.[0];
  return (
    <article
      className="experience-editorial-card scene-item group flex min-w-0 flex-col overflow-hidden rounded-[4px] border border-[color:var(--border)] bg-[color:var(--ivory)] text-left shadow-[var(--shadow-card)]"
      data-experience-position={featured ? "lead" : "collection"}
      aria-label={tour.title}
    >
      <Link
        to="/tours/$tourId"
        params={{ tourId: tour.id }}
        className="experience-card-image relative block overflow-hidden rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
        aria-label={`Open ${tour.title}`}
      >
        <TourImage
          {...resolveImg(tour, featured ? "lg" : "md")}
          alt={`${tour.title} — private ${tour.theme.toLowerCase()} experience in ${tour.region}, Portugal`}
          ratio="3/2"
          priority={featured}
          focal={tour.focal ?? "50% 50%"}
          imgClassName="transition-transform duration-[var(--dur-slow)] ease-[var(--ease-premium)] group-hover:scale-[1.02]"
        />
      </Link>

      <div className="experience-card-content flex flex-1 flex-col px-5 pb-5 pt-5 md:px-6 md:pb-6 md:pt-6">
        <h3
          className="experience-card-title t-h3 text-[color:var(--charcoal)] md:min-h-[3.1rem]"
        >
          <Link
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
          >
            {tour.title}
          </Link>
        </h3>

        <ExperienceCardMeta
          rating={verifiedRating}
          reviewCount={verifiedReviewCount}
          duration={signatureDurationLabel(tour.id, tour.durationHours)}
          location={tour.region}
        />

        <p className="experience-card-promise mt-4 text-[14px] leading-[1.58] text-[color:var(--charcoal-soft)] md:min-h-[2.9rem] md:text-[14.5px] md:leading-[1.62]">
          {teaser}
        </p>

        <div className="mt-3">
          <span className="font-sans text-[1.125rem] font-semibold text-[color:var(--charcoal)]">
            From <PriceEur amountEur={tour.priceFrom} role="from" /> per person
          </span>
        </div>

        {idealFor && (
          <p className="experience-card-ideal mt-2 text-[13px] leading-[1.5] text-[color:var(--charcoal-soft)]">
            <span className="font-medium text-[color:var(--charcoal)]">Ideal for:</span> {idealFor}
          </p>
        )}

        {highlights.length > 0 && (
          <ul className="experience-card-highlights mt-3 space-y-1.5 text-[13px] leading-[1.5] text-[color:var(--charcoal)]">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2">
                <span
                  aria-hidden="true"
                   className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-[color:var(--teal)]"
                />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="experience-card-action mt-auto pt-4 md:pt-5">
          <CtaButton
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            variant="primary"
            size="sm"
            className="w-full"
            aria-label={`See dates and reserve — ${tour.title}`}
          >
            {CTA_LABELS.signatureCardBooking}
          </CtaButton>
          <CtaButton
            to="/tours/$tourId/tailor"
            params={{ tourId: tour.id }}
            variant="hairline"
            className="mt-2 w-full justify-between"
            aria-label={`Tailor this day — ${tour.title}`}
          >
            {CTA_LABELS.tailor}
          </CtaButton>
          <div className="mt-1 hidden justify-end md:flex">
            <CompareControl
              active={compareActive}
              disabled={compareDisabled}
              onClick={onCompare}
              title={tour.title}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function ExperienceCardMeta({
  rating,
  reviewCount,
  duration,
  location,
}: {
  rating?: number;
  reviewCount?: number;
  duration: string | null;
  location?: string;
}) {
  const hasReviews = Boolean(rating && reviewCount && reviewCount > 0);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[color:var(--border)] pb-3 font-sans text-[12px] text-[color:var(--charcoal-soft)]">
      {hasReviews ? (
        <span
          className="inline-flex items-center gap-1 text-[color:var(--charcoal)]"
          aria-label={`${rating?.toFixed(1)} out of 5, ${reviewCount} reviews`}
        >
          <Star
            size={12}
            fill="currentColor"
            strokeWidth={0}
            className="text-[color:var(--gold)]"
            aria-hidden="true"
          />
          <strong>{rating?.toFixed(1)}</strong>
          <span className="text-[color:var(--charcoal-soft)]">({reviewCount})</span>
        </span>
      ) : (
        <span className="text-[color:var(--charcoal-soft)]">New</span>
      )}
      {duration ? <span>{duration}</span> : null}
      {location ? <span>{location}</span> : null}
    </div>
  );
}

function CtaStrip() {
  return (
    <section className="reveal section-y bg-[color:var(--sand)] border-t border-[color:var(--border)]">
      <div className="container-x">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-7 md:flex-row md:items-center">
          <div>
            <SectionTitle spacing="tight">
              None of these feels{" "}
              <SectionTitle.Em>quite right?</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-3 text-[15px] md:text-[16px] leading-[1.65] text-[color:var(--charcoal-soft)] max-w-lg">
              Build one private day around your mood, group and rhythm, then see the route and live
              price in the Studio.
            </p>
          </div>
          <CtaButton to="/studio-v3" variant="primary" className="flex-shrink-0">
            {CTA_LABELS.studio}
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
