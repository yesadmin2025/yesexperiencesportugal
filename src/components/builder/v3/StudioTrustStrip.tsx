import { REVIEW_CERTIFICATE, REVIEW_COUNT_DISPLAY } from "@/config/trust-certificate";
/**
 * StudioTrustStrip — micro 18px-tall trust line that sits just below the
 * conversion HUD inside the cinematic Studio.
 *
 * Studio v4 / Fase 6: gives the traveller a permanent, low-noise reminder
 * that YES carries a verified 4.9 rating across 1,000 guest reviews,
 * without breaking the cinematic atmosphere.
 *
 *   ★★★★★ 4.9 · 1,000 reviews · Google · Tripadvisor · GetYourGuide
 *
 * - Ivory 55% on the existing charcoal backdrop, no extra surfaces.
 * - Single line, no icons / no logos — keeps weight under 18px.
 * - Hidden in `convergence` (final reveal renders its own full trust band).
 */
interface Props {
  /** Localised "reviews" word (defaults to en). */
  reviewsLabel?: string;
}

export function StudioTrustStrip({ reviewsLabel: _r = "reviews" }: Props) {
  return (
    <div
      role="note"
      aria-label={`${REVIEW_CERTIFICATE.ratingValue}/5 across ${REVIEW_COUNT_DISPLAY} guest reviews on Google, Tripadvisor and GetYourGuide`}
      className="absolute bottom-[108px] inset-x-0 z-[44] flex items-center justify-center px-3 pointer-events-none motion-safe:animate-[fade-in_1.1s_ease-out_both]"
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] tracking-[0.14em] uppercase font-semibold whitespace-nowrap"
        style={{
          color: "color-mix(in oklab, var(--ivory) 92%, transparent)",
          background: "color-mix(in oklab, var(--charcoal) 58%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: "1px solid color-mix(in oklab, var(--ivory) 10%, transparent)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
        }}
      >
        <span aria-hidden="true" style={{ color: "var(--gold)", letterSpacing: "0.04em" }}>
          ★★★★★
        </span>
        <span>{REVIEW_CERTIFICATE.ratingValue} · {REVIEW_COUNT_DISPLAY} reviews</span>
        <span className="hidden sm:contents">
          <span aria-hidden="true" className="opacity-40">
            ·
          </span>
          <span>Google</span>
          <span aria-hidden="true" className="opacity-30">
            ·
          </span>
          <span>Tripadvisor</span>
          <span aria-hidden="true" className="opacity-30">
            ·
          </span>
          <span>GetYourGuide</span>
        </span>
      </span>
    </div>
  );
}
