/**
 * GuestQuotes — homepage social proof row below the platform logos.
 *
 * Three editorial review cards with placeholder structure. Real quote
 * text is filled in by the brand owner; we never invent reviews.
 * Each card shows: guest first name + last initial, source platform,
 * 5-star rating, and a short verified quote.
 */
import { Star } from "lucide-react";

type GuestQuote = {
  name: string;
  source: "Google" | "Tripadvisor" | "Viator" | "GetYourGuide" | "Trustpilot";
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
};

/**
 * Placeholder structure — replace `quote` and `name` with real review text
 * copy/pasted from the matching platform. Do NOT invent reviews.
 */
const GUEST_QUOTES: GuestQuote[] = [
  {
    name: "[Guest first name + last initial]",
    source: "Google",
    rating: 5,
    quote:
      "[Paste a real, short verified Google review here — keep it 1–2 sentences, no edits.]",
  },
  {
    name: "[Guest first name + last initial]",
    source: "Tripadvisor",
    rating: 5,
    quote:
      "[Paste a real, short verified Tripadvisor review here — 1–2 sentences, verbatim.]",
  },
  {
    name: "[Guest first name + last initial]",
    source: "Viator",
    rating: 5,
    quote:
      "[Paste a real, short verified Viator review here — 1–2 sentences, verbatim.]",
  },
];

export function GuestQuotes() {
  return (
    <div className="mt-10 md:mt-14">
      <div className="text-center mb-6 md:mb-8">
        <p className="text-[10.5px] md:text-[11px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
          What guests actually say
        </p>
      </div>

      <ul
        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 list-none p-0"
        aria-label="Verified guest reviews"
      >
        {GUEST_QUOTES.map((r, i) => (
          <li key={i}>
            <figure className="h-full bg-[color:var(--ivory)] border border-[color:var(--border)] p-5 md:p-6 flex flex-col">
              <div
                className="flex gap-0.5 text-[color:var(--gold)] mb-3"
                role="img"
                aria-label={`Rated ${r.rating} out of 5 stars`}
              >
                {Array.from({ length: r.rating }).map((_, j) => (
                  <Star key={j} size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                ))}
              </div>
              <blockquote className="text-[14px] md:text-[14.5px] leading-relaxed text-[color:var(--charcoal)]">
                “{r.quote}”
              </blockquote>
              <figcaption className="mt-4 pt-3 border-t border-[color:var(--border)] text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal-soft)] flex items-center justify-between gap-3">
                <span>{r.name}</span>
                <span className="text-[color:var(--charcoal-soft)]/80">via {r.source}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <p className="mt-5 md:mt-6 text-center text-[10.5px] md:text-[11px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal-soft)]/85">
        Verified reviews across Google, Tripadvisor and Viator.
      </p>
    </div>
  );
}

export default GuestQuotes;
