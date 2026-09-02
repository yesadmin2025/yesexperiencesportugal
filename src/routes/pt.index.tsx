import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { CtaButton } from "@/components/ui/CtaButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TourImage } from "@/components/tours/TourImage";
import { PriceCurrencyChip } from "@/components/PriceCurrencyChip";
import { PriceEur } from "@/components/ui/PriceEur";
import { signatureTours } from "@/data/signatureTours";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import { itemListLd, jsonLdScript, studioServiceLd } from "@/lib/jsonld";

import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { signatureDurationLabel } from "@/lib/tourContent";
import ogSocialImg from "@/assets/hero-coast.jpg";

/**
 * Portuguese homepage (`/pt`). Editorial European Portuguese, mirroring
 * the completed PT surface: Signature → Studio (EN) → Multi-day paths,
 * featured day experiences, corporate & reviews strips, contact.
 */
const PT_TITLE = "YES Experiences Portugal — Portugal privado, ao seu ritmo";
const PT_DESCRIPTION =
  "Experiências privadas por Portugal com guias locais — Arrábida ao Douro, Sintra ao Alentejo. Signature ou à medida, sem grupos.";

export const Route = createFileRoute("/pt/")({
  head: () => ({
    meta: [
      { title: PT_TITLE },
      { name: "description", content: PT_DESCRIPTION },
      { property: "og:title", content: PT_TITLE },
      { property: "og:description", content: PT_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogSocialImg}` },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogSocialImg}` },
      { property: "og:locale", content: "pt_PT" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt" },
      ...localeAlternateLinks("/"),
    ],
    scripts: [
      jsonLdScript(
        itemListLd({
          name: "Experiências Signature — YES experiences Portugal",
          path: "/pt",
          items: signatureTours.map((t) => ({
            id: t.id,
            name: t.title,
            description: t.blurb,
            image: t.img,
          })),
        }),
      ),
      jsonLdScript(
        studioServiceLd({
          path: "/pt",
          name: "YES Experiences Portugal — dias privados e jornadas locais por Portugal",
          description:
            "Experiências privadas e personalizadas em Portugal com guias locais — dias Signature, um Studio para desenhar o seu dia em tempo real e um Travel Designer humano para jornadas de vários dias por Lisboa, Sintra, Arrábida, Sesimbra, Alentejo e Costa Vicentina.",
        }),
      ),
    ],
  }),
  component: PtHomePage,
});

// Featured trio for the homepage — same source of truth as EN.
const FEATURED_IDS = ["arrabida-wine-allinclusive", "wild-beaches-picnic", "arrabida-boat"];
const FEATURED = FEATURED_IDS.map((id) => signatureTours.find((t) => t.id === id)).filter(
  (t): t is (typeof signatureTours)[number] => Boolean(t),
);

function PtHomePage() {
  useMarketingMotion();
  const { resolveImg } = useImportedTourImages();

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16 md:pt-32 md:pb-20 text-center">
        <Eyebrow flank>Bem-vindo</Eyebrow>
        <SectionTitle as="h1" size="anchor" spacing="loose">
          Portugal privado,{" "}
          <SectionTitle.Em>mostrado como um local mostra a um amigo.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Desenhamos viagens privadas por Portugal — do vinho da Arrábida às planícies do Alentejo,
          de Sintra à costa vicentina — com guias locais, mesas verdadeiras e tempo para respirar.
          Sem grupos, sem guiões prontos, sem pressa.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <CtaButton to="/pt/experiences" variant="primary">
            Ver experiências Signature
          </CtaButton>
          <CtaButton to="/pt/day-tours" variant="ghost">
            Experiências de um dia
          </CtaButton>
        </div>
      </section>

      {/* Positioning — three paths */}
      <section className="bg-[color:var(--sand)]/40 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6 grid gap-10 md:grid-cols-3">
          {[
            {
              eyebrow: "Signature",
              title: "Dias assinados",
              body: "Dias privados prontos a partir, desenhados pela nossa equipa em torno de uma região e de um tema — vinho, mar, gastronomia, paisagem.",
              href: "/pt/experiences",
              cta: "Ver a coleção",
            },
            {
              eyebrow: "Studio",
              title: "Desenhe o seu dia",
              body: "Um estúdio interativo onde compõe a sua experiência em tempo real — ritmo, paragens, mesa, guia — com ajuda editorial ao seu lado.",
              href: "/",
              cta: "Abrir o Studio (EN)",
              external: true,
            },
            {
              eyebrow: "Roteiros à Medida",
              title: "Jornadas de vários dias",
              body: "Roteiros privados de 3 a 14 dias, cosidos à mão por um Travel Designer, com hotéis escolhidos e transições sem esforço.",
              href: "/pt/contact",
              cta: "Falar connosco",
            },
          ].map((card) => (
            <article key={card.title} className="flex flex-col">
              <Eyebrow>{card.eyebrow}</Eyebrow>
              <h2 className="mt-3 font-[family-name:var(--font-editorial)] font-medium text-2xl leading-tight text-[color:var(--charcoal)]">
                {card.title}
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)] flex-1">
                {card.body}
              </p>
              <Link
                to={card.href}
                className="mt-5 self-start text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
              >
                {card.cta} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Featured Signature experiences */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <Eyebrow>Coleção Signature</Eyebrow>
          <SectionTitle spacing="loose">
            Alguns dos nossos <SectionTitle.Em>dias mais pedidos.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Cada experiência é privada, feita ao seu ritmo, com recolha incluída a partir de Lisboa
            e da região. As páginas detalhadas de cada tour estão, para já, em inglês.
          </p>
        </div>

        <div className="mt-8 flex justify-end">
          <PriceCurrencyChip align="end" />
        </div>

        <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED.map((t) => (
            <article key={t.id} className="group flex flex-col text-left">
              <Link
                to="/tours/$tourId"
                params={{ tourId: t.id }}
                className="lift-layer-sm relative block mb-5 shadow-[0_10px_30px_-20px_rgba(46,46,46,0.25)] group-hover:shadow-[0_28px_55px_-22px_rgba(41,91,97,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
                aria-label={`Abrir ${t.title}`}
              >
                <TourImage
                  {...resolveImg(t, "lg")}
                  alt={`${t.title} — experiência privada em ${t.region}, Portugal`}
                  ratio="3/2"
                  focal={t.focal ?? "50% 50%"}
                  imgClassName="group-hover:scale-105 transition-transform duration-700"
                />
              </Link>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--charcoal)]">
                {t.region}
              </p>
              <Link
                to="/tours/$tourId"
                params={{ tourId: t.id }}
                className="serif text-2xl mt-2 text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors"
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
                  A partir de <PriceEur amountEur={t.priceFrom} role="from" />
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <CtaButton to="/pt/experiences" variant="ghost">
            Ver todas as experiências Signature
          </CtaButton>
        </div>
      </section>

      {/* What to expect */}
      <section className="bg-[color:var(--ivory)] py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <Eyebrow>O que esperar</Eyebrow>
          <SectionTitle spacing="loose">
            Experiências privadas, sempre. <SectionTitle.Em>Guias locais, sempre.</SectionTitle.Em>
          </SectionTitle>
          <ul className="mt-8 space-y-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            <li>
              <strong className="font-medium text-[color:var(--charcoal)]">Só o seu grupo.</strong>{" "}
              Nunca partilhamos experiências com desconhecidos.
            </li>
            <li>
              <strong className="font-medium text-[color:var(--charcoal)]">Guias locais.</strong>{" "}
              Portugueses que conhecem os produtores, os cozinheiros e os miradouros que não estão
              nos guias.
            </li>
            <li>
              <strong className="font-medium text-[color:var(--charcoal)]">
                Recolha incluída.
              </strong>{" "}
              De Lisboa, Cascais, Sintra, Sesimbra ou Setúbal, no seu hotel ou no seu alojamento.
            </li>
            <li>
              <strong className="font-medium text-[color:var(--charcoal)]">Sem surpresas.</strong>{" "}
              Preço final claro e política de cancelamento apresentada antes do pagamento.
            </li>
          </ul>
        </div>
      </section>

      {/* Corporate strip */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-24 grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <Eyebrow>Grupos & Empresas</Eyebrow>
          <SectionTitle spacing="loose">
            Retiros e team building, <SectionTitle.Em>desenhados por locais.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Dias corporativos privados, off-sites executivos e hosting de clientes por Portugal —
            transporte, guias e locais coordenados de ponta a ponta, com fatura em nome da empresa.
          </p>
          <div className="mt-6">
            <CtaButton to="/pt/corporate" variant="ghost">
              Ver experiências corporativas
            </CtaButton>
          </div>
        </div>
        <div className="border-l border-[color:var(--gold-soft)]/40 pl-8">
          <Eyebrow>Avaliações reais</Eyebrow>
          <SectionTitle spacing="loose">
            O que os clientes <SectionTitle.Em>realmente dizem.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Centenas de avaliações verificadas no Viator, Tripadvisor, GetYourGuide e submissões
            diretas de clientes.
          </p>
          <div className="mt-6">
            <CtaButton to="/pt/reviews" variant="ghost">
              Ler as avaliações
            </CtaButton>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[color:var(--sand)]/60 py-20 md:py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <Eyebrow flank>Comece por aqui</Eyebrow>
          <SectionTitle spacing="loose">
            Vamos desenhar <SectionTitle.Em>o seu Portugal.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Diga-nos as datas, o grupo e o que gostaria de sentir. Respondemos com uma proposta
            editorial em 24 horas.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <CtaButton to="/pt/contact" variant="primary">
              Falar connosco
            </CtaButton>
            <CtaButton to="/pt/experiences" variant="ghost">
              Ver a coleção
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
