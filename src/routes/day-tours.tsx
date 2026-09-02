import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { SiteBreadcrumbs } from "@/components/SiteBreadcrumbs";
import { Clock, MapPin, Star } from "lucide-react";
import { signatureTours } from "@/data/signatureTours";
import { getViatorMeta } from "@/data/signatureToursViator";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { ImageQualityToggle } from "@/components/ImageQualityToggle";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { TourImage } from "@/components/tours/TourImage";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { ParallaxLayer } from "@/components/motion/ParallaxLayer";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";
import { signatureDurationLabel } from "@/lib/tourContent";
import ogSocialImg from "@/assets/hero-coast.jpg";

export const Route = createFileRoute("/day-tours")({
  head: () => ({
    meta: [
      { title: "Day Tours — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Private day experiences across Portugal — Arrábida, Setúbal, Sintra, Évora, Douro and more. Reserve instantly, with real-time confirmation.",
      },
      { property: "og:title", content: "Day Tours — YES Experiences Portugal" },
      {
        property: "og:description",
        content:
          "Private day experiences across Portugal — Arrábida, Setúbal, Sintra, Évora, Douro and more.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/day-tours" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogSocialImg}` },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogSocialImg}` },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/day-tours" },
      // Reciprocal hreflang — the PT twin at /pt/day-tours points back with the
      // identical set. Emitted from the shared helper so both stay in sync.
      ...localeAlternateLinks("/day-tours"),
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Day Tours", path: "/day-tours" },
        ]),
      ),
      jsonLdScript(
        itemListLd({
          name: "Private day tours from Lisbon",
          path: "/day-tours",
          items: signatureTours
            .filter((t) => !/days?/i.test(t.duration) || /half|full|long/i.test(t.duration))
            .map((t) => ({ id: t.id, name: t.title, description: t.blurb, image: t.img })),
        }),
      ),
    ],
  }),

  component: DayToursPage,
});

const dayTours = signatureTours.filter(
  (t) => !/days?/i.test(t.duration) || /half|full|long/i.test(t.duration),
);

function DayToursPage() {
  useMarketingMotion();
  const { resolveImg } = useImportedTourImages();
  return (
    <SiteLayout>
      <section className="reveal pt-32 pb-12 bg-[color:var(--sand)] text-center">
        <div className="container-x">
            <SiteBreadcrumbs
              containerClassName=""
              className="bg-transparent pt-0 pb-6 text-left"
              crumbs={[
                { name: "Home", path: "/" },
                { name: "Day Tours", path: "/day-tours" },
              ]}
            />
          <ParallaxLayer amount="sm">
            <Eyebrow flank>Half &amp; Full Day</Eyebrow>
            <SectionTitle as="h1" size="anchor" spacing="loose">
              Day <SectionTitle.Em>Tours</SectionTitle.Em>
            </SectionTitle>
            <p className="mt-5 max-w-xl mx-auto text-[color:var(--charcoal-soft)]">
              Private guides, refined pace, and the parts of Portugal you'll remember most. Reserve
              instantly — or adjust a few details within the experience to match your rhythm.
            </p>
          </ParallaxLayer>
        </div>
      </section>

      <section className="reveal py-16 md:py-20">
        <div className="container-x">
          <h2 className="sr-only">Available Day Tours</h2>
          <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
            <PriceCurrencyChip />
            <ImageQualityToggle />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {dayTours.map((t) => {
              const meta = getViatorMeta(t.id);
              return (
                <article key={t.id} className="group flex flex-col text-left" aria-label={t.title}>
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: t.id }}
                    className="lift-layer-sm relative block mb-5 shadow-[0_10px_30px_-20px_rgba(46,46,46,0.25)] group-hover:shadow-[0_28px_55px_-22px_rgba(41,91,97,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                    aria-label={`Open ${t.title}`}
                  >
                    <TourImage
                      {...resolveImg(t, "lg")}
                      alt={`${t.title} — private day tour in ${t.region}, Portugal (${t.theme})`}
                      ratio="3/2"
                      focal={t.focal ?? "50% 50%"}
                      imgClassName="group-hover:scale-105 transition-transform duration-700"
                    >
                      <span className="absolute top-4 right-4 text-[10px] uppercase tracking-[0.22em] bg-[color:var(--gold)]/95 text-[color:var(--charcoal)] px-3 py-1.5">
                        Tailored Signature
                      </span>
                    </TourImage>
                  </Link>

                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--charcoal)]">
                    {t.region}
                  </p>
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: t.id }}
                    className="serif text-2xl mt-2 text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    {t.title}
                  </Link>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} /> {signatureDurationLabel(t.id, t.durationHours)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} /> {t.theme}
                    </span>
                    <span className="text-[color:var(--teal)]">
                      From <PriceEur amountEur={t.priceFrom} role="from" />
                      <span className="ml-1 text-[10px] tracking-[0.18em] text-[color:var(--charcoal-soft)]">
                        per person
                      </span>
                    </span>
                  </div>

                  {meta && meta.reviewCount > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-[color:var(--charcoal-soft)] tabular-nums">
                      <Star
                        size={13}
                        className="text-[color:var(--gold)] fill-[color:var(--gold)]"
                        strokeWidth={0}
                      />
                      <span>
                        <span className="text-[color:var(--charcoal)] font-medium">
                          {meta.rating.toFixed(1)}
                        </span>
                        {" · "}
                        {meta.reviewCount} reviews
                        <span className="text-[color:var(--charcoal-soft)]">
                          {" "}
                          · Tripadvisor &amp; Viator
                        </span>
                      </span>
                    </div>
                  )}

                  <p className="mt-3 text-sm text-[color:var(--charcoal-soft)] leading-relaxed">
                    {t.blurb}
                  </p>

                  <CtaButton
                    to="/tours/$tourId"
                    params={{ tourId: t.id }}
                    variant="ghost"
                    size="sm"
                    className="mt-5 self-start"
                  >
                    View experience &amp; reserve
                  </CtaButton>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
