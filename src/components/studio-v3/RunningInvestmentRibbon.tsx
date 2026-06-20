// Studio V3 — Running Investment Ribbon (Track 3 fusion).
//
// Thin sand-tinted strip that lives just under the stepper from beat 2
// onward. Shows real, live investment data — never invented. Honours
// TEST MODE booking guardrails (no "total", no "price", no payment copy
// — "investment" voice only). Dismissible per session.
//
// Source of truth: the same resolveStudioV3Route helper the map uses,
// matched against signatureTours for `priceFrom`. If nothing resolves
// yet, the ribbon stays in its quiet "shaped with you" state. It never
// fabricates a number, partner, total, or savings claim.

import { useEffect, useState } from "react";
import type { StudioV3State } from "./types";
import { resolveStudioV3Route } from "./curation";
import { signatureTours } from "@/data/signatureTours";
import { regionalVoiceFor } from "./regionalVoice";

const DISMISS_KEY = "studio-v3-investment-ribbon-dismissed";

interface RunningInvestmentRibbonProps {
  state: StudioV3State;
  hidden?: boolean;
}

export function RunningInvestmentRibbon({ state, hidden = false }: RunningInvestmentRibbonProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* sessionStorage may be unavailable — fail silent. */
    }
  }, []);

  if (hidden || dismissed) return null;

  // Beat 1 ("feeling") is too early — ribbon enters from beat 2 onward.
  if (state.phase === "feeling" || state.phase === "intro") return null;

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
  const priceFromEur = tour?.priceFrom ?? null;
  const guests = state.guests ?? null;
  const partyTotalEur =
    priceFromEur != null && guests != null && guests > 0 ? priceFromEur * guests : null;

  const voice = tour ? regionalVoiceFor(tour.region) : null;

  // Compose the live line.
  let line: string;
  if (priceFromEur != null && guests != null && partyTotalEur != null) {
    const totalK = (partyTotalEur / 1000).toFixed(partyTotalEur >= 10000 ? 0 : 1);
    line = `from €${priceFromEur} / guest · party of ${guests} · ~€${totalK}K`;
  } else if (priceFromEur != null) {
    line = `from €${priceFromEur} / guest · shaped with you`;
  } else {
    line = "shaped with you, never invented";
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
    >
      <div
        className="mx-auto flex w-full max-w-[480px] flex-col gap-0.5 rounded-[4px] border px-3 py-1.5 transition-opacity duration-[220ms] motion-reduce:transition-none"
        style={{
          background: "color-mix(in oklab, var(--sand) 55%, var(--ivory))",
          borderColor: "color-mix(in oklab, var(--gold) 22%, transparent)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-[10px] uppercase font-semibold tracking-[0.22em] inline-flex items-center gap-1.5 truncate"
            style={{ color: "var(--charcoal)" }}
          >
            <span
              className="font-bold tracking-[0.30em] shrink-0"
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
            <span className="truncate" style={{ color: "var(--charcoal)" }}>
              {line}
            </span>
          </span>
          {/* dismiss button moved below */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide investment ribbon for this session"
            className="shrink-0 text-[10px] uppercase tracking-[0.22em] font-semibold rounded-full px-2 py-1 motion-reduce:transition-none transition-colors duration-150 hover:bg-[color:color-mix(in_oklab,var(--gold)_18%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 60%, var(--ivory))",
              minHeight: 28,
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
