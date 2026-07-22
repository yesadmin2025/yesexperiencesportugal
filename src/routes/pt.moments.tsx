import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import { buildI18nHead } from "@/i18n/seo";

const TITLE = "Momentos privados em Portugal — pedidos de casamento e celebrações discretas";
const DESCRIPTION =
  "Um pedido nas falésias de Sintra, uma celebração numa cove da Arrábida, um jantar num terraço de Lisboa. Momentos privados desenhados de ponta a ponta por uma equipa local, com discrição total.";

export const Route = createFileRoute("/pt/moments")({
  head: () => {
    const i18n = buildI18nHead({ path: "/moments", locale: "pt" });
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
            { name: "Momentos", path: "/pt/moments" },
          ]),
        ),
      ],
    };
  },
  component: PtMomentsPage,
});

const BLOCKS = [
  {
    eyebrow: "Pedidos de casamento",
    title: "Um pedido, desenhado com cuidado.",
    body: "Do enquadramento ao momento exato, ajudamos a compor o pedido em silêncio, com o conhecimento local por trás de cada detalhe — o miradouro certo, a hora da luz, a logística invisível.",
    detail: "Local discreto · timing ao minuto · surpresa coordenada · discrição do início ao fim.",
    cta: "Planear um pedido",
  },
  {
    eyebrow: "Celebrações",
    title: "Para dias que ficam.",
    body: "Aniversários, luas-de-mel ou celebrações em família — desenhados ao seu ritmo, com as pessoas certas e a forma como quer sentir Portugal.",
    detail: "Anfitrião privado · qualquer dimensão de grupo · multi-atividade · agenda flexível.",
    cta: "Planear uma celebração",
  },
  {
    eyebrow: "Marcos importantes",
    title: "Momentos que valem tempo.",
    body: "Renovação de votos, aniversário redondo, primeira viagem juntos em Portugal. Compomos o dia com o mesmo cuidado com que se compõe uma mesa — nada por acaso.",
    detail: "Curadoria completa · guia local dedicado · fotografia opcional · confidencialidade.",
    cta: "Falar com um designer",
  },
];

function PtMomentsPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-14 md:pt-32 md:pb-16 text-center">
        <Eyebrow flank>Momentos</Eyebrow>
        <SectionTitle as="h1" size="anchor" spacing="loose">
          Momentos privados,{" "}
          <SectionTitle.Em>desenhados em Portugal com discrição.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Um pedido nas falésias de Sintra, uma celebração numa cove da Arrábida, um jantar num
          terraço em Lisboa. Coordenamos o dia inteiro — enquadramento, timing, logística
          invisível — para que só reste o momento.
        </p>
        <div className="mt-8">
          <CtaButton to="/pt/contact" variant="primary">
            Falar connosco em privado
          </CtaButton>
        </div>
      </section>

      <section className="bg-[color:var(--ivory)] py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6 grid gap-12 md:grid-cols-3">
          {BLOCKS.map((b) => (
            <article key={b.title} className="flex flex-col">
              <Eyebrow>{b.eyebrow}</Eyebrow>
              <h2 className="mt-3 font-[family-name:var(--font-editorial)] font-medium text-2xl leading-tight text-[color:var(--charcoal)]">
                {b.title}
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)] flex-1">
                {b.body}
              </p>
              <p className="mt-5 text-[12px] leading-relaxed text-[color:var(--charcoal-soft)] italic">
                {b.detail}
              </p>
              <div className="mt-6">
                <CtaButton to="/pt/contact" variant="ghost">
                  {b.cta}
                </CtaButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-20 md:py-24 text-center">
        <Eyebrow flank>Discrição garantida</Eyebrow>
        <SectionTitle spacing="loose">
          O planeamento fica connosco. <SectionTitle.Em>O momento fica consigo.</SectionTitle.Em>
        </SectionTitle>
        <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Cada pedido é tratado por uma única pessoa da equipa, de forma privada, do primeiro
          email ao último detalhe. Trabalhamos com fornecedores locais que já colaboram
          connosco há anos — nada é improvisado no dia.
        </p>
        <div className="mt-8">
          <CtaButton to="/pt/contact" variant="primary">
            Começar em privado
          </CtaButton>
        </div>
      </section>
    </SiteLayout>
  );
}
