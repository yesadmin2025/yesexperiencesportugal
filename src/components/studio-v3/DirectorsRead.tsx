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

export interface DirectorsReadProps {
  readonly read: DirectorsReadContent;
  readonly onContinue: () => void;
  readonly onBack?: () => void;
  /** Fired once per distinct read signature, for `interpretation_viewed`. */
  readonly onView?: (signature: string) => void;
}

export function DirectorsRead({ read, onContinue, onBack, onView }: DirectorsReadProps) {
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
      className="relative mx-auto w-full max-w-[560px] px-5 py-10 sm:py-14"
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          data-testid="studio-v3-directors-read-back"
          aria-label="Back to previous step"
          className="mb-6 inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 -ml-2 text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
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
        className="mt-4 text-[26px] sm:text-[32px] leading-[1.18] tracking-[-0.01em]"
        style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
      >
        {read.headline}
      </h2>

      <div
        data-testid="studio-v3-directors-read-body"
        className="mt-5 space-y-3 text-[16px] leading-[1.6]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 82%, transparent)" }}
      >
        {read.body.map((line) => (
          <p key={line} className="break-words">
            {line}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        data-testid="studio-v3-directors-read-continue"
        data-phase-cta="directors-read"
        className="mt-9 inline-flex items-center justify-center gap-2 w-full min-h-[52px] rounded-[2px] px-6 text-[11px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
        style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
      >
        Continue
        <ArrowRight size={15} aria-hidden />
      </button>
    </section>
  );
}

export default DirectorsRead;
