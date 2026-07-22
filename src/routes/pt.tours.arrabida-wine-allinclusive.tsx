import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { buildI18nHead } from "@/i18n/seo";

/**
 * `/pt/tours/arrabida-wine-allinclusive` — landing pt-PT da Signature.
 *
 * O H1 mantém o nome comercial em inglês (paridade com Viator/reviews).
 * Toda a copy editorial em torno é escrita em português europeu. A reserva
 * final decorre na página EN equivalente — o botão "Reservar" leva a
 * `/tours/arrabida-wine-allinclusive` onde vive o formulário de disponibilidade.
 */

const TOUR_ID = "arrabida-wine-allinclusive";
const EN_PATH = `/tours/${TOUR_ID}`;
const PT_PATH = `/pt/tours/${TOUR_ID}`;
const TITLE = "Arrábida Private Wine Tour desde Lisboa | Dia privado tudo-incluído";
const DESCRIPTION =
  "Dia privado de vinho na Arrábida desde Lisboa — duas ou três adegas familiares em Azeitão, prova de Moscatel, mercado de Setúbal e almoço tradicional demorado. Operador local licenciado.";

export const Route = createFileRoute(`/pt/tours/${TOUR_ID}`)({
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
            { name: "Arrábida Wine — dia privado", path: PT_PATH },
          ]),
        ),
      ],
    };
  },
  component: PtArrabidaWinePage,
});

const OUTLINE = [
  "Recolha no seu hotel em Lisboa (ou Cascais, Sintra, Setúbal) em veículo privado.",
  "Mercado do Livramento em Setúbal — 145 anos de peixe fresco, queijos regionais e primeira prova de Moscatel.",
  "Duas ou três adegas familiares em Azeitão — a combinação exata depende da experiência escolhida e da disponibilidade do dia (confirmada antes do dia).",
  "Almoço tradicional demorado em Azeitão — cozinha portuguesa honesta, sem menus turísticos.",
  "Miradouro opcional — Cristo Rei ou o castelo de Sesimbra ao fim do dia.",
  "Regresso a Lisboa em veículo privado. Sem grupos partilhados em nenhum momento.",
];

function PtArrabidaWinePage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-12 md:pt-32 md:pb-14 text-center">
        <Eyebrow flank>Signature · Arrábida</Eyebrow>
        <SectionTitle as="h1" size="anchor" spacing="loose">
          Arrábida Private Wine Tour{" "}
          <SectionTitle.Em>from Lisbon — All-Inclusive.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
          O dia YES mais pedido, numa palavra: completo. Sai-se de Lisboa até às colinas da
          Arrábida, caminha-se no mercado do Livramento, senta-se a uma mesa portuguesa
          demorada em Azeitão e visitam-se duas ou três adegas familiares. Um miradouro no
          Cristo Rei ou no castelo de Sesimbra fecha o dia.
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
            Duas ou três adegas, uma mesa longa, <SectionTitle.Em>o mar ao lado.</SectionTitle.Em>
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
          Sem grupos, sem pressa. <SectionTitle.Em>Recolha no seu hotel.</SectionTitle.Em>
        </SectionTitle>
        <ul className="mt-8 space-y-4 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Duração:</strong> 7 a 9
            horas, ritmo tranquilo.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Região:</strong> Setúbal
            · Arrábida · Azeitão.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Recolha:</strong>{" "}
            incluída — Lisboa, Cascais, Sintra, Sesimbra ou Setúbal.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Inclui:</strong> transporte
            privado, guia local, provas nas adegas, almoço demorado em Azeitão.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Adegas:</strong> visita-se
            2 ou 3 adegas — a combinação exata depende da experiência escolhida e da
            disponibilidade do dia.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">Preço:</strong> desde
            €138 por pessoa, tudo incluído. Sem taxas escondidas.
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
          Prefere falar connosco antes de reservar?{" "}
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
