/**
 * GuideBookingCta — early, high-intent booking card inside a Local Story.
 *
 * Day-trip guides (Arrábida, Sesimbra) answer a booking question, so the
 * reader should be able to act without scrolling to the footer aside.
 *
 * Truth rule: every fact rendered here (title, duration, from-price) is read
 * from `signatureTours` — nothing is invented or duplicated in content data.
 * Attribution is captured at click time, exactly like every other guide link,
 * so the destination stays a clean canonical URL.
 */

import { Link } from "@tanstack/react-router";

import { signatureTours } from "@/data/signatureTours";
import { guideRefDataAttrs } from "@/lib/guide-attribution-inline";
import { recordGuideLinkClick } from "@/lib/guide-attribution";

export function GuideBookingCta({
  guideSlug,
  tourSlug,
  lead,
}: {
  guideSlug: string;
  tourSlug: string;
  lead?: string;
}) {
  const tour = signatureTours.find((t) => t.id === tourSlug);
  if (!tour) return null;

  return (
    <aside
      data-testid="guide-booking-cta"
      className="not-prose reveal my-12 rounded-[6px] border border-[color:var(--gold)]/45 bg-[color:var(--sand)] p-6 md:p-8"
    >
      <span className="block font-sans text-[11px] uppercase tracking-[0.28em] text-[color:var(--gold-ink)]">
        Book this day
      </span>

      <h2 className="font-display mt-4 text-[1.35rem] md:text-[1.6rem] font-medium leading-[1.2] text-[color:var(--charcoal)]">
        {tour.title}
      </h2>

      {lead && (
        <p className="mt-3 text-[15px] md:text-[16px] leading-[1.75] text-[color:var(--charcoal-soft)]">
          {lead}
        </p>
      )}

      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-sans text-[12px] uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)] list-none p-0">
        <li>Private to your party</li>
        <li>{tour.durationHours}</li>
        <li>From €{tour.priceFrom} per person</li>
      </ul>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link
          to="/tours/$tourId"
          params={{ tourId: tour.id }}
          {...guideRefDataAttrs(guideSlug, "inline_book")}
          onClick={() =>
            recordGuideLinkClick({
              guideSlug,
              slot: "inline_book",
              kind: "signature",
              destination: `/tours/${tour.id}`,
            })
          }
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[4px] bg-[color:var(--teal)] px-7 font-sans text-[12px] uppercase tracking-[0.18em] font-semibold text-[color:var(--ivory)] no-underline transition-colors duration-200 hover:bg-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
        >
          Check dates &amp; book
          <span aria-hidden="true" className="text-[color:var(--gold)]">
            →
          </span>
        </Link>

        <Link
          to="/studio-v3"
          {...guideRefDataAttrs(guideSlug, "inline_book_studio")}
          onClick={() =>
            recordGuideLinkClick({
              guideSlug,
              slot: "inline_book_studio",
              kind: "studio",
              destination: "/studio-v3",
            })
          }
          className="inline-flex min-h-[48px] items-center gap-2 font-sans text-[12px] uppercase tracking-[0.16em] font-semibold text-[color:var(--teal)] underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--charcoal)]"
        >
          Or design your own day
        </Link>

        <Link
          to="/book"
          search={{ tour: tour.id }}
          {...guideRefDataAttrs(guideSlug, "inline_book_request")}
          onClick={() =>
            recordGuideLinkClick({
              guideSlug,
              slot: "inline_book_request",
              kind: "other",
              destination: `/book?tour=${tour.id}`,
            })
          }
          className="inline-flex min-h-[48px] items-center gap-2 font-sans text-[12px] uppercase tracking-[0.16em] font-semibold text-[color:var(--teal)] underline decoration-[color:var(--gold)]/60 underline-offset-4 hover:text-[color:var(--charcoal)] sm:ml-auto"
        >
          Tell us your dates
        </Link>
      </div>
    </aside>
  );
}

export default GuideBookingCta;
