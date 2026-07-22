import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, studioServiceLd, jsonLdScript } from "@/lib/jsonld";
import { buildI18nHead } from "@/i18n/seo";

/**
 * `/pt/studio-v3` — landing pt-PT do Studio.
 *
 * Nesta fase, o composer interativo (grelhas, mapa, ribbon de investimento,
 * ecrã de checkout do Studio) permanece em inglês — a jornada visível é
 * apresentada aqui em português editorial, com introdução, instruções e
 * resumo do que o Studio faz, encaminhando depois para o composer real
 * em `/studio-v3`. A localização in-component do Studio será um segundo
 * passe (i18n threading do StudioV3).
 */

const TITLE = "Studio YES — Desenhe o seu dia privado em Portugal";
const DESCRIPTION =
  "Um estúdio interativo para compor a sua experiência privada em Portugal em tempo real — região, ritmo, paragens, mesa e guia local, com apoio editorial ao seu lado.";

export const Route = createFileRoute("/pt/studio-v3")({
  head: () => {
    const i18n = buildI18nHead({ path: "/studio-v3", locale: "pt" });
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:type", content: "website" },
        ...i18n.meta,
      ],
      links: i18n.links,
      scripts: [
        jsonLdScript(
          breadcrumbLd([
            { name: "Início", path: "/pt" },
            { name: "Studio", path: "/pt/studio-v3" },
          ]),
        ),
        jsonLdScript(
          studioServiceLd({
            path: "/pt/studio-v3",
            name: "Studio YES — dia privado desenhado em Portugal",
            description:
              "Um estúdio interativo onde compõe a sua experiência privada em Portugal em tempo real — ritmo, paragens, mesa e guia local, com ajuda editorial ao seu lado.",
          }),
        ),
      ],
    };
  },
  component: PtStudioPage,
});

const STEPS = [
  {
    n: "01",
    title: "Comece pelo sentimento",
    body: "Diga-nos como quer sentir o dia — descoberta calma, celebração à mesa, vinho e paisagem, mar e silêncio. Não pedimos formulários; pedimos intenção.",
  },
  {
    n: "02",
    title: "Escolha o ritmo",
    body: "O Studio sugere uma cadência para o seu dia — quantas paragens fazem sentido, quanto tempo respirar em cada uma, onde parar para almoçar sem pressa.",
  },
  {
    n: "03",
    title: "Componha as paragens",
    body: "Adegas familiares, miradouros, oficinas de azulejo, mesas locais, praias escondidas. Cada escolha desenha o mapa e o ritmo do dia em tempo real.",
  },
  {
    n: "04",
    title: "Reveja e reserve",
    body: "No fim, o Studio devolve-lhe uma síntese editorial do dia, o investimento por pessoa, e o passo de reserva. Sem letras miúdas, sem grupos partilhados.",
  },
];

function PtStudioPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-14 md:pt-32 md:pb-16 text-center">
        <Eyebrow flank>Studio</Eyebrow>
        <SectionTitle as="h1" size="anchor" spacing="loose">
          Desenhe o seu Portugal,{" "}
          <SectionTitle.Em>em tempo real, com um local ao seu lado.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
          O Studio YES é a nossa forma de compor um dia privado consigo. Não é um formulário nem
          um quiz — é um pequeno estúdio editorial onde cada escolha desenha o mapa, o ritmo e a
          mesa do seu dia. Composição e reserva final decorrem em inglês; a intenção, essa,
          desenhamos em português.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <CtaButton to="/studio-v3" variant="primary">
            Abrir o Studio
          </CtaButton>
          <CtaButton to="/pt/experiences" variant="ghost">
            Ver a coleção Signature
          </CtaButton>
        </div>
      </section>

      <section className="bg-[color:var(--sand)]/40 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <Eyebrow>Como funciona</Eyebrow>
          <SectionTitle spacing="loose">
            Quatro passos. <SectionTitle.Em>Zero formulários.</SectionTitle.Em>
          </SectionTitle>
          <ol className="mt-10 grid gap-8 md:grid-cols-2">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)]">
                  {s.n}
                </span>
                <h3 className="mt-2 font-[family-name:var(--font-editorial)] font-medium text-xl text-[color:var(--charcoal)]">
                  {s.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 md:py-24">
        <Eyebrow>Resumo & Reserva</Eyebrow>
        <SectionTitle spacing="loose">
          No fim, um dia inteiro <SectionTitle.Em>numa página só.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Ao terminar a composição, o Studio apresenta-lhe uma síntese editorial do dia, o
          investimento por pessoa (sem taxas escondidas), a política de cancelamento e o botão
          de reserva. Se preferir falar connosco antes de confirmar, pode guardar o dia e
          receber a proposta por email.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <CtaButton to="/studio-v3" variant="primary">
            Começar agora
          </CtaButton>
          <Link
            to="/pt/contact"
            className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
          >
            Prefiro falar com um designer →
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
