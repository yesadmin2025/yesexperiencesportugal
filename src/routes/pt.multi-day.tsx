import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, jsonLdScript, travelDesignerServiceLd } from "@/lib/jsonld";
import { buildI18nHead } from "@/i18n/seo";

const TITLE = "Roteiros privados de vários dias em Portugal | YES Travel Designer";
const DESCRIPTION =
  "Compomos um roteiro privado de vários dias por Portugal com um travel designer local — rotas à medida, experiências regionais e apoio pessoal do início ao fim.";

export const Route = createFileRoute("/pt/multi-day")({
  head: () => {
    const i18n = buildI18nHead({ path: "/multi-day", locale: "pt" });
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
            { name: "Roteiros à Medida", path: "/pt/multi-day" },
          ]),
        ),
        jsonLdScript(travelDesignerServiceLd({ path: "/pt/multi-day" })),
      ],
    };
  },
  component: PtMultiDayPage,
});

const FOR_WHOM = [
  {
    title: "Jornadas de vários dias",
    body: "Para quem quer Portugal desenhado ao longo de vários dias, e não colado à última hora.",
  },
  {
    title: "Luas-de-mel e aniversários",
    body: "Roteiros privados com ritmo, privacidade e cenários com significado.",
  },
  {
    title: "Viagens em família",
    body: "Cadência equilibrada, tempos realistas e experiências que funcionam para todas as idades.",
  },
  {
    title: "Primeira vez em Portugal",
    body: "Um percurso claro para quem quer conhecimento local sem perder a liberdade da própria viagem.",
  },
  {
    title: "Ocasiões especiais",
    body: "Celebrações, pedidos e marcos importantes desenhados com cuidado.",
  },
  {
    title: "Roteiros complexos",
    body: "Várias regiões, transferes, alojamentos e experiências privadas encadeadas como deve ser.",
  },
];

const WE_DESIGN = [
  {
    title: "Rota e ritmo",
    body: "Escolhemos consigo as regiões, definimos a ordem, calibramos o ritmo — sem dias mortos, sem dias sobrelotados.",
  },
  {
    title: "Estadias escolhidas",
    body: "Hotéis, quintas e casas de campo com quem já trabalhamos — reservados no seu nome, com upgrades sempre que possível.",
  },
  {
    title: "Experiências privadas",
    body: "Adegas, oficinas de artesãos, cozinhas de família, mesas privadas, guias locais em cada região.",
  },
  {
    title: "Transporte e logística",
    body: "Veículo privado com condutor, transferes de aeroporto, comboio quando faz sentido. Toda a coreografia do dia coordenada.",
  },
];

function PtMultiDayPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-14 md:pt-32 md:pb-16 text-center">
        <Eyebrow flank>Travel Designer</Eyebrow>
        <SectionTitle as="h1" size="anchor" spacing="loose">
          Roteiros privados de vários dias,{" "}
          <SectionTitle.Em>cosidos à mão em Portugal.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Um travel designer local escreve o seu roteiro do início ao fim — regiões, hotéis,
          experiências privadas, transferes. Recebe uma proposta editorial em 48 horas e ajusta
          consigo até ficar exatamente como quer.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <CtaButton to="/pt/contact" variant="primary">
            Pedir uma proposta
          </CtaButton>
          <CtaButton to="/pt/experiences" variant="ghost">
            Ver Signatures de um dia
          </CtaButton>
        </div>
      </section>

      <section className="bg-[color:var(--sand)]/40 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <Eyebrow>Para quem</Eyebrow>
          <SectionTitle spacing="loose">
            Desenhado para viagens <SectionTitle.Em>que não cabem num dia.</SectionTitle.Em>
          </SectionTitle>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {FOR_WHOM.map((c) => (
              <article key={c.title}>
                <h3 className="font-[family-name:var(--font-editorial)] font-medium text-xl text-[color:var(--charcoal)]">
                  {c.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                  {c.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 md:py-24">
        <Eyebrow>O que desenhamos</Eyebrow>
        <SectionTitle spacing="loose">
          Tudo aquilo que faz um roteiro <SectionTitle.Em>funcionar de verdade.</SectionTitle.Em>
        </SectionTitle>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {WE_DESIGN.map((c) => (
            <article key={c.title}>
              <h3 className="font-[family-name:var(--font-editorial)] font-medium text-xl text-[color:var(--charcoal)]">
                {c.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[color:var(--ivory)] py-20 md:py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <Eyebrow flank>Como começar</Eyebrow>
          <SectionTitle spacing="loose">
            Uma conversa, <SectionTitle.Em>não um formulário.</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Diga-nos as datas, o grupo, o que já sabe que quer e o que ainda está por decidir.
            Respondemos com uma primeira proposta editorial em 48 horas — sem compromisso, sem
            listas genéricas.
          </p>
          <div className="mt-8">
            <CtaButton to="/pt/contact" variant="primary">
              Pedir a minha proposta
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
