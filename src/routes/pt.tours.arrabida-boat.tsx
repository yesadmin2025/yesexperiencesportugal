import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { buildI18nHead } from "@/i18n/seo";

const TOUR_ID = "arrabida-boat";
const EN_PATH = `/tours/${TOUR_ID}`;
const PT_PATH = `/pt/tours/${TOUR_ID}`;
const TITLE = "Arrábida & Sesimbra — dia privado com passeio de barco costeiro";
const DESCRIPTION =
  "Dia privado na Arrábida desde Lisboa com passeio de barco pelas covas turquesa do parque natural — nadar, mergulhar, almoçar à beira-mar e terminar em Sesimbra.";

export const Route = createFileRoute("/pt/tours/arrabida-boat")({
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
            { name: "Arrábida & Sesimbra — barco privado", path: PT_PATH },
          ]),
        ),
      ],
    };
  },
  component: PtArrabidaBoatPage,
});

const OUTLINE = [
  "Recolha em Lisboa (ou Cascais, Sintra, Setúbal) em veículo privado.",
  "Mercado do Livramento em Setúbal — azulejo, peixe fresco e a primeira paragem do dia.",
  "Entrada no Parque Natural da Arrábida — estrada a descer para a baía.",
  "Passeio de barco nas covas turquesa — Lapa de Santa Margarida, praias escondidas, tempo para nadar ou apenas deixar-se ficar.",
  "Almoço em Portinho da Arrábida, à beira-mar, com pés na areia se apetecer.",
  "Sesimbra ao entardecer — passear no cais, café ou uma última bebida antes do regresso.",
  "Regresso a Lisboa em veículo privado. Só o seu grupo, sempre.",
];

function PtArrabidaBoatPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-12 md:pt-32 md:pb-14 text-center">
        <Eyebrow flank>Signature · Arrábida & Sesimbra</Eyebrow>
        <SectionTitle as="h1" size="anchor" spacing="loose">
          Arrábida & Sesimbra Private Tour{" "}
          <SectionTitle.Em>with Coastal Boat Ride.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Um dia contado pelo mar. Atravessa-se o Parque Natural da Arrábida, troca-se a estrada
          costeira por um barco até às covas mais silenciosas do parque — nadar ou apenas
          deixar-se ficar — e almoça-se em Portinho antes de descer para Sesimbra à hora
          dourada.
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
            Arrábida por terra, <SectionTitle.Em>Arrábida por mar.</SectionTitle.Em>
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
          Um dia de mar, <SectionTitle.Em>coordenado ao minuto.</SectionTitle.Em>
        </SectionTitle>
        <ul className="mt-8 space-y-4 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Duração:</strong> 8 a 9
            horas, incluindo tempo no barco.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Região:</strong> Setúbal
            · Arrábida · Portinho · Sesimbra.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Inclui:</strong>{" "}
            transporte privado, guia local, passeio de barco, tempo para nadar/mergulhar.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Almoço:</strong>{" "}
            recomendação local em Portinho, à sua conta — reservamos a mesa se assim preferir.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Preço:</strong> desde
            €159 por pessoa.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Cancelamento:</strong>{" "}
            gratuito até 24 horas antes; o passeio de barco pode ser reprogramado por mar
            adverso, sem custos.
          </li>
        </ul>
        <div className="mt-10">
          <CtaButton to={EN_PATH} variant="primary">
            Ver disponibilidade e reservar
          </CtaButton>
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Alguma dúvida antes de reservar?{" "}
          <Link
            to="/pt/contact"
            className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
          >
            Fale connosco →
          </Link>
        </p>
      </section>
    </SiteLayout>
  );
}
