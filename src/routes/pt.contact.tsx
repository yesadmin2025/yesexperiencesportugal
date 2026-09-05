import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

import {
  BUSINESS_NAME,
  EMAIL,
  EMAIL_HREF,
  PHONE_DISPLAY,
  PHONE_HREF,
  BASED_IN,
  TRUST_LINE_PT,
  whatsappUrl,
} from "@/config/business-nap";

export const Route = createFileRoute("/pt/contact")({
  validateSearch: (search: Record<string, unknown>): { type?: string } => {
    const raw = typeof search.type === "string" && search.type.length > 0 ? search.type : undefined;
    return raw ? { type: raw } : {};
  },
  head: () => ({
    meta: [
      // Utility page: keep it accessible and crawlable for links, but do not
      // spend search index budget on a contact-only destination.
      { name: "robots", content: "noindex, follow" },
      { title: "Contactos — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Contacte a YES Experiences Portugal por WhatsApp, telefone ou email. Respondemos diariamente em português e inglês e ajudamos a planear a sua experiência.",
      },
      { property: "og:title", content: "Contactos — YES Experiences Portugal" },
      {
        property: "og:description",
        content: "Fale connosco por WhatsApp, telefone ou email.",
      },
      { property: "og:locale", content: "pt_PT" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/pt/contact" },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/contact" },
      ...localeAlternateLinks("/contact"),
    ],
  }),
  component: PtContactPage,
});

function PtContactPage() {
  useMarketingMotion();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-6 py-20 md:py-28">
        <Eyebrow>Contactos</Eyebrow>
        <h1 className="mt-5 font-[family-name:var(--font-editorial)] text-4xl md:text-5xl leading-[1.05] text-[color:var(--charcoal)]">
          Estamos a um recado de distância.
        </h1>
        <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
          Escreva-nos com o que tem em mente — datas, número de pessoas, região ou ocasião.
          Respondemos em português ou em inglês, todos os dias, com propostas concretas e claras.
        </p>

        <dl className="mt-10 space-y-6 text-[15px]">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              WhatsApp
            </dt>
            <dd className="mt-1">
              <a
                href={whatsappUrl("Olá! Gostaria de saber mais sobre uma experiência YES.")}
                className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
              >
                {PHONE_DISPLAY}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Telefone
            </dt>
            <dd className="mt-1">
              <a
                href={PHONE_HREF}
                className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
              >
                {PHONE_DISPLAY}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Email
            </dt>
            <dd className="mt-1">
              <a
                href={EMAIL_HREF}
                className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
              >
                {EMAIL}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Sede
            </dt>
            <dd className="mt-1 text-[color:var(--charcoal-soft)]">
              {BUSINESS_NAME} · {BASED_IN}
              <br />
              {TRUST_LINE_PT}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Horário de resposta
            </dt>
            <dd className="mt-1 text-[color:var(--charcoal-soft)]">
              Todos os dias, 9h–20h (WET/WEST). Fora deste horário, respondemos na manhã seguinte.
            </dd>
          </div>
        </dl>
      </section>
    </SiteLayout>
  );
}
