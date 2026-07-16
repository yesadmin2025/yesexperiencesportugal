import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, itemListLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { Clock, MapPin } from "lucide-react";
import { signatureTours } from "@/data/signatureTours";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { ImageQualityToggle } from "@/components/ImageQualityToggle";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { TourImage } from "@/components/tours/TourImage";

import { useMarketingMotion } from "@/hooks/use-marketing-motion";

const TITLE = "Experiências de um Dia — YES Experiences Portugal";
const DESCRIPTION =
  "Experiências privadas de um dia por Portugal — Arrábida, Setúbal, Sintra, Évora, Douro e outras. Reserva com confirmação em tempo real.";

export const Route = createFileRoute("/pt/day-tours")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt/day-tours" },
      { property: "og:locale", content: "pt_PT" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/day-tours" },
      { rel: "alternate", hrefLang: "en", href: "https://yesexperiencesportugal.com/day-tours" },
      { rel: "alternate", hrefLang: "pt-PT", href: "https://yesexperiencesportugal.com/pt/day-tours" },
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Início", path: "/pt" },
          { name: "Experiências de um Dia", path: "/pt/day-tours" },
        ]),
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
          <Eyebrow flank>Meio dia &amp; Dia inteiro</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Experiências <SectionTitle.Em>de um dia</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 max-w-xl mx-auto text-[color:var(--charcoal-soft)]">
            Guias privados, ritmo cuidado e as partes de Portugal que se recordam melhor.
            Reserve em tempo real — ou ajuste alguns detalhes dentro da experiência para
            se adaptar ao seu ritmo.
          </p>
          <p className="mt-4 text-xs text-[color:var(--charcoal-soft)]">
            As páginas detalhadas de cada experiência estão, para já, disponíveis em inglês.
          </p>
        </div>
      </section>

      <section className="reveal py-16 md:py-20">
        <div className="container-x">
          <h2 className="sr-only">Experiências de um dia disponíveis</h2>
          <div className="flex justify-end mb-6">
            <ImageQualityToggle />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {dayTours.map((t) => (
              <article key={t.id} className="group flex flex-col text-left" aria-label={t.title}>
                <Link
                  to="/tours/$tourId"
                  params={{ tourId: t.id }}
                  className="lift-layer-sm relative block mb-5 shadow-[0_10px_30px_-20px_rgba(46,46,46,0.25)] group-hover:shadow-[0_28px_55px_-22px_rgba(41,91,97,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                  aria-label={`Abrir ${t.title}`}
                >
                  <TourImage
                    {...resolveImg(t, "lg")}
                    alt={`${t.title} — experiência privada de um dia em ${t.region}, Portugal`}
                    ratio="3/2"
                    focal={t.focal ?? "50% 50%"}
                    imgClassName="group-hover:scale-105 transition-transform duration-700"
                  >
                    <span className="absolute top-4 right-4 text-[10px] uppercase tracking-[0.22em] bg-[color:var(--gold)]/95 text-[color:var(--charcoal)] px-3 py-1.5">
                      Signature à medida
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
                    <Clock size={12} /> {t.durationHours}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} /> {t.theme}
                  </span>
                  <span className="text-[color:var(--teal)]">Desde €{t.priceFrom}</span>
                </div>

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
                  Ver experiência &amp; reservar
                </CtaButton>
              </article>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
