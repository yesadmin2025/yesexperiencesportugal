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
import { Scene } from "@/components/motion/Scene";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import { MaskReveal } from "@/components/motion/MaskReveal";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";

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
      // Reciprocal hreflang — the PT twin at /pt/experiences points back with the
      // identical set. Emitted from the shared helper so both stay in sync.
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
          items: signatureTours.map((t) => ({
            id: t.id,
            name: t.title,
            description: t.blurb,
            image: t.img,
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
      <Scene
        as="section"
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
          <ParallaxLayer amount="sm">
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
          </ParallaxLayer>
        </div>
      </Scene>

      <section className="reveal section-y">
        <div className="container-x">
          <h2 className="sr-only">Our Signature Collection</h2>
          <div className="mb-6 flex justify-end">
            <PriceCurrencyChip />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {signatureTours.map((t) => {
              const meta = VIATOR_META[t.id];
              const content = getTourContent(t.id);
              // Card bullets come from the curated moments file, which is
              // derived strictly from each tour's canonical
              // Source-of-Truth entry (highlights / included / real
              // stops). Every one of the 12 Signatures has a trio; the
              // canonical highlights remain as a safety net for any new
              // tour added before its trio exists.
              const topHighlights = (getSignatureCardMoments(t.id) ?? content.highlights).slice(
                0,
                3,
              );
              return (
                <article key={t.id} className="group flex flex-col text-left" aria-label={t.title}>
                  {/* Cover — clickable to source-of-truth detail page */}
                  <MaskReveal direction="diagonal" className="mb-5">
                    <Link
                      to="/tours/$tourId"
                      params={{ tourId: t.id }}
                      className="lift-layer-sm relative block shadow-[0_10px_30px_-20px_rgba(46,46,46,0.25)] group-hover:shadow-[0_28px_55px_-22px_rgba(41,91,97,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                      aria-label={`Open ${t.title}`}
                    >
                      <TourImage
                        {...resolveImg(t, "lg")}
                        alt={`${t.title} — private ${t.theme.toLowerCase()} experience in ${t.region}, Portugal`}
                        ratio="3/2"
                        focal={t.focal ?? "50% 50%"}
                        imgClassName="transition-transform duration-700 group-hover:scale-105"
                      >
                        <span className="absolute top-4 left-4 text-[12px] uppercase tracking-[0.12em] bg-[color:var(--ivory)]/90 text-[color:var(--teal)] px-3 py-1.5">
                          {t.theme}
                        </span>
                      </TourImage>
                    </Link>
                  </MaskReveal>

                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: t.id }}
                    className="serif text-2xl text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    {t.title}
                  </Link>
                  {/* Teaser — emotional lead BEFORE meta/price.
                      Hierarchy: title → story → highlights → fit →
                      duration/price (subdued) → CTAs. Price is
                      preserved for conversion but no longer dominates
                      the read. */}
                  <p className="mt-3 text-[14px] text-[color:var(--charcoal-soft)] leading-relaxed">
                    {t.blurb}
                  </p>

                  {/* Real highlights from `signatureTours[].highlights` —
                      sourced from the matching Viator product page.
                      Never invented. */}
                  {topHighlights.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-1.5 text-[13px] leading-[1.55] text-[color:var(--charcoal)]">
                      {topHighlights.map((h: string) => (
                        <li key={h} className="flex items-start gap-2">
                          <span
                            aria-hidden="true"
                            className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]"
                          />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* `fitsBest` removed — internal copy, not a Viator/Bókun
                      field. Card now exposes only data verifiable against
                      the live product page. */}

                  {/* Deterministic meta block — every card renders the
                      SAME sequence in the SAME rows, so a column of
                      Signatures reads as one aligned system on mobile.
                      Each row holds only items short enough to never wrap
                      at 360px, so no separator can ever be orphaned at a
                      line break:
                        row 1: ★ rating (reviews)  ·  duration
                        row 2: region
                        row 3: From €X per person
                        row 4: Lunch included (only when canonical) */}
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
                        <Clock size={11} /> {signatureDurationLabel(t.id, t.durationHours)}
                      </span>
                    </div>
                    <div className="flex min-h-[16px] items-center">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={11} className="shrink-0" /> {t.region}
                      </span>
                    </div>
                    <div className="flex min-h-[16px] items-center">
                      <span className="whitespace-nowrap text-[color:var(--charcoal)]">
                        From <PriceEur amountEur={t.priceFrom} role="from" />
                        <span className="ml-1 text-[12px] tracking-[0.12em] text-[color:var(--charcoal-soft)]">
                          per person
                        </span>
                      </span>
                    </div>
                    {signatureIncludesLunch(t.id) && (
                      /* Only when the canonical inclusions say so —
                         never inferred from the itinerary. */
                      <div className="flex min-h-[16px] items-center">
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-[color:var(--charcoal)]">
                          <UtensilsCrossed size={11} className="text-[color:var(--gold-ink)]" />
                          Lunch included
                        </span>
                      </div>
                    )}
                  </div>

                  {/* One filled primary (Reserve) + one subordinate
                      hairline link (Tailor this day) so the card never
                      presents two competing actions. Tailor still adjusts
                      details inside this same Signature, never another tour. */}
                  <div className="mt-5 flex flex-col gap-2.5">
                    <CtaButton
                      to="/tours/$tourId"
                      params={{ tourId: t.id }}
                      variant="primary"
                      size="sm"
                      aria-label={`Reserve ${t.title}`}
                    >
                      Check availability & reserve
                    </CtaButton>
                    <CtaButton
                      to="/tours/$tourId/tailor"
                      params={{ tourId: t.id }}
                      variant="hairline"
                      aria-label={`Tailor ${t.title}`}
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
    <Scene as="section" data-audit="experiences-cta" className="reveal section-y-sm pt-0">
      <div className="container-x">
        <div className="bg-[color:var(--teal)] text-[color:var(--ivory)] p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="scene-title serif text-3xl md:text-4xl text-[color:var(--ivory)]">
              Want to start from scratch?{" "}
              <span className="italic font-normal text-[color:var(--ivory)]">Open the Studio.</span>
            </h2>
            <p className="scene-body mt-3 text-[color:var(--ivory)]/80 max-w-lg">
              Start your way — with a place, a region or a feeling. We'll guide you as you build,
              shaping it within what works best on the ground.
            </p>
          </div>
          <CtaButton to="/studio-v3" variant="ghostDark" className="scene-cta flex-shrink-0">
            Open the Studio
          </CtaButton>
        </div>
      </div>
    </Scene>
  );
}
