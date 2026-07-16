import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { SiteLayout } from "@/components/SiteLayout";
import { MessageCircle, Users, Compass, ClipboardCheck } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import imgFatimaNazare from "@/assets/tours/fatima-nazare-obidos/nazare.jpg";
import imgArrabidaWineLunch from "@/assets/tours/arrabida-wine-allinclusive/lunch.jpg";
import imgSintraEstates from "@/assets/tours/sintra-cascais/estates.jpg";

import { useMarketingMotion } from "@/hooks/use-marketing-motion";

const TITLE = "Experiências corporativas e para grupos privados em Portugal | YES";
const DESCRIPTION =
  "Dias corporativos privados, retiros de equipa e experiências de grupo em Portugal — desenhados e conduzidos por um operador local licenciado. Transporte, guias e locais coordenados de ponta a ponta.";

export const Route = createFileRoute("/pt/corporate")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: `https://yesexperiencesportugal.com${imgFatimaNazare}` },
      { property: "twitter:image", content: `https://yesexperiencesportugal.com${imgFatimaNazare}` },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt/corporate" },
      { property: "og:locale", content: "pt_PT" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/corporate" },
      { rel: "alternate", hrefLang: "en", href: "https://yesexperiencesportugal.com/corporate" },
      { rel: "alternate", hrefLang: "pt-PT", href: "https://yesexperiencesportugal.com/pt/corporate" },
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Início", path: "/pt" },
          { name: "Retiros de equipa & experiências corporativas", path: "/pt/corporate" },
        ]),
      ),
    ],
  }),
  component: CorporatePage,
});

const BLOCKS = [
  {
    eyebrow: "Executivo & Incentivos",
    title: "Um dia que parece natural, não organizado.",
    emotional:
      "A sua equipa chega, o dia acontece, nada parece encaixado à pressa. É esse o trabalho por trás.",
    practical:
      "Grupos privados de qualquer dimensão, com o transporte, guias, parceiros e ritmo certos · faturação e apoio DMC · desenhado em torno dos vossos objetivos.",
    local:
      "Tratamos das peças em movimento no terreno — tempos de viagem reais, locais reais, parceiros reais.",
    image: imgArrabidaWineLunch,
    icon: Users,
  },
  {
    eyebrow: "Off-sites & Retiros",
    title: "Portugal local, desenhado para equipas a trabalhar.",
    emotional:
      "Espaço para pensar, comer bem e sentir o lugar — sem aquela sensação de hotel de conferências.",
    practical:
      "Fluxo de vários dias, logística regional, locais adequados a reuniões, momentos culturais integrados no ritmo.",
    local: "Coordenado por um anfitrião local que sabe como cada peça do dia se liga.",
    image: imgSintraEstates,
    icon: Compass,
  },
  {
    eyebrow: "Hosting de clientes & VIP",
    title: "Discreto, ponderado, totalmente reservado.",
    emotional:
      "Quando importa quem está na sala e como o dia se sente — é assim que o desenhamos.",
    practical: "Grupos pequenos · ambientes privados · ritmo cuidado · NDAs bem-vindos.",
    local: "Planeado de ponta a ponta com a nossa equipa local — cada detalhe confirmado antes do dia.",
    image: imgFatimaNazare,
    icon: ClipboardCheck,
  },
];

const FAQ_PT = [
  {
    q: "De que tamanho podem ser os grupos?",
    a: "De 4 a 60+ convidados. Para grupos maiores organizamos a logística com transporte múltiplo, vários guias e locais dimensionados de forma adequada.",
  },
  {
    q: "Emitem fatura à empresa?",
    a: "Sim. Somos um operador turístico licenciado em Portugal (RNAAT) e emitimos fatura em nome da empresa, com IVA quando aplicável.",
  },
  {
    q: "Trabalham com agências e DMCs?",
    a: "Sim — apoiamos agências, event planners e DMCs internacionais com propostas em white-label, cotações detalhadas e coordenação no terreno.",
  },
  {
    q: "Com que antecedência devemos reservar?",
    a: "Idealmente 4 a 8 semanas para grupos, mais para épocas de pico (Maio–Junho, Setembro–Outubro). Datas mais próximas são possíveis — fale connosco.",
  },
];

function CorporatePage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="pt-28 pb-14 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Retiros corporativos</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Team building em Portugal, <SectionTitle.Em>desenhado por locais.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
          <p className="mt-6 text-[1rem] md:text-[1.1rem] text-[color:var(--charcoal-soft)] leading-relaxed">
            Retiros corporativos privados, dias de team building, incentivos e off-sites executivos
            por Portugal — de Lisboa e Sintra à costa da Arrábida, ao Alentejo, ao Douro e além,
            com transporte, guias e locais coordenados de ponta a ponta para que o dia pareça{" "}
            <strong className="font-medium text-[color:var(--charcoal)]">natural</strong>, não
            organizado.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/pt/contact" variant="primary">
              Planear uma experiência de grupo
            </CtaButton>
            <CtaButton
              to="/pt/contact"
              variant="ghost"
              icon={null}
              iconLeading={<MessageCircle size={14} aria-hidden="true" />}
            >
              Falar com um local
            </CtaButton>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-x space-y-16 md:space-y-24">
          {BLOCKS.map((b, i) => {
            const Icon = b.icon;
            const reverse = i % 2 === 1;
            return (
              <article
                key={b.eyebrow}
                className={`reveal-stagger grid lg:grid-cols-2 gap-8 md:gap-12 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="overflow-hidden">
                  <img
                    src={b.image}
                    alt={b.title}
                    loading="lazy"
                    className="w-full aspect-[4/5] md:aspect-[5/6] object-cover transition-transform duration-700 hover:scale-[1.03]"
                  />
                </div>
                <div>
                  <Eyebrow icon={<Icon strokeWidth={1.8} />}>{b.eyebrow}</Eyebrow>
                  <span className="gold-rule mt-4 max-w-[64px]" aria-hidden="true" />
                  <SectionTitle size="compact" spacing="loose">
                    {b.title}
                  </SectionTitle>
                  <p className="mt-4 font-serif italic text-[1.1rem] md:text-[1.2rem] text-[color:var(--teal)] leading-snug">
                    {b.emotional}
                  </p>
                  <p className="mt-4 text-[color:var(--charcoal-soft)] leading-relaxed">
                    {b.practical}
                  </p>
                  <div className="mt-5 pl-4 border-l-2 border-[color:var(--gold)] text-sm text-[color:var(--charcoal-soft)] leading-relaxed">
                    {b.local}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-[color:var(--ivory)] reveal">
        <div className="container-x max-w-2xl">
          <Eyebrow className="mb-4">Perguntas dos organizadores</Eyebrow>
          <h2 className="font-display font-semibold text-[1.4rem] md:text-[1.7rem] leading-[1.25] text-[color:var(--charcoal)] mb-8">
            Antes da proposta.
          </h2>
          <dl className="space-y-8">
            {FAQ_PT.map((f) => (
              <div key={f.q}>
                <dt className="font-display font-semibold text-[1.05rem] md:text-[1.15rem] text-[color:var(--charcoal)] mb-3">
                  {f.q}
                </dt>
                <dd className="text-[15px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.75]">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-[color:var(--sand)] reveal">
        <div className="container-x max-w-2xl text-center">
          <SectionTitle size="compact">
            Fale-nos do <SectionTitle.Em>vosso grupo.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-5 mx-auto max-w-[64px]" aria-hidden="true" />
          <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
            Tempos de viagem reais, locais reais, parceiros reais. Desenhamos a proposta em torno
            do que a vossa equipa realmente precisa — nunca um template copiado.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <CtaButton to="/pt/contact" variant="primary">
              Pedir proposta
            </CtaButton>
            <CtaButton
              to="/pt/contact"
              variant="ghost"
              icon={null}
              iconLeading={<MessageCircle size={14} aria-hidden="true" />}
            >
              Falar com um local
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
