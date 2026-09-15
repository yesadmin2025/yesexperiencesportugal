import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Star } from "lucide-react";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import { signatureDurationLabel, signatureIncludesLunch } from "@/lib/tourContent";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { TourImage } from "@/components/tours/TourImage";
import ogImg from "@/assets/hero-coast.jpg";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";
import { CTA_LABELS } from "@/content/cta-vocabulary";

export const Route = createFileRoute("/experiences")({
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
  useMarketingMotion();
  const { resolveImg } = useImportedTourImages();

  return (
    <SiteLayout>
      <section className="pt-32 pb-[var(--section-y-sm)] bg-[color:var(--sand)] text-center">
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
          <p className="mt-5 max-w-2xl mx-auto text-[16px] md:text-[17px] leading-[1.7] text-[color:var(--charcoal-soft)]">
            See every Signature day in one collection. Reserve it as designed or tailor the details — both paths show the real price and confirm instantly.
          </p>
        </div>
      </section>

      <section className="reveal section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)]" aria-labelledby="signature-collection-title">
        <div className="container-x">
          <div className="mb-10 flex items-end justify-between gap-5 border-b border-[color:var(--border)] pb-5 md:mb-12">
            <h2 id="signature-collection-title" className="t-h3 text-[color:var(--charcoal)]">The full collection</h2>
            <PriceCurrencyChip />
          </div>
          <div className="experiences-editorial-grid grid gap-x-8 gap-y-10 md:grid-cols-2 md:gap-y-12 lg:gap-x-12 lg:gap-y-16">
            {signatureTours.map((tour, index) => (
              <TourCard key={tour.id} tour={tour} resolveImg={resolveImg} featured={index < 2} />
            ))}
          </div>
        </div>
      </section>

      <CtaStrip />
    </SiteLayout>
  );
}

type ResolveImg = ReturnType<typeof useImportedTourImages>["resolveImg"];

function TourCard({ tour, resolveImg, featured = false }: { tour: SignatureTour; resolveImg: ResolveImg; featured?: boolean }) {
  const meta = VIATOR_META[tour.id];

  return (
    <article className="reveal-stagger group flex min-w-0 flex-col border-b border-[color:var(--border)] pb-7 text-left transition-[border-color] duration-[var(--dur-quick)] hover:border-[color:var(--gold)] md:pb-9" aria-label={tour.title}>
      <Link
        to="/tours/$tourId"
        params={{ tourId: tour.id }}
        className="relative block overflow-hidden rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
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

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[color:var(--teal)]">
          <span>{tour.region}</span>
          <span aria-hidden="true" className="text-[color:var(--gold)]">·</span>
          <span>{tour.theme}</span>
          {signatureIncludesLunch(tour.id) && (
            <span className="ml-auto normal-case tracking-normal text-[color:var(--charcoal-soft)]">Lunch included</span>
          )}
        </div>

        <h3 className={`mt-3 font-serif font-medium leading-[1.14] tracking-normal text-[color:var(--charcoal)] ${featured ? "text-[1.5rem] md:text-[1.75rem]" : "text-[1.45rem] md:text-[1.55rem]"}`}>
          <Link
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
          >
            {tour.title}
          </Link>
        </h3>

        <p className="mt-3 line-clamp-3 text-[14px] leading-[1.55] text-[color:var(--charcoal-soft)] md:line-clamp-none md:text-[15px] md:leading-[1.65]">{tour.blurb}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[color:var(--charcoal)] md:mt-5">
          <span>{signatureDurationLabel(tour.id, tour.durationHours)}</span>
          <span aria-hidden="true" className="text-[color:var(--gold-ink)]">·</span>
          <span>Private</span>
          <span aria-hidden="true" className="text-[color:var(--gold-ink)]">·</span>
          <span className="whitespace-nowrap">From <PriceEur amountEur={tour.priceFrom} role="from" /> per person</span>
        </div>

        {meta && meta.reviewCount > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[color:var(--charcoal-soft)] md:mt-3">
            <Star size={11} className="text-[color:var(--gold-ink)]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            <span>{meta.rating.toFixed(1)} from {meta.reviewCount} reviews</span>
          </div>
        )}

        <div className="mt-auto pt-5 md:pt-6">
          <Link
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="inline-flex min-h-[44px] items-center font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--teal)] underline decoration-[color:var(--gold)]/60 underline-offset-4 transition-colors duration-[var(--dur-quick)] hover:text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            aria-label={`View ${tour.title}`}
          >
            View experience <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function CtaStrip() {
  return (
    <section className="reveal section-y-sm pt-0 bg-[color:var(--ivory)]">
      <div className="container-x">
        <div className="bg-[color:var(--teal)] text-[color:var(--ivory)] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 rounded-[6px]">
          <div>
            <h2 className="serif font-medium text-3xl md:text-4xl text-[color:var(--ivory)]">
              None of these feels <span className="italic font-normal text-[color:var(--ivory)]">quite right?</span>
            </h2>
            <p className="mt-3 text-[15px] md:text-[16px] leading-[1.65] text-[color:var(--ivory)]/88 max-w-lg">
              Build one private day around your mood, group and rhythm, then see the route and live price in the Studio.
            </p>
          </div>
          <CtaButton to="/studio-v3" variant="ghostDark" className="flex-shrink-0">
            {CTA_LABELS.studio}
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
