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

import { PriceQualifier } from "@/components/ui/PriceQualifier";
import { CtaButton } from "@/components/ui/CtaButton";
import { Eyebrow } from "@/components/ui/Eyebrow";

import { signatureTours } from "@/data/signatureTours";
import { guideRefDataAttrs } from "@/lib/guide-attribution-inline";
import { recordGuideLinkClick } from "@/lib/guide-attribution";
import { CTA_LABELS } from "@/content/cta-vocabulary";

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
      className="not-prose reveal my-12 overflow-hidden rounded-[6px] border border-[color:var(--border)] bg-[color:var(--sand)]"
    >
      <img
        src={tour.img}
        alt={tour.title}
        loading="lazy"
        decoding="async"
        className="block aspect-[3/2] w-full object-cover"
      />
      <div className="p-6 md:p-8">
      <Eyebrow>A private day from Lisbon</Eyebrow>

      <h2 className="font-display mt-4 text-[24px] md:text-[26px] font-medium leading-[1.2] text-[color:var(--charcoal)]">
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
        <li>From €{tour.priceFrom} per person <PriceQualifier /></li>
      </ul>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
        <CtaButton
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
          className="w-full sm:w-auto no-underline"
        >
          {CTA_LABELS.signatureCardBooking}
        </CtaButton>
      </div>
      </div>
    </aside>
  );
}

export default GuideBookingCta;
