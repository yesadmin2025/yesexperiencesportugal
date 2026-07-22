import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CtaButton } from "@/components/ui/CtaButton";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";
import { breadcrumbLd, jsonLdScript, travelDesignerServiceLd } from "@/lib/jsonld";
import { buildI18nHead } from "@/i18n/seo";

const TITLE = "Travel Designer em Portugal | Roteiros privados desenhados por locais";
const DESCRIPTION =
  "Um travel designer local desenha consigo o seu Portugal — experiências privadas de um dia, tours de vinho e roteiros de vários dias por todo o país.";

export const Route = createFileRoute("/pt/portugal-travel-designer")({
  head: () => {
    const i18n = buildI18nHead({ path: "/portugal-travel-designer", locale: "pt" });
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
            { name: "Travel Designer", path: "/pt/portugal-travel-designer" },
          ]),
        ),
        jsonLdScript(travelDesignerServiceLd({ path: "/pt/portugal-travel-designer" })),
      ],
    };
  },
  component: PtPtdPage,
});

function PtPtdPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="pt-28 md:pt-36 pb-10 bg-[color:var(--sand)]">
        <div className="container-x max-w-3xl text-center">
          <Eyebrow flank>Portugal Travel Designer</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="loose">
            Travel designers locais para <SectionTitle.Em>o seu Portugal privado.</SectionTitle.Em>
          </SectionTitle>
          <span className="gold-rule mt-6 mx-auto max-w-[80px]" aria-hidden="true" />
          <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Não somos uma agência genérica. Somos uma pequena equipa portuguesa que desenha
            viagens privadas em Portugal — dias Signature, tours de vinho, roteiros de vários
            dias — com o cuidado editorial de quem conhece cada quinta, cada mesa e cada
            miradouro do interior.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <CtaButton to="/pt/contact" variant="primary">
              Falar com um designer
            </CtaButton>
            <CtaButton to="/pt/multi-day" variant="ghost">
              Roteiros de vários dias
            </CtaButton>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[color:var(--ivory)]">
        <div className="container-x max-w-3xl">
          <Eyebrow>O que fazemos</Eyebrow>
          <SectionTitle spacing="loose">
            Desenhar viagens <SectionTitle.Em>que não parecem embrulhadas.</SectionTitle.Em>
          </SectionTitle>
          <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            <p>
              Escrevemos consigo o roteiro do princípio — as regiões, o ritmo, os hotéis, as
              experiências privadas, os transferes. Nada é montado a partir de um catálogo
              genérico; cada dia é composto para o seu grupo e revisto por um humano antes de
              chegar ao seu email.
            </p>
            <p>
              Trabalhamos com hotéis e quintas com quem já colaboramos há anos, com guias
              locais em cada região e com fornecedores portugueses de confiança. Recebe uma
              proposta editorial em 48 horas, ajustamos até ficar como deseja, e a reserva
              final fica em nome do seu grupo — com faturação completa quando necessário.
            </p>
          </div>
          <div className="mt-10">
            <CtaButton to="/pt/contact" variant="primary">
              Pedir a minha proposta
            </CtaButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
