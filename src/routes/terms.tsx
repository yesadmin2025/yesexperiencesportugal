import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  CANCELLATION_SHORT,
  CANCELLATION_SIGNATURE,
  CANCELLATION_STUDIO,
} from "@/config/business-nap";
import ogImg from "@/assets/edit-coastal-road.jpg";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Terms and conditions for booking private experiences with YES Experiences Portugal — a licensed Portuguese tour operator (RNAAT nº 31/2023).",
      },
      { property: "og:title", content: "Terms & Conditions — YES Experiences Portugal" },
      {
        property: "og:description",
        content:
          "Booking terms for private experiences with YES Experiences Portugal — a licensed Portuguese tour operator (RNAAT nº 31/2023).",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/terms" },
      { property: "og:image", content: `https://yesexperiencesportugal.com${ogImg}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "YES Experiences Portugal — Terms & Conditions" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://yesexperiencesportugal.com${ogImg}` },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/terms" }],
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
            Terms & <span className="italic font-normal text-[color:var(--teal)]">conditions.</span>
          </h1>
          <span aria-hidden="true" className="gold-rule mt-8 block max-w-[3rem]" />

          <div className="mt-10 space-y-7 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            <p>
              YES Experiences Portugal is a licensed Portuguese tour operator (RNAAT nº 31/2023)
              based in Sesimbra, designing private journeys across Portugal, with pickups from
              Lisbon, Cascais, Sintra, Sesimbra and Setúbal. By making a reservation with us
              you agree to the terms below, which govern the booking, payment, cancellation and
              conduct of your private experience.
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
              {CANCELLATION_SHORT} {CANCELLATION_SIGNATURE} {CANCELLATION_STUDIO} We will always do
              our best to reschedule when possible.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Liability
            </h2>
            <p>
              YES Experiences Portugal carries the insurance required by Portuguese tourism law.
              Guests participate in activities at their own discretion and must disclose any
              condition that affects their ability to take part.
            </p>
            <p className="text-[13px] text-[color:var(--charcoal-soft)]/80">
              For the full operator terms, contact us at{" "}
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
