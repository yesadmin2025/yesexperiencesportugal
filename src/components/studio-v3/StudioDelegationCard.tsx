/**
 * StudioDelegationCard — P10. The single concierge delegation affordance.
 *
 * Presentational only: it renders an editorial invitation to hand the
 * remaining taste decisions to YES. All decision logic lives in the pure
 * `studioDelegation.ts` module. Brand rules: existing teal/gold/ivory tokens
 * only, Fraunces headline + Inter body, sentence case, 393px-safe single
 * column, ≥44px target, visible focus, reduced-motion safe (no animation).
 */

interface StudioDelegationCardProps {
  /** Fired when the traveller trusts the curator. */
  onDelegate: () => void;
  /** Optional secondary line rendered after activation. */
  acknowledgement?: string | null;
}

export function StudioDelegationCard({ onDelegate, acknowledgement }: StudioDelegationCardProps) {
  return (
    <aside
      data-testid="studio-v3-delegation-card"
      className="mt-8 w-full max-w-full flex flex-col items-start gap-3 p-5"
      style={{
        border: "1px solid color-mix(in oklab, var(--gold) 42%, transparent)",
        background: "color-mix(in oklab, var(--gold) 5%, var(--ivory))",
      }}
    >
      <span
        className="text-[10.5px] uppercase tracking-[0.22em] font-semibold"
        style={{ fontFamily: "var(--font-display)", color: "var(--teal)" }}
      >
        <span aria-hidden style={{ color: "var(--gold)", marginRight: 8 }}>
          —
        </span>
        Trust the curator
      </span>

      <h3
        className="text-[22px] leading-[1.15]"
        style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
      >
        Let YES design the rest
      </h3>

      <p
        className="text-[14px] leading-[1.6] max-w-[46ch]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
      >
        You have told us how the day should feel and who it is for. That is enough for our
        curators to shape the tastes, the pace and the final nuance. The practical details —
        your date, pickup and party — stay entirely with you.
      </p>

      <button
        type="button"
        data-testid="studio-v3-delegation-cta"
        onClick={onDelegate}
        className="mt-1 inline-flex min-h-[44px] items-center justify-center px-5 text-[11px] uppercase tracking-[0.22em] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--ivory)",
          background: "var(--teal)",
          borderRadius: 999,
          outlineColor: "var(--gold)",
        }}
      >
        Yes, design it for me
      </button>

      {acknowledgement ? (
        <p
          data-testid="studio-v3-delegation-acknowledgement"
          aria-live="polite"
          className="text-[13px] leading-[1.6]"
          style={{
            fontFamily: "var(--font-editorial)",
            color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
          }}
        >
          {acknowledgement}
        </p>
      ) : null}
    </aside>
  );
}
