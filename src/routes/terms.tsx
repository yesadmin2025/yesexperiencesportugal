import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — YES experiences Portugal" },
      {
        name: "description",
        content:
          "Terms and conditions for booking private experiences with YES experiences Portugal — a licensed Portuguese tour operator (RNAVT).",
      },
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
          <span className="he-eyebrow-bar mb-5">Legal</span>
          <h1 className="serif mt-3 text-[2rem] md:text-[2.8rem] leading-[1.1] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium">
            Terms & <span className="italic font-normal text-[color:var(--teal)]">conditions.</span>
          </h1>
          <span aria-hidden="true" className="gold-rule mt-8 block max-w-[3rem]" />

          <div className="mt-10 space-y-7 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            <p>
              YES experiences Portugal is a licensed Portuguese tour operator (RNAVT) based in
              Lisbon. By making a reservation with us you agree to the terms below, which govern the
              booking, payment, cancellation and conduct of your private experience.
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
              Free cancellation up to 48 hours before the experience start time. Cancellations made
              within 48 hours are non-refundable. We will always do our best to reschedule when
              possible.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Liability
            </h2>
            <p>
              YES experiences Portugal carries the insurance required by Portuguese tourism law.
              Guests participate in activities at their own discretion and must disclose any
              condition that affects their ability to take part.
            </p>
            <p className="text-[13px] text-[color:var(--charcoal-soft)]/80">
              For the full operator terms, contact us at{" "}
              <a
                className="underline decoration-[color:var(--gold)]/50 hover:text-[color:var(--teal)]"
                href="mailto:hello@yesexperiencesportugal.com"
              >
                hello@yesexperiencesportugal.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
