import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { CANCELLATION, EMAIL, EMAIL_HREF, LICENSE_LABEL } from "@/config/business-nap";
import { breadcrumbLd, jsonLdScript } from "@/lib/jsonld";
import ogImg from "@/assets/hero-coast.jpg";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — YES Experiences Portugal" },
      {
        name: "description",
        content: `Terms and conditions for booking private experiences with YES Experiences Portugal — a licensed Portuguese tour operator (${LICENSE_LABEL}).`,
      },
      { property: "og:title", content: "Terms & Conditions — YES Experiences Portugal" },
      {
        property: "og:description",
        content: `Booking terms for private experiences with YES Experiences Portugal — a licensed Portuguese tour operator (${LICENSE_LABEL}).`,
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "pt_PT" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/terms" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "YES Experiences Portugal — Terms & Conditions" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [
      { rel: "canonical", href: "https://yesexperiencesportugal.com/terms" },
      // Reciprocal hreflang — the PT twin at /pt/terms points back with the
      // identical set. Emitted from the shared helper so both stay in sync.
      ...localeAlternateLinks("/terms"),
    ],
    scripts: [
      jsonLdScript(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Terms & Conditions", path: "/terms" },
        ]),
      ),
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <section className="public-page-header bg-[color:var(--ivory)] py-16 md:py-24">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow className="mb-5">Legal</Eyebrow>
          <SectionTitle as="h1" size="anchor" spacing="normal">
            Terms &amp; <SectionTitle.Em>conditions.</SectionTitle.Em>
          </SectionTitle>
          <span aria-hidden="true" className="gold-rule mt-8 block max-w-[3rem]" />

          <div className="mt-10 space-y-7 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            <p>
              YES Experiences Portugal is a licensed Portuguese tour operator ({LICENSE_LABEL})
              based in Sesimbra, designing private journeys across Portugal, with pickups from
              Lisbon, Cascais, Sintra, Sesimbra and Setúbal. By making a reservation with us you
              agree to the terms below, which govern the booking, payment, cancellation and conduct
              of your private experience.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Bookings & payment
            </h2>
            <p>
              Reservations are confirmed once payment is received. Prices shown are per private
              group unless stated otherwise. All experiences are operated by YES or carefully
              selected local partners.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Cancellations
            </h2>
            <p>
              <strong className="text-[color:var(--charcoal)]">Signature Experiences.</strong>{" "}
              {CANCELLATION.signature.en}
            </p>
            <p>
              <strong className="text-[color:var(--charcoal)]">
                Studio, Travel Designer, Corporate, Moments and other custom-built experiences.
              </strong>{" "}
              {CANCELLATION.custom.en} We will always do our best to reschedule when possible.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Liability
            </h2>
            <p>
              YES Experiences Portugal carries the insurance required by Portuguese tourism law.
              Guests participate in activities at their own discretion and must disclose any
              condition that affects their ability to take part.
            </p>
            <h2
              id="dispute-resolution"
              className="serif scroll-mt-28 text-[1.4rem] text-[color:var(--charcoal)] font-medium"
            >
              Alternative dispute resolution (RAL)
            </h2>
            <p>
              If a dispute with us cannot be resolved directly, consumers may turn to an
              alternative dispute resolution (RAL) entity under Portuguese Law no. 144/2015. The
              list of authorised RAL entities is published on the Portuguese Consumer Portal at{" "}
              <a
                className="underline decoration-[color:var(--gold)]/50 hover:text-[color:var(--teal)]"
                href="https://www.consumidor.gov.pt"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.consumidor.gov.pt
              </a>
              . Complaints can also be submitted through the official Livro de Reclamações.
            </p>
            <p className="text-[13px] text-[color:var(--charcoal-soft)]/80">
              For the full operator terms, contact us at{" "}
              <a
                className="underline decoration-[color:var(--gold)]/50 hover:text-[color:var(--teal)]"
                href={EMAIL_HREF}
              >
                {EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
