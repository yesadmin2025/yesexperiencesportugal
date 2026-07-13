import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Clock, MapPin, Star } from "lucide-react";
import { signatureTours } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { TourImage } from "@/components/tours/TourImage";
import ogImg from "@/assets/hero-coast.jpg";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";

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
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/experiences" }],
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
  const { resolveImg } = useImportedTourImages();
  return (
    <SiteLayout>
      <section
        data-audit="experiences-hero"
        className="pt-32 pb-[var(--section-y-sm)] bg-[color:var(--sand)] text-center"
      >
        <div className="container-x">
          <Eyebrow flank>Signature Collection</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Signature <SectionTitle.Em>Tours</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 max-w-xl mx-auto text-[color:var(--charcoal-soft)]">
            A curated collection of private Portugal days — Sintra, Arrábida, Évora and beyond. Book as designed, or quietly tailor a few details.
          </p>
        </div>
      </section>

      <section className="reveal section-y">
        <div className="container-x">
          <h2 className="sr-only">Our Signature Collection</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {signatureTours.map((t) => {
              // Rating + review count come from the matching Viator product.
              // When absent, the chip is simply not shown — never invented.
              const meta = VIATOR_META[t.id];
              const showRating =
                !!meta && meta.reviewCount > 0 && typeof meta.rating === "number";
              return (
                <article key={t.id} className="group flex flex-col text-left" aria-label={t.title}>
                  {/* Cover — clickable to source-of-truth detail page */}
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: t.id }}
                    className="lift-layer-sm relative block mb-5 shadow-[0_10px_30px_-20px_rgba(46,46,46,0.25)] group-hover:shadow-[0_28px_55px_-22px_rgba(41,91,97,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                    aria-label={`Open ${t.title}`}
                  >
                    <TourImage
                      {...resolveImg(t, "lg")}
                      alt={`${t.title} — private ${t.theme.toLowerCase()} experience in ${t.region}, Portugal`}
                      ratio="3/2"
                      focal={t.focal ?? "50% 50%"}
                      imgClassName="transition-transform duration-700 group-hover:scale-105"
                    >
                      <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.25em] bg-[color:var(--ivory)]/90 text-[color:var(--teal)] px-3 py-1.5">
                        {t.theme}
                      </span>
                    </TourImage>
                  </Link>

                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: t.id }}
                    className="serif text-2xl text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    {t.title}
                  </Link>

                  {/* Rating chip — sourced from Viator meta only. */}
                  {showRating && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-[color:var(--charcoal)]">
                      <Star
                        size={12}
                        fill="currentColor"
                        strokeWidth={0}
                        className="text-[color:var(--gold)]"
                        aria-hidden="true"
                      />
                      <span className="font-semibold">{meta!.rating.toFixed(1)}</span>
                      <span className="text-[color:var(--charcoal-soft)]">
                        · {meta!.reviewCount} reviews
                      </span>
                    </div>
                  )}

                  {/* Two-line teaser only — highlight bullets removed to
                      declutter the card; full bullets live on the detail
                      page. */}
                  <p
                    className="mt-3 text-[14px] text-[color:var(--charcoal-soft)] leading-relaxed line-clamp-2"
                  >
                    {t.blurb}
                  </p>

                  {/* Compact one-line meta strip — region · duration · from €X.
                      Uses middot separators so it stays on one line at 360px+. */}
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)] whitespace-nowrap overflow-hidden">
                    <MapPin size={11} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{t.region}</span>
                    <span aria-hidden="true">·</span>
                    <Clock size={11} className="shrink-0" aria-hidden="true" />
                    <span className="shrink-0">{t.durationHours}</span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0 text-[color:var(--charcoal)]">
                      From €{t.priceFrom}
                    </span>
                  </div>

                  {/* Dual CTAs — Reserve (confirm as designed) +
                      Tailor (adjust details inside this same Signature,
                      never a different tour). */}
                  <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                    <CtaButton
                      to="/tours/$tourId"
                      params={{ tourId: t.id }}
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      aria-label={`Reserve ${t.title}`}
                    >
                      Check availability & reserve
                    </CtaButton>
                    <CtaButton
                      to="/tours/$tourId/tailor"
                      params={{ tourId: t.id }}
                      variant="ghost"
                      size="sm"
                      className="flex-1"
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
            Start the Studio
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
