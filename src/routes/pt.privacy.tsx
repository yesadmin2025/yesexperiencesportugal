import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const Route = createFileRoute("/pt/privacy")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Política de Privacidade — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Como a YES Experiences Portugal recolhe, utiliza e protege os seus dados pessoais, ao abrigo do Regulamento Geral de Proteção de Dados (RGPD) da União Europeia.",
      },
      { property: "og:title", content: "Política de Privacidade — YES Experiences Portugal" },
      {
        property: "og:description",
        content:
          "Como a YES Experiences Portugal recolhe, utiliza e protege os seus dados pessoais, ao abrigo do RGPD.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt/privacy" },
      { property: "og:locale", content: "pt_PT" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/privacy" },
      ...localeAlternateLinks("/privacy"),
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <section className="bg-[color:var(--ivory)] py-20 md:py-28">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow className="mb-5">Legal</Eyebrow>
          <h1 className="serif mt-3 text-[2rem] md:text-[2.8rem] leading-[1.1] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium">
            Política de{" "}
            <span className="italic font-normal text-[color:var(--teal)]">privacidade.</span>
          </h1>
          <span aria-hidden="true" className="gold-rule mt-8 block max-w-[3rem]" />

          <div className="mt-10 space-y-7 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            <p>
              Mantemos as coisas simples. A YES Experiences Portugal recolhe apenas a informação
              necessária para desenhar a sua experiência privada, confirmar a sua reserva e
              manter-se em contacto consigo sobre a viagem.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              O que recolhemos
            </h2>
            <p>
              Nome, email, telefone, dimensão do grupo, datas de viagem e quaisquer preferências que
              partilhe connosco. Os dados de pagamento são geridos pelos nossos parceiros de
              pagamento e nunca ficam armazenados nos nossos servidores.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Como utilizamos
            </h2>
            <p>
              Para planear e operar a sua experiência, enviar confirmações de reserva e informação
              de viagem e — apenas se o autorizar — notas editoriais ocasionais sobre Portugal.
              Nunca vendemos os seus dados.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Os seus direitos
            </h2>
            <p>
              Ao abrigo do RGPD, pode aceder, corrigir ou apagar os seus dados pessoais a qualquer
              momento. Escreva-nos e responderemos no prazo máximo de 30 dias.
            </p>
            <p className="text-[13px] text-[color:var(--charcoal-soft)]/80">
              Pedidos relativos a dados:{" "}
              <a
                className="underline decoration-[color:var(--gold)]/50 hover:text-[color:var(--teal)]"
                href="mailto:info@yesexperiencesportugal.com"
              >
                info@yesexperiencesportugal.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
