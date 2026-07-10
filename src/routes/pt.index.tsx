import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { CtaButton } from "@/components/ui/CtaButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { buildLocaleUrl } from "@/i18n/config";

/**
 * Portuguese homepage (`/pt`). Editorial European Portuguese, standalone —
 * does not attempt to mirror every EN section yet. Points the visitor to
 * the English site for the full booking flow while PT rollout continues.
 */
export const Route = createFileRoute("/pt/")({
  head: () => ({
    meta: [
      { title: "YES Experiences Portugal — Experiências privadas em Portugal" },
      {
        name: "description",
        content:
          "YES Experiences Portugal desenha viagens privadas por Portugal com guias locais — dias no Alentejo e Arrábida, jornadas de vários dias e momentos irrepetíveis, feitos ao seu ritmo.",
      },
      { property: "og:title", content: "YES Experiences Portugal" },
      {
        property: "og:description",
        content: "Experiências privadas em Portugal, desenhadas com guias locais.",
      },
      { property: "og:locale", content: "pt_PT" },
      { property: "og:locale:alternate", content: "en_US" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt" },
      { rel: "alternate", hrefLang: "en", href: buildLocaleUrl("/", "en") },
      { rel: "alternate", hrefLang: "pt-PT", href: buildLocaleUrl("/", "pt") },
      { rel: "alternate", hrefLang: "x-default", href: buildLocaleUrl("/", "en") },
    ],
  }),
  component: PtHomePage,
});

function PtHomePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-14 md:pt-28 md:pb-20 text-center">
        <Eyebrow>Bem-vindo</Eyebrow>
        <h1 className="mt-6 font-[family-name:var(--font-editorial)] text-4xl md:text-6xl leading-[1.05] text-[color:var(--charcoal)]">
          Portugal privado,
          <br />
          mostrado como um local mostra a um amigo.
        </h1>
        <p className="mt-7 mx-auto max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Desenhamos viagens privadas por Portugal — do vinho da Arrábida às
          planícies do Alentejo, de Sintra à costa vicentina — com guias
          locais, mesas verdadeiras e tempo para respirar. Sem grupos, sem
          guiões prontos, sem pressa.
        </p>
      </section>

      {/* Positioning */}
      <section className="bg-[color:var(--sand)]/40 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6 grid gap-10 md:grid-cols-3">
          {[
            {
              eyebrow: "Signature",
              title: "Dias assinados",
              body: "Dias privados prontos a partir, desenhados pela nossa equipa em torno de uma região e de um tema — vinho, mar, gastronomia, paisagem.",
            },
            {
              eyebrow: "Studio",
              title: "Desenhe o seu dia",
              body: "Um estúdio interativo onde compõe a sua experiência em tempo real — ritmo, paragens, mesa, guia — com ajuda editorial ao seu lado.",
            },
            {
              eyebrow: "Roteiros à Medida",
              title: "Jornadas de vários dias",
              body: "Roteiros privados de 3 a 14 dias, cosidos à mão por um Travel Designer, com hotéis escolhidos e transições sem esforço.",
            },
          ].map((card) => (
            <article key={card.title}>
              <Eyebrow>{card.eyebrow}</Eyebrow>
              <h2 className="mt-3 font-[family-name:var(--font-editorial)] text-2xl leading-tight text-[color:var(--charcoal)]">
                {card.title}
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* What to expect */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <Eyebrow>O que esperar</Eyebrow>
        <h2 className="mt-4 font-[family-name:var(--font-editorial)] text-3xl md:text-4xl leading-[1.1] text-[color:var(--charcoal)]">
          Experiências privadas, sempre. Guias locais, sempre.
        </h2>
        <ul className="mt-8 space-y-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">
              Só o seu grupo.
            </strong>{" "}
            Nunca partilhamos experiências com desconhecidos.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">
              Guias locais.
            </strong>{" "}
            Portugueses que conhecem os produtores, os cozinheiros e os
            miradouros que não estão nos guias.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">
              Recolha incluída.
            </strong>{" "}
            De Lisboa, Cascais, Sintra, Sesimbra ou Setúbal, no seu hotel ou
            no seu alojamento.
          </li>
          <li>
            <strong className="font-medium text-[color:var(--charcoal)]">
              Sem surpresas.
            </strong>{" "}
            Preço final claro e política de cancelamento apresentada antes
            do pagamento.
          </li>
        </ul>
      </section>

      {/* Full site notice + CTAs */}
      <section className="bg-[color:var(--sand)]/40 py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <Eyebrow>Versão portuguesa em lançamento</Eyebrow>
          <p className="mt-5 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Estamos a preparar, com cuidado editorial, cada página em
            português europeu. Enquanto isso, a reserva e o estúdio
            completos vivem no nosso site em inglês — é a mesma marca, os
            mesmos guias, as mesmas experiências privadas.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CtaButton to="/">Continuar em Inglês</CtaButton>
            <Link
              to="/pt/contact"
              className="text-[11.5px] uppercase tracking-[0.22em] text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
            >
              Falar connosco
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
