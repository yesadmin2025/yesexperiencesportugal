import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const Route = createFileRoute("/pt/cookies")({
  head: () => ({
    meta: [
      { title: "Política de cookies — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Como usamos cookies em yesexperiencesportugal.com — cookies essenciais, de análise e como recusar.",
      },
      { property: "og:locale", content: "pt_PT" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt/cookies" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/cookies" },
      ...localeAlternateLinks("/cookies"),
    ],
  }),
  component: PtCookiesPage,
});

function PtCookiesPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-6 py-20 md:py-28">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-5 font-[family-name:var(--font-editorial)] text-4xl md:text-5xl leading-[1.05] text-[color:var(--charcoal)]">
          Política de cookies
        </h1>

        <div className="prose-longform mt-10 space-y-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          <p>
            Utilizamos cookies para que o nosso site funcione corretamente
            e para compreender, de forma agregada, como é utilizado. Não
            usamos cookies para publicidade nem partilhamos dados
            individuais com terceiros para esse fim.
          </p>

          <h2 className="mt-10 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
            Cookies essenciais
          </h2>
          <p>
            Necessários para o funcionamento do site — sessão, preferências
            de idioma e moeda, proteção contra fraude no processo de
            reserva. Não podem ser desativados.
          </p>

          <h2 className="mt-8 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
            Cookies de análise
          </h2>
          <p>
            Ajudam-nos a medir, de forma anónima, quais as páginas mais
            úteis e onde melhorar. Utilizamos Google Analytics e
            ferramentas semelhantes, sempre em modo agregado.
          </p>

          <h2 className="mt-8 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
            Como recusar ou apagar
          </h2>
          <p>
            Pode bloquear ou apagar cookies nas definições do seu
            navegador. Ao fazê-lo, algumas partes do site — como o
            processo de reserva — poderão deixar de funcionar
            corretamente.
          </p>

          <h2 className="mt-8 font-[family-name:var(--font-editorial)] text-xl text-[color:var(--charcoal)]">
            Alterações a esta política
          </h2>
          <p>
            Podemos atualizar esta política pontualmente. A versão mais
            recente está sempre disponível nesta página.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
