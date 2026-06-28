import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — YES experiences Portugal" },
      {
        name: "description",
        content:
          "How YES experiences Portugal collects, uses and protects your personal data, in line with the EU General Data Protection Regulation (GDPR).",
      },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <section className="bg-[color:var(--ivory)] py-20 md:py-28">
        <div className="container-x max-w-2xl mx-auto">
          <span className="he-eyebrow-bar mb-5">Legal</span>
          <h1 className="serif mt-3 text-[2rem] md:text-[2.8rem] leading-[1.1] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium">
            Privacy <span className="italic font-normal text-[color:var(--teal)]">policy.</span>
          </h1>
          <span aria-hidden="true" className="gold-rule mt-8 block max-w-[3rem]" />

          <div className="mt-10 space-y-7 text-[15px] leading-[1.75] text-[color:var(--charcoal-soft)]">
            <p>
              We keep things simple. YES experiences Portugal only collects the information needed
              to design your private experience, confirm your booking, and stay in touch about your
              trip.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              What we collect
            </h2>
            <p>
              Name, email, phone number, party size, travel dates and any preferences you share with
              us. Payment details are handled by our payment partners and never stored on our
              servers.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              How we use it
            </h2>
            <p>
              To plan and operate your experience, to send booking confirmations and trip
              information, and — only if you opt in — occasional editorial notes about Portugal. We
              never sell your data.
            </p>
            <h2 className="serif text-[1.4rem] text-[color:var(--charcoal)] font-medium">
              Your rights
            </h2>
            <p>
              Under GDPR you can access, correct or delete your personal data at any time. Write to
              us and we will respond within 30 days.
            </p>
            <p className="text-[13px] text-[color:var(--charcoal-soft)]/80">
              Data requests:{" "}
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
