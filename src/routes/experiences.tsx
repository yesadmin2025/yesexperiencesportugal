import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Clock, MapPin, Star, UtensilsCrossed } from "lucide-react";
import { signatureTours } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import { getTourContent, signatureDurationLabel, signatureIncludesLunch } from "@/lib/tourContent";
import { getSignatureCardMoments } from "@/content/signature-card-moments";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { TourImage } from "@/components/tours/TourImage";
import ogImg from "@/assets/hero-coast.jpg";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";

/**
 * Signature listing is intentionally light on bespoke motion components.
 * The shared marketing-motion controller is already loaded on demand and
 * gives the route its restrained reveal behaviour; the cards themselves do
 * not need Scene/Parallax/MaskReveal runtimes in the critical route chunk.
 */
export const Route = createFileRoute("/experiences")({
  head: () => ({
    meta: [
      { title: "Signature Private Experiences in Portugal | YES" },
      {
        name: "description",
        content:
          "A curated collection of private Portugal days — Sintra, Arrábida, Évora and beyond. Book as designed, or quietly tailor a few details.",
      },
      { property: "og:title", content: "Signature Private Experiences in Portugal | YES" },
      {
        property: "og:description",
        content:
          "A curated collection of private Portugal days — Sintra, Arrábida, Évora and beyond. Book as designed, or quietly tailor a few details.",
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
      <section
        data-audit="experiences-hero"
        className="pt-32 pb-[var(--section-y-sm)] bg-[color:var(--sand)] text-center"
      >
        <div className="container-x">
          <SiteBreadcrumbs
            containerClassName=""
            className="bg-transparent pt-0 pb-6 text-left"
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Signature Experiences", path: "/experiences" },
            ]}
          />
          <div className="scene-atmosphere">
            <Eyebrow flank>Signature Collection</Eyebrow>
          </div>
          <SectionTitle as="h1" size="anchor" spacing="loose" className="scene-title">
            Signature <SectionTitle.Em>Tours</SectionTitle.Em>
          </SectionTitle>
          <p className="scene-body mt-5 max-w-xl mx-auto text-[color:var(--charcoal-soft)]">
            A curated collection of private Portugal days — Sintra, Arrábida, Évora and beyond.
            Book as designed, or quietly tailor a few details.
          </p>
        </div>
      </section>

      <section className="reveal section-y">
        <div className="container-x">
          <h2 className="sr-only">Our Signature Collection</h2>
          <div className="mb-6 flex justify-end">
            <PriceCurrencyChip />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {signatureTours.map((tour) => {
              const meta = VIATOR_META[tour.id];
              const content = getTourContent(tour.id);
              const topHighlights = (getSignatureCardMoments(tour.id) ?? content.highlights).slice(0, 3);

              return (
                <article key={tour.id} className="group flex flex-col text-left" aria-label={tour.title}>
                  <div className="mb-5 overflow-hidden">
                    <Link
                      to="/tours/$tourId"
                      params={{ tourId: tour.id }}
                      className="lift-layer-sm relative block shadow-[0_10px_30px_-20px_rgba(46,46,46,0.25)] group-hover:shadow-[0_28px_55px_-22px_rgba(41,91,97,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                      aria-label={`Open ${tour.title}`}
                    >
                      <TourImage
                        {...resolveImg(tour, "lg")}
                        alt={`${tour.title} — private ${tour.theme.toLowerCase()} experience in ${tour.region}, Portugal`}
                        ratio="3/2"
                        focal={tour.focal ?? "50% 50%"}
                        imgClassName="transition-transform duration-500 group-hover:scale-[1.025]"
                      >
                        <span className="absolute top-4 left-4 text-[12px] uppercase tracking-[0.12em] bg-[color:var(--ivory)]/90 text-[color:var(--teal)] px-3 py-1.5">
                          {tour.theme}
                        </span>
                      </TourImage>
                    </Link>
                  </div>

                  <h3 className="serif text-2xl">
                    <Link
                      to="/tours/$tourId"
                      params={{ tourId: tour.id }}
                      className="text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                      {tour.title}
                    </Link>
                  </h3>

                  <p className="mt-3 text-[14px] text-[color:var(--charcoal-soft)] leading-relaxed">
                    {tour.blurb}
                  </p>

                  {topHighlights.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-1.5 text-[13px] leading-[1.55] text-[color:var(--charcoal)]">
                      {topHighlights.map((highlight: string) => (
                        <li key={highlight} className="flex items-start gap-2">
                          <span
                            aria-hidden="true"
                            className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]"
                          />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex flex-col gap-1.5 text-[12px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
                    <div className="flex min-h-[16px] items-center gap-x-2.5">
                      {meta && meta.reviewCount > 0 && (
                        <>
                          <span className="flex items-center gap-1.5 whitespace-nowrap text-[color:var(--charcoal)]">
                            <Star
                              size={12}
                              className="text-[color:var(--gold-ink)]"
                              fill="currentColor"
                              strokeWidth={0}
                              aria-hidden="true"
                            />
                            <span className="tabular-nums font-medium text-[color:var(--gold-ink)]">
                              {meta.rating.toFixed(1)}
                            </span>
                            <span className="text-[color:var(--charcoal-soft)]">
                              (<span className="tabular-nums">{meta.reviewCount}</span>
                              <span className="sr-only"> reviews</span>)
                            </span>
                          </span>
                          <span aria-hidden="true" className="h-px w-2 bg-[color:var(--gold)]/55" />
                        </>
                      )}
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={11} /> {signatureDurationLabel(tour.id, tour.durationHours)}
                      </span>
                    </div>
                    <div className="flex min-h-[16px] items-center">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={11} className="shrink-0" /> {tour.region}
                      </span>
                    </div>
                    <div className="flex min-h-[16px] items-center">
                      <span className="whitespace-nowrap text-[color:var(--charcoal)]">
                        From <PriceEur amountEur={tour.priceFrom} role="from" />
                        <span className="ml-1 text-[12px] tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                          per person
                        </span>
                      </span>
                    </div>
                    {signatureIncludesLunch(tour.id) && (
                      <div className="flex min-h-[16px] items-center">
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-[color:var(--charcoal)]">
                          <UtensilsCrossed size={11} className="text-[color:var(--gold-ink)]" />
                          Lunch included
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col gap-2.5">
                    <CtaButton
                      to="/tours/$tourId"
                      params={{ tourId: tour.id }}
                      variant="primary"
                      size="sm"
                      aria-label={`Reserve ${tour.title}`}
                    >
                      Check availability & reserve
                    </CtaButton>
                    <CtaButton
                      to="/tours/$tourId/tailor"
                      params={{ tourId: tour.id }}
                      variant="hairline"
                      aria-label={`Tailor ${tour.title}`}
                    >
                      Tailor this day
                    </CtaButton>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <CtaStrip />
    </SiteLayout>
  );
}

function CtaStrip() {
  return (
    <section data-audit="experiences-cta" className="reveal section-y-sm pt-0">
      <div className="container-x">
        <div className="bg-[color:var(--teal)] text-[color:var(--ivory)] p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="serif text-3xl md:text-4xl text-[color:var(--ivory)]">
              Want to start from scratch?{" "}
              <span className="italic font-normal text-[color:var(--ivory)]">Open the Studio.</span>
            </h2>
            <p className="mt-3 text-[color:var(--ivory)]/80 max-w-lg">
              Start your way — with a place, a region or a feeling. We'll guide you as you build,
              shaping it within what works best on the ground.
            </p>
          </div>
          <CtaButton to="/studio-v3" variant="ghostDark" className="flex-shrink-0">
            Open the Studio
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
