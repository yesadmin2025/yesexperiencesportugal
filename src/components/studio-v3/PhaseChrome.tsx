/**
 * PhaseChrome — the shared editorial chrome used by every Studio V3 question
 * screen: eyebrow + headline, quiet footer hint, next teaser, back link and
 * the dark continue CTA.
 *
 * These lived inside StudioV3.tsx until the Logistics phase became a
 * progressive-disclosure surface of its own. Extracting them keeps ONE source
 * of truth for the typography, motion and 44px tap-target contract.
 *
 * Presentation only — no state, no pricing, no business rules.
 */

import { ArrowLeft, ArrowRight } from "lucide-react";

export function PhaseHeader({
  eyebrow,
  title,
  titleAccent,
}: {
  eyebrow: string;
  title: string;
  titleAccent: string;
}) {
  return (
    <header className="w-full max-w-[520px] text-center">
      <p
        className="t-eyebrow"
        style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
      >
        <span style={{ color: "var(--gold)" }}>—</span> {eyebrow}
      </p>
      <h2
        className="t-h1 mt-4 text-balance sm:mt-5"
        style={{
          color: "var(--charcoal)",
          animation: "studioV3RiseIn var(--dur-slow) var(--ease-premium) 60ms both",
        }}
      >
        {title}{" "}
        <span
          className="italic font-normal"
           style={{ color: "var(--teal)" }}
        >
          {titleAccent}
        </span>
      </h2>
    </header>
  );
}

export function FooterHint({ children }: { children: React.ReactNode }) {
  return (
    <p
       className="t-small mt-7 max-w-[340px] text-center sm:mt-8"
      style={{
        color: "color-mix(in oklab, var(--charcoal) 52%, transparent)",
         animation: "studioV3RiseIn var(--dur-slow) var(--ease-premium) 180ms both",
      }}
    >
      {children}
    </p>
  );
}

/**
 * NextTeaser — intentionally renders nothing (P4).
 *
 * Progression is now communicated by movement itself: the reaction beats and
 * auto-advance already tell the traveller the journey moved forward. Stacking
 * another "Next…" copy layer on top made the chain feel slower and more
 * form-like. The component and its props are kept so existing call-sites
 * compile unchanged; if the teaser is ever reinstated it happens here only.
 */
export function NextTeaser(_props: { children: React.ReactNode }) {
  return null;
}

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="studio-v3-back"
      className="absolute z-30 left-3 top-[max(10px,env(safe-area-inset-top))] sm:left-4 sm:top-4 inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
      aria-label="Back to previous step"
    >
      <ArrowLeft size={14} aria-hidden /> Back
    </button>
  );
}

/** Dark continue CTA used by the question screens. Inline styles intentionally
 *  mirror the StoryboardHandoff CTA — no new component. */
export function ContinueCta({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-phase-cta="continue"
      data-phase-cta-disabled={disabled ? "true" : "false"}
      className={`t-button mt-7 inline-flex w-full max-w-[520px] items-center justify-center gap-2 px-5 py-3.5 min-h-[52px] text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] sm:mt-6 sm:w-auto sm:min-h-[44px] sm:px-6 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
    >
      <span>{label}</span> <ArrowRight size={14} aria-hidden className="shrink-0" />
    </button>
  );
}
