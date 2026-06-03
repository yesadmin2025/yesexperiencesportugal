import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * FAQ — conversion support.
 *
 * Eight high-intent questions, in the order that matches how a guest
 * actually decides: how to book, which path fits, can I talk to a
 * human, is it private, occasion paths, multi-day, what happens next.
 * Answers are short, human, reassuring — never robotic.
 *
 * The first three answers are open by default so the highest-intent
 * objections (booking, the three paths, talking to a local) are
 * resolved without an extra click.
 *
 * Closing micro-section ends the page on the human escape hatch:
 * "Not sure yet?" → Talk to a Local. Per brand rules, the primary
 * CTA goes to the contact form, not WhatsApp.
 */
const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "Can I book directly on the website?",
    a: (
      <>
        Yes. You can confirm a Signature, a Tailored Signature or a journey
        you build in the Studio in a few minutes — no forms, no waiting. You
        receive your confirmation and full details right away, and a local
        reaches out within one working day to align the last details.
      </>
    ),
  },
  {
    q: "What is the difference between Signature, Tailored and Studio?",
    a: (
      <>
        Signature is a ready-to-book private experience — confirmed as it is, with everything included.
        <br />
        Tailored lets you adjust selected details inside a Signature: pickup location, language, group size or add-ons.
        <br />
        Studio lets you build from scratch in real time — choose your mood, who's coming and your rhythm, and we draft a private day with real stops and a live price in about 90 seconds.
      </>
    ),
  },
  {
    q: "Can I speak with a local?",
    a: (
      <>
        Yes. After every confirmation — Signature, Tailored or Studio — a local from our team reaches out within one working day via WhatsApp to align the final details. For Bespoke Journeys, the conversation starts before anything is confirmed.
      </>
    ),
  },
  {
    q: "Are experiences private?",
    a: (
      <>
        Yes. Every YES experience is private — your group only. We do not combine groups or run shared tours.
      </>
    ),
  },
  {
    q: "Can I plan proposals or celebrations?",
    a: (
      <>
        Yes. We plan the location, timing and details discreetly with local knowledge. Get in touch and we handle everything — from a quiet cliffside moment to a full celebration for a larger group.
      </>
    ),
  },
  {
    q: "Do you handle corporate and private groups?",
    a: (
      <>
        Yes — from small executive groups to larger incentive programmes. Full logistics, transport coordination, invoice and DMC support included.
      </>
    ),
  },
  {
    q: "Can I create multi-day journeys?",
    a: (
      <>
        Yes. Multi-day journeys are designed in conversation with our local team — properties confirmed, routes mapped, every day planned with real timing. You receive a complete private travel file before departure.
      </>
    ),
  },
  {
    q: "What happens after I confirm?",
    a: (
      <>
        You receive your booking confirmation and full experience details immediately. A local from our team reaches out within one working day via WhatsApp to confirm pickup, align any final details and answer any questions.
      </>
    ),
  },
  {
    q: "Can I adjust the experience after booking?",
    a: (
      <>
        Yes, within reason. Contact us via WhatsApp and we will do our best to accommodate changes. Significant changes to itinerary or group size may affect pricing.
      </>
    ),
  },
  {
    q: "What if my plans change?",
    a: (
      <>
        Free cancellation up to 48 hours before your experience for Signature and Studio bookings. Bespoke Journeys and group bookings have their own terms, shared at the time of confirmation.
      </>
    ),
  },
];

const DEFAULT_OPEN = "item-0";

export function FAQ() {
  return (
    <section
      id="faq"
      className="he-section-rule py-16 md:py-20 bg-[color:var(--ivory)]"
      aria-labelledby="faq-title"
    >
      <div className="container-x">
        {/* ── Intro ─────────────────────────────────────────────
            Approved copy — do not paraphrase without explicit ask.
            Reassures before the questions even start. */}
        <div className="reveal max-w-3xl mx-auto text-center">
          <span className="he-eyebrow-bar flank">Before you book</span>
          <h2 id="faq-title" className="serif text-[2.4rem] sm:text-[2.8rem] md:text-[4rem] mt-4 leading-[1.05] md:leading-[0.98] tracking-[-0.02em] text-[color:var(--charcoal)] font-medium">
            Still wondering{" "}
            <span className="italic font-normal text-[color:var(--teal)]">how it works?</span>
          </h2>
          <p className="mt-5 text-[15.5px] md:text-[16.5px] leading-[1.65] text-[color:var(--charcoal)] max-w-xl mx-auto">
            It's simpler than it looks — and you're never on your own.
          </p>
          <div className="gold-divider mt-8 mx-auto w-24" />
        </div>

        {/* ── Questions ─────────────────────────────────────── */}
        <div className="reveal mt-10 md:mt-12 max-w-3xl mx-auto">
          <Accordion
            type="single"
            collapsible
            defaultValue={DEFAULT_OPEN}
            className="space-y-3"
          >
            {FAQS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="reveal-stagger group relative border border-[color:var(--border)] hover:border-[color:var(--teal)]/40 bg-white/80 backdrop-blur-sm transition-colors duration-200 [&[data-state=open]]:border-[color:var(--teal)]/55 [&[data-state=open]]:shadow-[var(--shadow-card)] [&[data-state=open]]:before:content-[''] [&[data-state=open]]:before:absolute [&[data-state=open]]:before:left-0 [&[data-state=open]]:before:top-3 [&[data-state=open]]:before:bottom-3 [&[data-state=open]]:before:w-[2px] [&[data-state=open]]:before:bg-[color:var(--gold)]"
              >
                <AccordionTrigger className="px-5 md:px-6 py-4 md:py-5 text-left text-[15px] md:text-[17px] serif text-[color:var(--charcoal)] hover:no-underline hover:text-[color:var(--teal)] transition-colors duration-200 [&[data-state=open]]:text-[color:var(--teal)]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-5 md:px-6 pb-5 md:pb-6 pt-0 text-[14.5px] md:text-[15px] leading-[1.65] text-[color:var(--charcoal)]">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </div>
    </section>
  );
}
