import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

// Real Viator-sourced operation photography from the catalog —
// chosen to match real stops along the journey's route. No stock,
// no fabricated imagery.
import imgCascais from "@/assets/tours/sintra-cascais/cascais.jpg";
import imgObidos from "@/assets/tours/fatima-nazare-obidos/obidos.jpg";
import imgNazare from "@/assets/tours/fatima-nazare-obidos/nazare.jpg";
import imgCostaVicentina from "@/assets/exp-coastal.jpg";

/**
 * Recent journey — anonymized proof block.
 *
 * Shows a real multi-day private journey we recently designed and
 * delivered, fully anonymized (no traveller name, no exact dates,
 * no hotel names). The point of this section is PROOF, not promise:
 * "here is a real route we built, here are real regions, this is
 * how a long journey actually unfolds with us."
 *
 * Source: a real private travel file for a 15-day journey from
 * Lisbon to the Costa Vicentina, via the Atlantic coast, Serra da
 * Estrela and Peneda-Gerês. Private details stripped.
 *
 * Imagery is real Viator-sourced operation photography from our own
 * catalog, matched to actual stops along the route. Regions we don't
 * have photography for (Serra da Estrela, Gerês) are intentionally
 * represented only in the text route, never with stock photos.
 */
const CHAPTERS = [
  {
    n: "01",
    region: "Lisbon · Atlantic coast",
    nights: "1 + 3 nights",
    note: "Arrival and the medieval west — Óbidos as a base.",
    img: imgCascais,
    alt: "Cascais coastline, Atlantic Portugal",
  },
  {
    n: "02",
    region: "Óbidos",
    nights: "3 nights",
    note: "Walled village base for Nazaré, Peniche and slow Atlantic days.",
    img: imgObidos,
    alt: "Medieval walled village of Óbidos",
  },
  {
    n: "03",
    region: "Nazaré · Peniche",
    nights: "Day loops",
    note: "Dramatic cliffs, fishing villages and ocean light.",
    img: imgNazare,
    alt: "Nazaré cliffs above the Atlantic",
  },
  {
    n: "04",
    region: "Costa Vicentina",
    nights: "3 nights",
    note: "Three full days on one of Europe's most pristine coastlines.",
    img: imgCostaVicentina,
    alt: "Wild beach on the Costa Vicentina",
  },
] as const;

const STATS = [
  { value: "15", label: "Days" },
  { value: "6", label: "Regions" },
  { value: "5", label: "Properties" },
  { value: "100%", label: "Confirmed in advance" },
] as const;

export function RecentJourney() {
  return (
    <section
      id="multi-day"
      className="he-section-rule section-enter section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
      aria-labelledby="recent-journey-title"
    >
      <div className="container-x">
        <div className="reveal text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <span className="he-eyebrow-bar mb-5">A recent journey</span>
          <h2
            id="recent-journey-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.6rem] leading-[1.1] md:leading-[1.0] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium"
          >
            15 days, Lisbon to the{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              Costa Vicentina.
            </span>
          </h2>
          <p className="mt-4 text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.65] max-w-md mx-auto">
            A real private journey we recently designed — anonymized.
            Coast, mountain, forest and Atlantic cliff, with every
            night reserved before departure.
          </p>
        </div>

        {/* Route summary */}
        <div className="reveal max-w-3xl mx-auto mb-10 md:mb-12 text-center">
          <p className="text-[12px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] font-semibold">
            The route
          </p>
          <p className="mt-3 serif text-[1.1rem] md:text-[1.35rem] leading-[1.45] text-[color:var(--charcoal)]">
            Lisbon · Óbidos · Serra da Estrela · Peneda-Gerês · Costa Vicentina · Lisbon
          </p>
        </div>

        {/* Stats strip */}
        <ul className="reveal grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-4xl mx-auto mb-12 md:mb-14">
          {STATS.map((s) => (
            <li
              key={s.label}
              className="rounded-[4px] border border-[color:var(--border)] bg-[color:var(--sand)] px-4 py-4 text-center"
            >
              <div className="serif text-[1.6rem] md:text-[2rem] leading-none text-[color:var(--teal)]">
                {s.value}
              </div>
              <div className="mt-2 text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)] font-semibold">
                {s.label}
              </div>
            </li>
          ))}
        </ul>

        {/* Chapter cards — 4 real regions */}
        <ul
          className="he-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7 list-none p-0"
          aria-label="Journey chapters"
        >
          {CHAPTERS.map((c) => (
            <li key={c.n} className="reveal-stagger">
              <article className="he-card-lift group relative flex flex-col h-full overflow-hidden rounded-[6px] border border-[color:var(--border)] bg-[color:var(--ivory)] transition-all duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-[color:var(--charcoal)]/30 hover:shadow-[0_18px_40px_-22px_rgba(46,46,46,0.32)]">
                <div className="he-image-cinema he-image-rise relative block aspect-[4/5] overflow-hidden bg-[color:var(--card)]">
                  <img
                    src={c.img}
                    alt={c.alt}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.05]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent"
                  />
                  <div className="absolute inset-x-0 top-0 p-4 md:p-5 flex items-start justify-between gap-3">
                    <span className="serif text-[1.2rem] leading-none text-[color:var(--gold)] drop-shadow-sm">
                      {c.n}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.24em] text-white/90 rounded-full bg-black/35 px-2.5 py-1">
                      {c.nights}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-white">
                    <h3 className="serif text-[1.2rem] md:text-[1.35rem] leading-[1.18] text-white text-balance">
                      {c.region}
                    </h3>
                  </div>
                </div>
                <div className="p-5 md:p-6">
                  <p className="text-[13.5px] leading-[1.55] text-[color:var(--charcoal-soft)]">
                    {c.note}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {/* Trust + CTA */}
        <div className="reveal mt-12 md:mt-14 max-w-2xl mx-auto text-center">
          <p className="serif italic text-[1.05rem] md:text-[1.2rem] text-[color:var(--teal)] leading-snug">
            “Every overnight reserved. Every route mapped. Every day
            designed with intention.”
          </p>
          <span
            className="gold-rule mt-5 mx-auto max-w-[64px] block"
            aria-hidden="true"
          />
          <p className="mt-5 text-[14px] md:text-[15px] text-[color:var(--charcoal-soft)] leading-[1.65]">
            This is one journey of many. Tell us where you want to go
            and we'll shape something equally specific — with you, not
            for you.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/multi-day"
              className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-[color:var(--teal)] px-6 py-3 text-[13px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] transition-colors hover:bg-[color:var(--teal-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
            >
              Plan a multi-day journey
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/25 px-6 py-3 text-[13px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] transition-colors hover:border-[color:var(--charcoal)]/60"
            >
              Talk to a local
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RecentJourney;
