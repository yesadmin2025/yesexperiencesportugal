import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

// Pages from a real, anonymized private travel file we delivered.
// Used as proof of craft for the Bespoke Travel Designer service —
// not promotional renders, the actual document.
import pageCover from "@/assets/travel-file/cover.jpg";
import pageRoute from "@/assets/travel-file/route.jpg";
import pageReservations from "@/assets/travel-file/reservations.jpg";
import pageDay from "@/assets/travel-file/day.jpg";
import pageAccommodations from "@/assets/travel-file/accommodations.jpg";

/**
 * Bespoke Travel Designer — proof block.
 *
 * Positions the bespoke travel-design service as a flagship offer
 * (alongside the Studio). Uses anonymized pages from a real
 * delivered private travel file as proof. No client names, no
 * dates, no hotel pricing — only the craft.
 */
const PAGES = [
  { src: pageCover, alt: "Cover page of a private travel file — Portugal, Beyond the Postcards" },
  { src: pageRoute, alt: "The route — a hand-designed multi-region itinerary across Portugal" },
  { src: pageReservations, alt: "Confirmed reservations — every overnight reserved before departure" },
  { src: pageDay, alt: "A day in the file — morning, lunch, afternoon, sunset, evening" },
  { src: pageAccommodations, alt: "Where you stay — properties chosen to deepen each region" },
] as const;

const PILLARS = [
  {
    label: "Designed with you",
    body: "It begins with a conversation — your pace, your taste, the Portugal you want to feel.",
  },
  {
    label: "Built by a local",
    body: "A real designer, on the ground, shaping a route only someone from here would draw.",
  },
  {
    label: "Delivered as a book",
    body: "Your journey arrives as a private travel file: route, days, properties, all confirmed.",
  },
] as const;

export function RecentJourney() {
  return (
    <section
      id="multi-day"
      className="he-section-rule section-enter section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
      aria-labelledby="bespoke-designer-title"
    >
      <div className="container-x">
        <div className="reveal text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="he-eyebrow-bar mb-5">Bespoke Travel Designer</span>
          <h2
            id="bespoke-designer-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.6rem] leading-[1.1] md:leading-[1.0] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            A Portugal{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              written for one traveller.
            </span>
          </h2>
          <p className="mt-5 text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.65] max-w-md mx-auto">
            Beside the Studio, our quiet flagship: a private
            travel-design service for those who want their journey
            shaped end-to-end by a local — and delivered as a book,
            not a booking.
          </p>
          <span aria-hidden="true" className="gold-rule mt-7 md:mt-8 mx-auto block max-w-[3rem]" />
        </div>

        {/* Three pillars */}
        <ul className="reveal grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-12 md:mb-16 list-none p-0">
          {PILLARS.map((p) => (
            <li
              key={p.label}
              className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--sand)] px-5 py-5 md:px-6 md:py-6"
            >
              <div className="text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
                {p.label}
              </div>
              <p className="mt-3 serif text-[1.05rem] md:text-[1.15rem] leading-[1.4] text-[color:var(--charcoal)]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>

        {/* Proof: anonymized pages from a real delivered travel file */}
        <div className="reveal max-w-4xl mx-auto text-center mb-6 md:mb-8">
          <p className="text-[12px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] font-semibold">
            What you receive
          </p>
          <p className="mt-3 serif text-[1.15rem] md:text-[1.35rem] leading-[1.4] text-[color:var(--charcoal)] italic">
            A private travel file — every route mapped, every night
            reserved, every day designed with intention.
          </p>
        </div>

        <ul
          className="he-stagger grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 list-none p-0"
          aria-label="Pages from a real anonymized private travel file"
        >
          {PAGES.map((p, i) => (
            <li
              key={p.alt}
              className={`reveal-stagger ${
                i === 0 ? "col-span-2 md:col-span-1" : ""
              }`}
            >
              <figure className="he-card-lift group relative aspect-[3/4] overflow-hidden rounded-[4px] border border-[color:var(--border)] bg-[color:var(--ivory)] shadow-[0_8px_24px_-16px_rgba(46,46,46,0.25)] transition-all duration-300 hover:shadow-[0_18px_40px_-22px_rgba(46,46,46,0.4)] hover:border-[color:var(--charcoal)]/30">
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-[700ms] ease-out group-hover:scale-[1.03]"
                />
              </figure>
            </li>
          ))}
        </ul>

        <p className="reveal mt-6 text-center text-[11.5px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] font-semibold">
          From a real private file — anonymized
        </p>

        {/* CTA */}
        <div className="reveal mt-12 md:mt-14 max-w-2xl mx-auto text-center">
          <p className="serif italic text-[1.1rem] md:text-[1.25rem] text-[color:var(--teal)] leading-snug">
            “Tell us where you want to go — we'll shape the rest.”
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/multi-day"
              className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-[color:var(--teal)] px-6 py-3 text-[13px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] transition-colors hover:bg-[color:var(--teal-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
            >
              Start the conversation
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/25 px-6 py-3 text-[13px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] transition-colors hover:border-[color:var(--charcoal)]/60"
            >
              Talk to a designer
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RecentJourney;
