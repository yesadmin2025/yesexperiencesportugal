/**
 * Studio V3 — P7 "Director's Read" beat (presentational only).
 *
 * Dumb component: it renders the content produced by `composeDirectorsRead`
 * and nothing else. No state derivation, no inference, no analytics decision —
 * the parent owns all of that. It never blocks: one visible tap continues, and
 * there is no timer, no forced wait and no fake typing animation.
 */

import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DirectorsReadContent } from "./directorsRead";

/**
 * P10 concierge visibility: when "Let YES design the rest" is active, the read
 * names what YES chose ONCE and offers one quiet way back. Presentation only —
 * the parent owns the labels, the state and the navigation.
 */
export interface DirectorsReadDelegation {
  /** Already-resolved, human labels. e.g. "coast and the table, unhurried". */
  readonly line: string;
  readonly onAdjust: () => void;
  readonly adjustLabel: string;
}

export interface DirectorsReadProps {
  readonly read: DirectorsReadContent;
  readonly onContinue: () => void;
  readonly onBack?: () => void;
  readonly delegation?: DirectorsReadDelegation | null;
  /** Fired once per distinct read signature, for `interpretation_viewed`. */
  readonly onView?: (signature: string) => void;
}

export function DirectorsRead({
  read,
  onContinue,
  onBack,
  onView,
  delegation = null,
}: DirectorsReadProps) {
  const seenRef = useRef<string | null>(null);

  useEffect(() => {
    if (seenRef.current === read.signature) return;
    seenRef.current = read.signature;
    onView?.(read.signature);
    // `onView` is intentionally not a dependency: the effect is keyed by the
    // read itself so a re-render (or a new callback identity) never re-fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [read.signature]);

  return (
    <section
      data-testid="studio-v3-directors-read"
      data-directors-read-signature={read.signature}
      data-directors-read-neutral={read.neutral ? "1" : "0"}
      aria-labelledby="studio-v3-directors-read-headline"
      className="relative mx-auto w-full max-w-[560px] px-0 py-6 sm:px-5 sm:py-14"
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          data-testid="studio-v3-directors-read-back"
          aria-label="Back to previous step"
          className="mb-7 inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 -ml-2 text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] sm:mb-6"
          style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
        >
          <ArrowLeft size={14} aria-hidden /> Back
        </button>
      ) : null}

      <p
        className="text-[10.5px] uppercase tracking-[0.24em] font-semibold"
        style={{ color: "var(--gold)" }}
      >
        {read.eyebrow}
      </p>

      <h2
        id="studio-v3-directors-read-headline"
        className="mt-4 text-balance text-[28px] sm:text-[32px] leading-[1.16] sm:leading-[1.18] tracking-[-0.01em]"
        style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
      >
        {read.headline}
      </h2>

      <div
        data-testid="studio-v3-directors-read-body"
        className="mt-5 space-y-3 text-[16px] leading-[1.65]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 82%, transparent)" }}
      >
        {read.body.map((line) => (
          <p key={line} className="break-words [text-wrap:pretty]">
            {line}
          </p>
        ))}
      </div>

      {delegation ? (
        <div
          data-testid="studio-v3-delegation-read"
          className="mt-7 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-4"
          style={{ borderTop: "1px solid color-mix(in oklab, var(--gold) 45%, transparent)" }}
        >
          <p
            data-testid="studio-v3-delegation-read-line"
            className="text-[13px] leading-[1.6] italic"
            style={{
              fontFamily: "var(--font-editorial)",
              color: "color-mix(in oklab, var(--charcoal) 66%, transparent)",
            }}
          >
            {delegation.line}
          </p>
          <button
            type="button"
            onClick={delegation.onAdjust}
            data-testid="studio-v3-delegation-adjust"
            aria-label={delegation.adjustLabel}
            className="-mr-2 inline-flex items-center min-h-[44px] px-2 text-[10.5px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{ color: "var(--teal)" }}
          >
            Adjust
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        data-testid="studio-v3-directors-read-continue"
        data-phase-cta="directors-read"
        className="mt-8 inline-flex items-center justify-center gap-2 w-full min-h-[56px] sm:min-h-[52px] rounded-[2px] px-6 text-[11px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 sm:mt-9"
        style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
      >
        Continue
        <ArrowRight size={15} aria-hidden />
      </button>
    </section>
  );
}

export default DirectorsRead;
