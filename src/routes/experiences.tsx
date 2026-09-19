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
import { CtaButton, CtaMotionArrow } from "@/components/ui/CtaButton";
import { Scene } from "@/components/motion/Scene";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";
import { CTA_LABELS } from "@/content/cta-vocabulary";
import { getViatorMeta } from "@/data/signatureToursViator";
import { Star } from "lucide-react";
import { listPublishedExperienceContent } from "@/lib/experienceContent.functions";
import { CompareControl, ExperienceCompare } from "@/components/experiences/ExperienceCompare";

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
  const toggleComparison = (id: string) => {
    setSelectedTours((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 2 ? [...current, id] : current);
  };

  return (
    <SiteLayout>
      <section className="reveal pt-32 pb-14 md:pb-20 bg-[color:var(--sand)] text-center">
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
          <p className="mt-6 max-w-[58ch] mx-auto text-[16px] md:text-[17px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            Every Signature can be reserved as designed, or tailored around your pace, interests and
            group.
          </p>
          <div className="mt-7 flex justify-center">
            <PriceCurrencyChip />
          </div>
        </div>
      </section>

      <section
        className="reveal section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)]"
        aria-label="Signature collection"
      >
        <div className="container-x">
          <Scene className="experiences-editorial-grid experiences-story grid gap-x-10 gap-y-14 md:grid-cols-2 md:gap-y-18 lg:gap-x-16 lg:gap-y-24">
            {tours.map((tour, index) => (
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
  const highlights = tour.highlights.slice(0, 3);
  // Fourth decision fact, read straight from the tour source of truth.
  const idealFor = tour.idealFor?.[0];
  return (
    <article
      className="experience-editorial-card scene-item group flex min-w-0 flex-col text-left"
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

      <div className="experience-card-content flex flex-1 flex-col border-b border-[color:var(--border)] pb-8 pt-6 md:pb-10">
        <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--teal)]">
          <span>{tour.region}</span>
          <span aria-hidden="true" className="text-[color:var(--gold)]">
            ·
          </span>
          <span>{tour.theme}</span>
        </div>
        <CompareControl active={compareActive} disabled={compareDisabled} onClick={onCompare} title={tour.title} />
        </div>

        <h3
          className="experience-card-title editorial-title-safe t-h3 mt-3 font-serif font-medium tracking-normal text-[color:var(--charcoal)]"
        >
          <Link
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
          >
            {tour.title}
          </Link>
        </h3>

        <p className="experience-card-promise mt-3 text-[14px] leading-[1.6] text-[color:var(--charcoal-soft)] md:text-[15px] md:leading-[1.65]">
          {teaser}
        </p>

        {verifiedRating && verifiedReviewCount && verifiedReviewCount > 0 && (
          <div
            className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[color:var(--charcoal)]"
            aria-label={`${verifiedRating.toFixed(1)} out of 5, ${verifiedReviewCount} reviews`}
          >
            <Star
              size={13}
              fill="currentColor"
              strokeWidth={0}
              className="text-[color:var(--gold)]"
              aria-hidden="true"
            />
            <span className="font-semibold">{verifiedRating.toFixed(1)}</span>
            <span className="text-[color:var(--charcoal-soft)]">
              · {verifiedReviewCount} reviews
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-serif text-[1.2rem] font-semibold text-[color:var(--charcoal)]">
            From <PriceEur amountEur={tour.priceFrom} role="from" /> per person
          </span>
          <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)]">
            {signatureDurationLabel(tour.id, tour.durationHours)}
          </span>
        </div>

        {idealFor && (
          <p className="experience-card-ideal mt-2 text-[13px] leading-[1.5] text-[color:var(--charcoal-soft)]">
            <span className="font-medium text-[color:var(--charcoal)]">Ideal for:</span> {idealFor}
          </p>
        )}

        {highlights.length > 0 && (
          <ul className="experience-card-highlights mt-4 space-y-2 text-[13.5px] leading-[1.5] text-[color:var(--charcoal)]">
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

        <div className="experience-card-action mt-auto pt-5 md:pt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="editorial-action group/link relative inline-flex min-h-[44px] items-center gap-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--charcoal)] transition-colors duration-[var(--dur-quick)] hover:text-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
            aria-label={`See dates and reserve — ${tour.title}`}
          >
            See dates &amp; reserve <CtaMotionArrow />
          </Link>
        </div>
      </div>
    </article>
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
          <CtaButton to="/studio-v3" variant="ghost" className="flex-shrink-0">
            {CTA_LABELS.studio}
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
