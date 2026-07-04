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
    q: "What is the difference between Signature, Studio and Travel Designer?",
    a: (
      <>
        Signature is a ready-to-book private day. Studio designs a private day in real time around
        your mood, group and rhythm. Travel Designer is a full multi-day Portugal journey,
        composed by a local and delivered as a travel file.
      </>
    ),
  },
  {
    q: "Can I customise a Signature day?",
    a: (
      <>
        Yes. Every Signature day can be adjusted — pace, stops, lunch, timing — within the same
        route. For deeper changes across regions, a Travel Designer is the right path.
      </>
    ),
  },
  {
    q: "Do I speak directly with a local designer?",
    a: (
      <>
        Always. A local from our team takes your request personally — never a call centre, never a
        chatbot. For Travel Designer journeys, the conversation begins before anything is
        confirmed.
      </>
    ),
  },
  {
    q: "How far in advance should I book?",
    a: (
      <>
        Signature and Studio days are usually available within a few days’ notice. For Travel
        Designer journeys, two to four weeks gives us room to design properly; peak season fills
        earlier.
      </>
    ),
  },
  {
    q: "What happens after I submit a request?",
    a: (
      <>
        A local replies personally, usually within the hour. We confirm the details, share a clear
        proposal, and only then ask for confirmation — no pressure, no automated funnels.
      </>
    ),
  },
  {
    q: "Do you offer private tours from Lisbon?",
    a: (
      <>
        Yes. Every YES experience is fully private — your group only, your own local host, and a
        car dedicated to your day. We depart from Lisbon (hotel or address pickup) across Sintra,
        Arrábida, Comporta, Évora, Alentejo and beyond.
      </>
    ),
  },
  {
    q: "Can I book a private wine tour from Lisbon?",
    a: (
      <>
        Yes. Our most-loved wine days visit family wineries in Arrábida, Azeitão and the Alentejo —
        private tastings, long lunches with a view, and no marketplace groups. Reserve as a
        Signature day or design your own in the Studio.
      </>
    ),
  },
  {
    q: "Can you plan a proposal in Portugal?",
    a: (
      <>
        Yes. Proposals are one of our specialities — cliff-top viewpoints, private beaches, quiet
        vineyards, or a candle-lit table at sunset. Location, timing, photography and every detail
        arranged discreetly.
      </>
    ),
  },
  {
    q: "Do you create corporate experiences in Portugal?",
    a: (
      <>
        Yes. Corporate days, client hospitality, incentives and private groups of any size —
        transport, venues, suppliers and timing handled end to end, with invoice and DMC support.
      </>
    ),
  },
  {
    q: "Can a Travel Designer plan a multi-day Portugal itinerary?",
    a: (
      <>
        Yes. A local Travel Designer composes full multi-day journeys — honeymoons, family
        journeys, celebrations, coast-to-Alentejo routes and beyond — delivered as a curated travel
        file, written around you.
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
          <h2
            id="faq-title"
            className="serif mt-4 text-[1.9rem] sm:text-[2.2rem] md:text-[2.6rem] leading-[1.1] md:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium"
          >
            A few things,{" "}
            <span className="italic font-normal text-[color:var(--teal)]">before you decide.</span>
          </h2>
          <div className="gold-divider mt-6 mx-auto w-20" />
        </div>

        {/* ── Questions ─────────────────────────────────────── */}
        <div className="reveal mt-8 md:mt-10 max-w-3xl mx-auto">
          <Accordion type="single" collapsible defaultValue={DEFAULT_OPEN} className="space-y-3">
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
