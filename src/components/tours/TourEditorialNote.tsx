import { Link } from "@tanstack/react-router";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type { SignatureTour } from "@/data/signatureTours";

/**
 * TourEditorialNote — the local-stories reading experience, on a Signature day
 * page: why we designed the day, the rhythm it keeps, and two moments people
 * remember, followed by its own booking CTA.
 *
 * Every sentence is assembled from authoritative tour data (region, duration,
 * pace, fitsBest, blurb and the real stop stories). Nothing is invented here.
 */
export function TourEditorialNote({ tour }: { tour: SignatureTour }) {
  const moments = (tour.stops ?? []).filter((s) => s.story).slice(0, 2);
  const pace = (tour.pace ?? []).filter(Boolean);

  return (
    <section className="py-14 md:py-20 bg-[color:var(--sand)]/50 border-y border-[color:var(--border)] reveal">
      <div className="container-x max-w-3xl">
        <Eyebrow flank>From our local desk</Eyebrow>
        <SectionTitle size="compact" spacing="tight">
          Why we designed <SectionTitle.Em>this day</SectionTitle.Em>
        </SectionTitle>

        <div className="prose-longform mt-6 space-y-5 text-[15.5px] leading-[1.8] text-[color:var(--charcoal-soft)]">
          <p>
            <strong className="font-medium text-[color:var(--charcoal)]">
              {tour.duration} in {tour.region}.
            </strong>{" "}
            {tour.blurb}
          </p>
          <p>
            It fits best when {tour.fitsBest.charAt(0).toLowerCase() + tour.fitsBest.slice(1)}.
            {pace.length > 0
              ? ` The rhythm we hold is ${pace.join(", ").toLowerCase()} — private guide, private vehicle, no group to wait for.`
              : " Private guide, private vehicle, no group to wait for."}
          </p>
        </div>

        {moments.length > 0 && (
          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {moments.map((m) => (
              <article
                key={m.label}
                className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-5"
              >
                <h3
                  className="serif text-[17px] leading-snug text-[color:var(--charcoal)] font-normal"
                  data-mixed-emphasis="exempt"
                >
                  {m.label}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {m.story}
                </p>
              </article>
            ))}
          </div>
        )}

        <div
          className="mt-9 flex flex-col gap-3 rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--ivory)] p-5 sm:flex-row sm:items-center sm:justify-between"
          data-testid="tour-editorial-booking-cta"
        >
          <p className="text-[14.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
            From{" "}
            <span className="font-medium text-[color:var(--charcoal)]">€{tour.priceFrom}</span> per
            person · instant confirmation, hotel pickup included.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <a
              href="#reserve"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-6 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline hover:bg-[color:var(--charcoal)]"
            >
              Check dates &amp; book
              <span aria-hidden="true" className="text-[color:var(--gold)]">
                →
              </span>
            </a>
            <Link
              to="/book"
              search={{ tour: tour.id }}
              className="inline-flex min-h-[48px] items-center justify-center font-sans text-[12px] uppercase tracking-[0.16em] font-semibold text-[color:var(--teal)] underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--charcoal)]"
            >
              Tell us your dates
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TourEditorialNote;
