/**
 * LandingTourCredibility — visible rating + real review snippets for
 * SEO landing pages that map to a Signature parent tour.
 *
 * Mirrors the data emitted by `withAggregateAndReviews()` so Google
 * sees the rating + reviews in JSON-LD AND on the page (rich-snippet
 * policy requirement). All content is sourced from the verified
 * Viator meta — never invented.
 */
import { Star } from "lucide-react";
import { getViatorMeta } from "@/data/signatureToursViator";

export function LandingTourCredibility({
  parentTourId,
  className = "",
  headline = "Loved by guests",
}: {
  parentTourId: string;
  className?: string;
  headline?: string;
}) {
  const meta = getViatorMeta(parentTourId);
  if (!meta || meta.reviewCount === 0) return null;

  const reviews = (meta.topReviews ?? []).filter((r) => r.text?.trim()).slice(0, 5);

  return (
    <section
      className={`py-16 md:py-20 bg-[color:var(--ivory)] ${className}`}
      aria-labelledby="landing-reviews-heading"
    >
      <div className="container-x max-w-3xl text-center">
        <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-3">
          {headline}
        </span>
        <h2
          id="landing-reviews-heading"
          className="font-display font-medium text-[1.5rem] md:text-[1.9rem] leading-[1.2] text-[color:var(--charcoal)]"
        >
          <span className="inline-flex items-center gap-1.5 align-middle text-[color:var(--gold)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={18} fill="currentColor" strokeWidth={0} />
            ))}
          </span>{" "}
          <span className="tabular-nums">{meta.rating.toFixed(1)}</span>
          <span className="text-[color:var(--charcoal-soft)] font-normal">
            {" "}· {meta.reviewCount} verified guest reviews
          </span>
        </h2>
        <p className="mt-3 text-[13px] text-[color:var(--charcoal-soft)]">
          Verified by{" "}
          <a
            href={meta.viatorUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline-offset-2 hover:underline text-[color:var(--teal)]"
          >
            Viator
          </a>
          {meta.recommendedPct ? ` · recommended by ${meta.recommendedPct}% of travellers` : ""}.
        </p>
      </div>

      {reviews.length > 0 && (
        <ul className="container-x mt-10 grid gap-5 md:grid-cols-2 max-w-5xl list-none p-0">
          {reviews.map((r, i) => (
            <li
              key={i}
              className="rounded-lg border border-[color:var(--charcoal)]/10 bg-white p-5 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="inline-flex items-center gap-0.5 text-[color:var(--gold)]"
                  aria-label="5 out of 5"
                >
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={13} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
                <span className="text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal)]/55">
                  via {r.source ?? "Viator"}
                </span>
              </div>
              <p className="mt-3 font-medium text-[color:var(--charcoal)]">{r.title}</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[color:var(--charcoal)]/85">
                {r.text}
              </p>
              <p className="mt-3 text-[12px] text-[color:var(--charcoal)]/60">
                {r.author}
                {r.date ? ` · ${r.date}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default LandingTourCredibility;
