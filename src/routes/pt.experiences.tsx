import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Clock, MapPin } from "lucide-react";
import { signatureTours } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import { getTourContent, signatureDurationLabel } from "@/lib/tourContent";
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

export const Route = createFileRoute("/pt/experiences")({
  head: () => ({
    meta: [
      { title: "Experiências Signature Privadas em Portugal | YES" },
      {
        name: "description",
        content:
          "Uma coleção editada de dias privados em Portugal — Sintra, Arrábida, Évora e mais. Reserve como desenhado, ou ajuste discretamente alguns detalhes.",
      },
      { property: "og:title", content: "Experiências Signature Privadas em Portugal | YES" },
      {
        property: "og:description",
        content:
          "Uma coleção editada de dias privados em Portugal — Sintra, Arrábida, Évora e mais.",
      },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt/experiences" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "YES Signature Experiences — dias privados em Portugal",
      },
      { property: "og:locale", content: "pt_PT" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/experiences" },
      ...localeAlternateLinks("/experiences"),
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Início", path: "/pt" },
          { name: "Experiências Signature", path: "/pt/experiences" },
        ]),
      ),
      jsonLdScript(
        itemListLd({
          name: "Signature Experiences",
          path: "/pt/experiences",
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
          <Eyebrow flank>Coleção Signature</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Signature <SectionTitle.Em>Tours</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 max-w-xl mx-auto text-[color:var(--charcoal-soft)]">
            Uma coleção editada de dias privados em Portugal — Sintra, Arrábida, Évora e mais.
            Reserve como desenhado, ou ajuste discretamente alguns detalhes.
          </p>
          <p className="mt-4 mx-auto max-w-xl text-[12px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
            As páginas detalhadas de cada tour estão, para já, disponíveis em inglês. A tradução
            editorial está em curso.
          </p>
        </div>
      </section>

      <section className="reveal section-y">
        <div className="container-x">
          <h2 className="sr-only">A nossa coleção Signature</h2>
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
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: tour.id }}
                    className="lift-layer-sm relative block mb-5 shadow-[0_10px_30px_-20px_rgba(46,46,46,0.25)] group-hover:shadow-[0_28px_55px_-22px_rgba(41,91,97,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                    aria-label={`Abrir ${tour.title}`}
                  >
                    <TourImage
                      {...resolveImg(tour, "lg")}
                      alt={`${tour.title} — experiência privada de ${tour.theme.toLowerCase()} em ${tour.region}, Portugal`}
                      ratio="3/2"
                      focal={tour.focal ?? "50% 50%"}
                      imgClassName="transition-transform duration-500 group-hover:scale-[1.025]"
                    >
                      <span className="absolute top-4 left-4 text-[12px] uppercase tracking-[0.16em] bg-[color:var(--ivory)]/90 text-[color:var(--teal)] px-3 py-1.5">
                        {tour.theme}
                      </span>
                    </TourImage>
                  </Link>

                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: tour.id }}
                    className="serif text-2xl text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    {tour.title}
                  </Link>
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

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)]">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={11} /> {tour.region}
                    </span>
                    <span aria-hidden="true" className="h-px w-2 bg-[color:var(--gold)]/55" />
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} /> {signatureDurationLabel(tour.id, tour.durationHours)}
                    </span>
                    <span aria-hidden="true" className="h-px w-2 bg-[color:var(--gold)]/55" />
                    <span className="text-[color:var(--charcoal)]">
                      A partir de <PriceEur amountEur={tour.priceFrom} role="from" />
                    </span>
                    {meta && meta.reviewCount > 0 ? (
                      <span className="sr-only">{meta.rating.toFixed(1)} de 5, {meta.reviewCount} avaliações</span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-col gap-2.5">
                    <CtaButton
                      to="/tours/$tourId"
                      params={{ tourId: tour.id }}
                      variant="primary"
                      size="sm"
                      aria-label={`Reservar ${tour.title}`}
                    >
                      Ver disponibilidade e reservar
                    </CtaButton>
                    <CtaButton
                      to="/tours/$tourId/tailor"
                      params={{ tourId: tour.id }}
                      variant="hairline"
                      size="sm"
                      aria-label={`Adaptar ${tour.title} ao seu dia`}
                    >
                      Adaptar este dia
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
              Quer começar do zero?{" "}
              <span className="italic font-normal text-[color:var(--ivory)]">Abra o Studio.</span>
            </h2>
            <p className="mt-3 text-[color:var(--ivory)]/80 max-w-lg">
              Comece à sua maneira — por um lugar, uma região ou um sentimento. Guiamo-lo enquanto
              constrói, dentro do que funciona melhor no terreno.
            </p>
          </div>
          <CtaButton to="/studio-v3" variant="ghostDark" className="flex-shrink-0">
            Abrir o Studio
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
