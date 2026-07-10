/**
 * ConfirmationPause — plan §J phase between the Signature reveal and the
 * Guest Details step. A quiet breath, not a summary screen: the user has
 * already read the story on the reveal, so this surface confirms the
 * decision in one line, moves the ReassuranceStrip here (plan §E), and
 * offers the primary continuation CTA.
 *
 * Purely presentational — parent owns phase transitions, journeyTitle,
 * pickup label, party size, and the two callbacks. Wiring into the
 * Studio phase order happens in Step 11.
 *
 * Copy comes from signature-day-copy.ts (CTA_PRIMARY) and never uses
 * the retired "Say YES" vocabulary.
 */

import * as React from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ReassuranceStrip, type ReassuranceStripItem } from "./ReassuranceStrip";
import { CTA_PRIMARY } from "@/content/signature-day-copy";
import { cn } from "@/lib/utils";

export interface ConfirmationPauseProps {
  /** Journey title shown on the reveal — echoed here so the user recognizes
   *  the day they just approved. */
  readonly journeyTitle: string;
  /** Optional single-line summary strip (e.g. "Lisbon · Full rhythm · 2 guests"). */
  readonly summaryLine?: string;
  /** Optional reassurance items — falls back to REASSURANCE_DEFAULT. */
  readonly reassurance?: ReadonlyArray<ReassuranceStripItem>;
  /** Advance to Guest Details. */
  readonly onContinue: () => void;
  /** Return to the Signature reveal with edits intact. */
  readonly onBack: () => void;
  /** Rendered as the primary CTA label. Defaults to the locked
   *  `CTA_PRIMARY` string — override only for tests or i18n. */
  readonly ctaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

export function ConfirmationPause({
  journeyTitle,
  summaryLine,
  reassurance,
  onContinue,
  onBack,
  ctaLabel,
  className,
  testId,
}: ConfirmationPauseProps) {
  return (
    <section
      data-testid={testId ?? "studio-v3-confirmation-pause"}
      aria-labelledby="studio-v3-confirmation-title"
      className={cn(
        "w-full max-w-[560px] mx-auto px-5 pt-10 pb-[calc(env(safe-area-inset-bottom)+2rem)]",
        className,
      )}
    >
      <header className="text-center">
        <Eyebrow>A quiet moment before we continue</Eyebrow>
        <h2
          id="studio-v3-confirmation-title"
          className="mt-3 text-[22px] leading-[1.25] [text-wrap:balance]"
          style={{
            fontFamily: "var(--font-editorial)",
            color: "var(--charcoal)",
            fontWeight: 500,
          }}
        >
          Your Signature Day is ready.
        </h2>
        <p
          className="mt-3 text-[14.5px] leading-[1.65] [text-wrap:pretty]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
        >
          <span className="italic" style={{ fontFamily: "var(--font-editorial)" }}>
            {journeyTitle}
          </span>
          {summaryLine ? (
            <>
              {" — "}
              <span>{summaryLine}</span>
            </>
          ) : null}
          .
        </p>
        <span
          aria-hidden
          className="mt-6 inline-block h-px w-10"
          style={{ background: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
        />
      </header>

      <div className="mt-8">
        <ReassuranceStrip items={reassurance} />
      </div>

      <div className="mt-8 flex flex-col items-stretch gap-3">
        <button
          type="button"
          onClick={onContinue}
          data-testid="studio-v3-confirmation-continue"
          className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-full px-6 text-[13px] uppercase tracking-[0.22em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] transition-colors"
          style={{
            background: "var(--teal)",
            color: "var(--ivory)",
          }}
        >
          {ctaLabel ?? CTA_PRIMARY}
          <span aria-hidden style={{ color: "var(--gold)" }}>
            →
          </span>
        </button>
        <button
          type="button"
          onClick={onBack}
          data-testid="studio-v3-confirmation-back"
          className="w-full min-h-[44px] inline-flex items-center justify-center text-[12.5px] tracking-[0.02em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{
            color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
          }}
        >
          ← Return to your Signature (edits kept)
        </button>
      </div>
    </section>
  );
}

export default ConfirmationPause;
