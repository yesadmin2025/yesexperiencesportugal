import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getFaqForTour } from "@/content/seo-faq";

/**
 * On-page FAQ for a Signature tour. Renders the same set of Q&A that the
 * route emits as FAQPage JSON-LD in <head> — Google requires the FAQ text
 * to be visible on the page for rich-result eligibility.
 *
 * For wine-focused Signatures (Arrábida, Azeitão, Évora & Alentejo, Roman
 * Heritage), a wine-specific overlay from WINE_TOUR_FAQ_BY_ID is prepended
 * to SIGNATURE_FAQ so the page targets "wine tour lisbon" / "wine tasting
 * near lisbon" / "alentejo wine tour from lisbon" queries.
 */
export function TourFaq({ tourId }: { tourId: string }) {
  const items = getFaqForTour(tourId);
  if (items.length === 0) return null;
  return (
    <section
      id="tour-faq"
      className="py-14 md:py-16 bg-[color:var(--ivory)] border-y border-[color:var(--border)]"
      aria-labelledby="tour-faq-title"
    >
      <div className="container-x max-w-3xl">
        <div className="text-center">
          <Eyebrow flank>Before you book</Eyebrow>
          <h2
            id="tour-faq-title"
            className="serif mt-4 text-[1.6rem] sm:text-[1.9rem] md:text-[2.2rem] leading-[1.1] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium"
          >
            A few things,{" "}
            <span className="italic font-normal text-[color:var(--teal)]">before you decide.</span>
          </h2>
          <div className="gold-divider mt-6 mx-auto w-20" />
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue="item-0"
          className="mt-8 md:mt-10 space-y-3"
        >
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="group relative border border-[color:var(--border)] hover:border-[color:var(--teal)]/40 bg-white/80 backdrop-blur-sm transition-colors duration-200 [&[data-state=open]]:border-[color:var(--teal)]/55 [&[data-state=open]]:shadow-[var(--shadow-card)]"
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
    </section>
  );
}
