/**
 * StudioTrustStrip — micro 18px-tall trust line that sits just below the
 * conversion HUD inside the cinematic Studio.
 *
 * Studio v4 / Fase 6: gives the traveller a permanent, low-noise reminder
 * that YES is rated across 4 real platforms with 700+ five-star reviews,
 * without breaking the cinematic atmosphere.
 *
 *   ★★★★★ 700+ reviews · Google · Tripadvisor · Viator · GetYourGuide
 *
 * - Ivory 55% on the existing charcoal backdrop, no extra surfaces.
 * - Single line, no icons / no logos — keeps weight under 18px.
 * - Hidden in `convergence` (final reveal renders its own full trust band).
 */
interface Props {
  /** Localised "reviews" word (defaults to en). */
  reviewsLabel?: string;
}

export function StudioTrustStrip({ reviewsLabel = "reviews" }: Props) {
  return (
    <div
      role="note"
      aria-label={`700+ five-star reviews across Google, Tripadvisor, Viator and GetYourGuide`}
      className="absolute top-[68px] inset-x-3 z-[44] flex items-center justify-center gap-1.5 pointer-events-none motion-safe:animate-[fade-in_1.1s_ease-out_both]"
    >
      <span
        className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.16em] uppercase font-semibold whitespace-nowrap"
        style={{
          color: "color-mix(in oklab, var(--ivory) 62%, transparent)",
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        <span aria-hidden="true" style={{ color: "var(--gold)", letterSpacing: "0.05em" }}>
          ★★★★★
        </span>
        <span>700+ {reviewsLabel}</span>
        <span aria-hidden="true" className="opacity-50">·</span>
        <span>Google</span>
        <span aria-hidden="true" className="opacity-40">·</span>
        <span>Tripadvisor</span>
        <span aria-hidden="true" className="opacity-40">·</span>
        <span>Viator</span>
        <span aria-hidden="true" className="opacity-40">·</span>
        <span>GetYourGuide</span>
      </span>
    </div>
  );
}
