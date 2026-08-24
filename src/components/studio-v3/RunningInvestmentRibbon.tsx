// Studio V3 — Running Investment whisper (P3B).
//
// A hairline editorial whisper under the stepper, not a card and not a
// dashboard widget. It NEVER computes a price: every euro figure it can
// show is passed in from the canonical `useResolvedJourney` values that
// the reveal and checkout already use, so the three surfaces can never
// disagree. Before a canonical total exists it shows no party total at
// all — no approximations, no rounded "K" shorthand, no multiplication
// of a `from` anchor. Dismissible per session.

import { useEffect, useState } from "react";
import type { StudioV3State } from "./types";
import { resolveStudioV3Route } from "./curation";
import { signatureTours } from "@/data/signatureTours";
import { regionalVoiceFor } from "./regionalVoice";
import { formatGuestComposition } from "./formatGuests";

const DISMISS_KEY = "studio-v3-investment-ribbon-dismissed";

interface RunningInvestmentRibbonProps {
  state: StudioV3State;
  hidden?: boolean;
  /** Canonical party total from `useResolvedJourney`. Never recomputed here. */
  totalEur?: number | null;
  /** Canonical adult unit price from `useResolvedJourney`. */
  adultUnitEur?: number | null;
  /** Effective party size behind the canonical total. */
  guests?: number | null;
}

function eur(n: number): string {
  return `€${Math.round(n).toLocaleString("en-GB")}`;
}

export function RunningInvestmentRibbon({
  state,
  hidden = false,
  totalEur = null,
  adultUnitEur = null,
  guests = null,
}: RunningInvestmentRibbonProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* sessionStorage may be unavailable — fail silent. */
    }
  }, []);

  if (hidden || dismissed) return null;

  // Beat 1 ("feeling") is too early — the whisper enters from beat 2 onward.
  if (state.phase === "feeling" || state.phase === "intro") return null;

  // Region voice only — this resolution is never used for pricing.
  const canResolve = !!state.feeling && !!state.companions && !!state.rhythm;
  const resolved = canResolve
    ? resolveStudioV3Route({
        feeling: state.feeling!,
        companions: state.companions!,
        rhythm: state.rhythm!,
        interests: state.interests,
        pickup: state.pickup,
        occasion: state.occasion,
        investment: state.investment,
        destinationIntent: state.destinationIntent,
        dateExact: state.dateExact,
      })
    : null;

  const tour = resolved?.skeletonTourKey
    ? (signatureTours.find((t) => t.id === resolved.skeletonTourKey) ?? null)
    : null;
  const voice = tour ? regionalVoiceFor(tour.region) : null;

  // Canonical total wins. Otherwise: a clearly labelled "from" per-guest
  // anchor, never multiplied into a party figure. Otherwise: silence.
  const partyGuests = guests ?? state.guests ?? null;
  const partyLabel =
    formatGuestComposition(state.adults, state.minorAges, partyGuests) ??
    (partyGuests != null ? `party of ${partyGuests}` : null);

  const isResolvedTotal = state.tourId != null && totalEur != null && totalEur > 0;
  const fromAnchorEur = !isResolvedTotal ? (adultUnitEur ?? tour?.priceFrom ?? null) : null;

  let line: string;
  if (isResolvedTotal) {
    line = partyLabel ? `${eur(totalEur!)} · ${partyLabel}` : eur(totalEur!);
  } else if (fromAnchorEur != null && fromAnchorEur > 0) {
    line = `from ${eur(fromAnchorEur)} / guest`;
  } else {
    line = "Investment takes shape with your day";
  }

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <div
      className="w-full px-3 pt-1.5"
      data-testid="studio-v3-investment-ribbon"
      data-region-voice={voice?.eyebrow ?? ""}
      data-total-eur={isResolvedTotal ? Math.round(totalEur!) : ""}
      data-resolved={isResolvedTotal ? "true" : "false"}
    >
      <style>{`
        @keyframes sv3RibbonRise {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sv3-ribbon-line { animation: sv3RibbonRise 240ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .sv3-ribbon-line { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <div
        className="mx-auto flex w-full max-w-[480px] flex-col gap-0.5 border-t px-1 pt-1.5"
        style={{ borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-[11px] uppercase font-semibold tracking-[0.2em] inline-flex items-center gap-1.5 truncate"
            style={{ color: "var(--charcoal)" }}
          >
            <span
              className="font-bold tracking-[0.28em] shrink-0"
              style={{ color: "var(--teal)" }}
              data-testid="studio-v3-voice-mark"
            >
              YES
            </span>
            <span style={{ color: "var(--gold)" }} aria-hidden>
              —
            </span>
            <span
              className="shrink-0"
              style={{ color: "color-mix(in oklab, var(--charcoal) 70%, var(--ivory))" }}
            >
              Investment
            </span>
            <span
              key={line}
              className="truncate normal-case tracking-normal text-[12.5px] sv3-ribbon-line"
              style={{ color: "var(--charcoal)" }}
              data-testid="studio-v3-investment-ribbon-line"
            >
              {line}
            </span>
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide investment whisper for this session"
            className="shrink-0 text-[10.5px] uppercase tracking-[0.2em] font-semibold px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 60%, var(--ivory))",
              minHeight: 28,
              borderBottom: "1px solid color-mix(in oklab, var(--gold) 45%, transparent)",
            }}
          >
            Hide
          </button>
        </div>
        {voice ? (
          <span
            className="text-[9.5px] uppercase tracking-[0.26em] font-semibold inline-flex items-center gap-1.5 truncate"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, var(--ivory))" }}
            data-testid="studio-v3-region-voice"
          >
            <span style={{ color: "var(--teal)" }}>{voice.eyebrow}</span>
            <span style={{ color: "var(--gold)" }} aria-hidden>
              ·
            </span>
            <span
              className="italic font-normal normal-case tracking-normal text-[11px]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {voice.whisper}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
