/**
 * PhaseChrome — the shared editorial chrome used by every Studio V3 question
 * screen: eyebrow + headline, quiet footer hint, back link, the dark continue
 * CTA and the single "understood" acknowledgement line.
 *
 * These lived inside StudioV3.tsx until the Logistics phase became a
 * progressive-disclosure surface of its own. Extracting them keeps ONE source
 * of truth for the typography, motion and 44px tap-target contract.
 *
 * Presentation only — no state, no pricing, no business rules.
 */

import { ArrowLeft, ArrowRight } from "lucide-react";
import { understoodSummary } from "./studioSemanticMemory";
import type { StudioV3State } from "./types";

/**
 * Short deterministic acknowledgement of what the traveller has already told
 * us. Built only from explicit selections (max three positive signals) — never
 * a destination, stop, supplier, price or a negative ("no wine assumed").
 *
 * This is the ONLY acknowledgement moment in the journey.
 */
export function UnderstoodSummaryLine({ state }: { state: StudioV3State }) {
  const summary = understoodSummary(state);
  if (!summary) return null;
  return (
    <div
      data-testid="studio-v3-understood-summary"
      className="w-full max-w-[520px] mx-auto mb-1 text-center"
    >
      <p
        className="text-[15px] leading-[1.35]"
        style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
      >
        {summary.lead}
      </p>
      <p
        className="mt-1 text-[11px] uppercase tracking-[0.2em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 62%, transparent)" }}
      >
        {summary.detail}
      </p>
    </div>
  );
}

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
        className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
      >
        <span style={{ color: "var(--gold)" }}>—</span> {eyebrow}
      </p>
      <h2
        className="mt-5 text-[28px] sm:text-[34px] leading-[1.08] tracking-[-0.012em] font-bold"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--charcoal)",
          animation: "studioV3RiseIn 520ms ease-out 60ms both",
        }}
      >
        {title}{" "}
        <span
          className="italic font-normal"
          style={{ fontFamily: "var(--font-serif)", color: "var(--teal)" }}
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
      className="mt-8 text-center text-[12px] max-w-[320px]"
      style={{
        fontFamily: "var(--font-body)",
        color: "color-mix(in oklab, var(--charcoal) 52%, transparent)",
        animation: "studioV3RiseIn 600ms ease-out 320ms both",
      }}
    >
      {children}
    </p>
  );
}

/**
 * Kept as a compatibility surface for existing phase call-sites, but
 * intentionally silent. Auto-advance and motion now communicate progression;
 * repeating "Next…" beneath every answer only stacks another copy layer.
 */
export function NextTeaser({ children }: { children: React.ReactNode }) {
  void children;
  return null;
}

export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="studio-v3-back"
      className="absolute left-4 top-4 inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 text-[10.5px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
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
      className={`mt-6 inline-flex items-center gap-2 px-6 py-3.5 min-h-[44px] text-[11px] uppercase tracking-[0.24em] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
    >
      {label} <ArrowRight size={14} aria-hidden />
    </button>
  );
}
