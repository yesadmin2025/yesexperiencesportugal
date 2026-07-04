/**
 * RealReviewsStrip — three real verified guest reviews sourced from
 * the featured Signature tours' Viator meta. No invented content —
 * every quote is a real Viator/Tripadvisor/etc review already used
 * on the tour detail page.
 */
import { Star } from "lucide-react";
import { getViatorMeta } from "@/data/signatureToursViator";

const FEATURED_IDS = [
  "arrabida-wine-allinclusive",
  "sintra-cascais",
  "arrabida-boat",
  "troia-comporta",
] as const;

type Q = {
  title: string;
  text: string;
  author: string;
  source: string;
  tourId: string;
  rating: number;
};

function pickQuotes(limit = 3): Q[] {
  const all: Q[] = [];
  for (const id of FEATURED_IDS) {
    const meta = getViatorMeta(id);
    if (!meta) continue;
    const r = (meta.topReviews ?? []).find((x) => x.text?.trim());
    if (!r) continue;
    all.push({
      title: r.title,
      text: r.text.length > 180 ? `${r.text.slice(0, 177)}…` : r.text,
      author: r.author || "Verified guest",
      source: r.source ?? "Viator",
      tourId: id,
      rating: meta.rating,
    });
    if (all.length >= limit) break;
  }
  return all;
}

export function RealReviewsStrip() {
  const quotes = pickQuotes(3);
  if (quotes.length === 0) return null;

  return (
    <section
      className="section-enter py-14 md:py-20 bg-[color:var(--ivory)] border-b border-[color:var(--border)]"
      aria-labelledby="real-reviews-title"
    >
      <div className="container-x">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <span className="he-eyebrow-bar mb-5">Real guest reviews</span>
          <h2
            id="real-reviews-title"
            className="font-display mt-3 text-[1.8rem] sm:text-[2.1rem] md:text-[2.95rem] leading-[1.12] md:leading-[1.02] tracking-[-0.014em] text-[color:var(--charcoal)] font-medium"
          >
            In the words of{" "}
            <span className="font-serif italic font-normal text-[color:var(--teal)]">
              recent guests.
            </span>
          </h2>
        </div>

        <ul className="grid gap-5 md:grid-cols-3 max-w-5xl mx-auto list-none p-0">
          {quotes.map((q, i) => (
            <li
              key={i}
              className="reveal-stagger rounded-[6px] border border-[color:var(--border)] bg-white p-5 md:p-6 flex flex-col"
            >
              <div className="inline-flex items-center gap-0.5 text-[color:var(--gold)]" aria-label={`${q.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={13} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-3 font-medium text-[color:var(--charcoal)] text-[14.5px] leading-[1.4]">
                {q.title}
              </p>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-[color:var(--charcoal)]/85">
                “{q.text}”
              </p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/60">
                {q.author} · via {q.source}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default RealReviewsStrip;
