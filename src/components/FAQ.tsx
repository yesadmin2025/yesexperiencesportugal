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
    q: "What is the difference between Signature, Studio and Bespoke?",
    a: (
      <>
        Signature is a ready-to-book private day. Studio designs a private day in real time around your mood, group and rhythm. Bespoke is a multi-day Portugal, composed by a local and delivered as a travel file.
      </>
    ),
  },
  {
    q: "Can I speak with a local?",
    a: (
      <>
        Yes. After every booking a local from our team reaches out within one working day to align the final details. For Bespoke journeys, the conversation starts before anything is confirmed.
      </>
    ),
  },
  {
    q: "What if my plans change?",
    a: (
      <>
        Free cancellation up to 48 hours before your experience for Signature and Studio bookings. Bespoke journeys have their own terms, shared at confirmation.
      </>
    ),
  },
];

const DEFAULT_OPEN = "item-0";

export function FAQ() {
  return (
    <section
      id="faq"
      className="he-section-rule py-12 md:py-14 bg-[color:var(--ivory)]"
      aria-labelledby="faq-title"
    >
      <div className="container-x">
        <div className="reveal max-w-3xl mx-auto text-center">
          <span className="he-eyebrow-bar flank">Before you book</span>
          <h2 id="faq-title" className="serif text-[1.8rem] sm:text-[2.1rem] md:text-[2.6rem] mt-4 leading-[1.1] md:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium">
            A few things, before you decide.
          </h2>
          <div className="gold-divider mt-6 mx-auto w-20" />
        </div>

        {/* ── Questions ─────────────────────────────────────── */}
        <div className="reveal mt-8 md:mt-10 max-w-3xl mx-auto">
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
