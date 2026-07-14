import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  CANCELLATION_SHORT,
  CANCELLATION_SIGNATURE,
  CANCELLATION_STUDIO,
} from "@/config/business-nap";
import ogImg from "@/assets/edit-coastal-road.jpg";
import { buildLocaleUrl } from "@/i18n/config";

export const Route = createFileRoute("/pt/terms")({
  head: () => ({
    meta: [
      { title: "Termos e Condições — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Termos e condições para reservar experiências privadas com a YES Experiences Portugal — operador turístico português licenciado (RNAAT nº 31/2023).",
      },
      { property: "og:title", content: "Termos e Condições — YES Experiences Portugal" },
      {
        property: "og:description",
        content:
          "Condições de reserva de experiências privadas com a YES Experiences Portugal — operador licenciado RNAAT nº 31/2023.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt/terms" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "YES Experiences Portugal — Termos e Condições" },
      { property: "og:locale", content: "pt_PT" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/terms" },
      { rel: "alternate", hrefLang: "en", href: buildLocaleUrl("/terms", "en") },
      { rel: "alternate", hrefLang: "pt-PT", href: buildLocaleUrl("/terms", "pt") },
      { rel: "alternate", hrefLang: "x-default", href: buildLocaleUrl("/terms", "en") },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <section className="bg-[color:var(--ivory)] py-20 md:py-28">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow className="mb-5">Legal</Eyebrow>
          <h1 className="serif mt-3 text-[2rem] md:text-[2.8rem] leading-[1.1] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium">
            Termos e{" "}
            <span className="italic font-normal text-[color:var(--teal)]">condições.</span>
          </h1>
          <span aria-hidden="true" className="gold-rule mt-8 block max-w-[3rem]" />

          <div className="mt-10 space-y-7 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            <p>
              A YES Experiences Portugal é um operador turístico português licenciado (RNAAT nº
              31/2023), sediado em Sesimbra, que desenha viagens privadas por Portugal, com
              recolhas em Lisboa, Cascais, Sintra, Sesimbra e Setúbal. Ao efetuar uma reserva
              connosco, aceita os termos abaixo, que regem a reserva, o pagamento, o
              cancelamento e a conduta da sua experiência privada.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Reservas e pagamento
            </h2>
            <p>
              As reservas são confirmadas após a receção do pagamento. Os preços apresentados
              são por grupo privado, salvo indicação em contrário. Todas as experiências são
              operadas pela YES ou por parceiros locais cuidadosamente escolhidos.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Cancelamentos
            </h2>
            <p>
              {CANCELLATION_SHORT} {CANCELLATION_SIGNATURE} {CANCELLATION_STUDIO} Faremos sempre
              o possível para reagendar, quando viável.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Responsabilidade
            </h2>
            <p>
              A YES Experiences Portugal dispõe dos seguros exigidos pela lei portuguesa do
              turismo. Os hóspedes participam nas atividades por sua conta e devem informar
              qualquer condição que afete a sua capacidade de participação.
            </p>
            <p className="text-[13px] text-[color:var(--charcoal-soft)]/80">
              Para os termos completos do operador, contacte-nos em{" "}
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
