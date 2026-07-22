import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { buildI18nHead } from "@/i18n/seo";

const TOUR_ID = "tiles-workshop";
const EN_PATH = `/tours/${TOUR_ID}`;
const PT_PATH = `/pt/tours/${TOUR_ID}`;
const TITLE = "Oficina de Azulejo, prova de vinhos e Sesimbra — dia privado";
const DESCRIPTION =
  "Pinte o seu próprio azulejo num atelier com cinco séculos em Azeitão, prove vinhos locais na quinta ao lado e termine o dia junto ao mar em Sesimbra.";

export const Route = createFileRoute("/pt/tours/tiles-workshop")({
  head: () => {
    const i18n = buildI18nHead({ path: EN_PATH, locale: "pt" });
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:type", content: "product" },
        ...i18n.meta,
      ],
      links: i18n.links,
      scripts: [
        jsonLdScript(
          breadcrumbLd([
            { name: "Início", path: "/pt" },
            { name: "Experiências", path: "/pt/experiences" },
            { name: "Oficina de Azulejo & Sesimbra", path: PT_PATH },
          ]),
        ),
      ],
    };
  },
  component: PtTilesWorkshopPage,
});

const OUTLINE = [
  "Recolha em Lisboa (ou Cascais, Sintra, Setúbal) em veículo privado.",
  "Mercado do Livramento em Setúbal — 145 anos de peixe fresco e produtos regionais.",
  "Atelier de Azulejos em Azeitão — o mestre apresenta-se, mistura-se o cobalto, cada pessoa pinta o seu próprio azulejo.",
  "Quinta local em Azeitão — prova de vinhos com o produtor, passagem pela vinha.",
  "Sesimbra ao fim da tarde — passear pelo cais, tempo livre à beira-mar.",
  "Regresso a Lisboa em veículo privado. Só o seu grupo.",
];

function PtTilesWorkshopPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-12 md:pt-32 md:pb-14 text-center">
        <Eyebrow flank>Signature · Azeitão & Sesimbra</Eyebrow>
        <SectionTitle as="h1" size="anchor" spacing="loose">
          Tile Painting Workshop, Wine Tasting{" "}
          <SectionTitle.Em>& Sesimbra — Private Day.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Cinco séculos de azulejo num pátio silencioso. Conhece-se o mestre, mistura-se o azul
          cobalto, pinta-se um azulejo que fica seu para sempre. O dia acalma a partir dali —
          um copo de vinho local, e depois o sal e o sol de Sesimbra.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <CtaButton to={EN_PATH} variant="primary">
            Ver disponibilidade e reservar
          </CtaButton>
          <CtaButton to="/pt/experiences" variant="ghost">
            Voltar à coleção
          </CtaButton>
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
          Reserva em inglês · confirmação instantânea
        </p>
      </section>

      <section className="bg-[color:var(--sand)]/40 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <Eyebrow>O dia, em síntese</Eyebrow>
          <SectionTitle spacing="loose">
            Mãos no azulejo, <SectionTitle.Em>tarde ao pé do mar.</SectionTitle.Em>
          </SectionTitle>
          <ol className="mt-8 space-y-4 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            {OUTLINE.map((line, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)] pt-1 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <Eyebrow>Detalhes práticos</Eyebrow>
        <SectionTitle spacing="loose">
          Um dia com tempo <SectionTitle.Em>para criar, provar e respirar.</SectionTitle.Em>
        </SectionTitle>
        <ul className="mt-8 space-y-4 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Duração:</strong> 8 a 9
            horas.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Região:</strong>{" "}
            Azeitão · Sesimbra.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Inclui:</strong>{" "}
            transporte privado, guia local, oficina de azulejo com o seu próprio azulejo para
            levar, prova de vinhos numa quinta local.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Ideal para:</strong>{" "}
            casais, criativos, famílias com adolescentes.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Preço:</strong> desde
            €145 por pessoa.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Cancelamento:</strong>{" "}
            gratuito até 24 horas antes.
          </li>
        </ul>
        <div className="mt-10">
          <CtaButton to={EN_PATH} variant="primary">
            Ver disponibilidade e reservar
          </CtaButton>
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Prefere falar connosco antes?{" "}
          <Link
            to="/pt/contact"
            className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
          >
            Envie-nos uma mensagem →
          </Link>
        </p>
      </section>
    </SiteLayout>
  );
}
