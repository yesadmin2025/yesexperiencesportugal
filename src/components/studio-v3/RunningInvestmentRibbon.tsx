// Studio V3 — Running Investment Ribbon.
//
// A quiet editorial investment whisper that lives just under the stepper
// from beat 2 onward. It never invents a party total. Before canonical
// pricing resolves it may show a real Signature "from" anchor; once the
// journey resolves it renders the same canonical total used by reveal and
// checkout. Dismissible per session.

import { useEffect, useRef, useState } from "react";
import type { StudioV3State } from "./types";
import { resolveStudioV3Route } from "./curation";
import { signatureTours } from "@/data/signatureTours";
import { regionalVoiceFor } from "./regionalVoice";
import { formatGuestComposition } from "./formatGuests";

const DISMISS_KEY = "studio-v3-investment-ribbon-dismissed";
const DELTA_VISIBLE_MS = 1600;

interface RunningInvestmentRibbonProps {
  state: StudioV3State;
  hidden?: boolean;
  /** Canonical party total from useResolvedJourney. Never recomputed here. */
  resolvedTotalEur?: number | null;
  /** Canonical adult unit from useResolvedJourney. */
  resolvedAdultUnitEur?: number | null;
  /** Canonical party size from useResolvedJourney. */
  resolvedGuests?: number | null;
}

export function RunningInvestmentRibbon({
  state,
  hidden = false,
  resolvedTotalEur = null,
  resolvedAdultUnitEur = null,
  resolvedGuests = null,
}: RunningInvestmentRibbonProps) {
  const [dismissed, setDismissed] = useState(false);
  const [deltaEur, setDeltaEur] = useState<number | null>(null);
  const previousTotalRef = useRef<number | null>(null);
  const deltaTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* sessionStorage may be unavailable — fail silent. */
    }
  }, []);

  useEffect(() => {
    const next =
      typeof resolvedTotalEur === "number" && Number.isFinite(resolvedTotalEur)
        ? Math.round(resolvedTotalEur)
        : null;

    if (next == null) {
      previousTotalRef.current = null;
      setDeltaEur(null);
      if (deltaTimerRef.current !== null) {
        window.clearTimeout(deltaTimerRef.current);
        deltaTimerRef.current = null;
      }
      return;
    }

    const previous = previousTotalRef.current;
    previousTotalRef.current = next;

    if (previous == null || previous === next) return;

    const delta = next - previous;
    if (delta === 0) return;

    setDeltaEur(delta);
    if (deltaTimerRef.current !== null) window.clearTimeout(deltaTimerRef.current);
    deltaTimerRef.current = window.setTimeout(() => {
      deltaTimerRef.current = null;
      setDeltaEur(null);
    }, DELTA_VISIBLE_MS);
  }, [resolvedTotalEur]);

  useEffect(
    () => () => {
      if (deltaTimerRef.current !== null) window.clearTimeout(deltaTimerRef.current);
    },
    [],
  );

  // Beat 1 ("feeling") is too early — ribbon enters from beat 2 onward.
  if (hidden || dismissed || state.phase === "feeling" || state.phase === "intro") return null;

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
  const voice = tour ? regionalVoiceFor(tour.region) : null;

  const guests = resolvedGuests ?? state.guests ?? null;
  const partyLabel =
    formatGuestComposition(state.adults, state.minorAges, guests) ??
    (guests != null ? `${guests} ${guests === 1 ? "guest" : "guests"}` : null);

  const hasCanonicalTotal =
    typeof resolvedTotalEur === "number" && Number.isFinite(resolvedTotalEur);
  const canonicalTotal = hasCanonicalTotal ? Math.round(resolvedTotalEur as number) : null;
  const canonicalAdultUnit =
    typeof resolvedAdultUnitEur === "number" && Number.isFinite(resolvedAdultUnitEur)
      ? Math.round(resolvedAdultUnitEur)
      : null;

  const line = canonicalTotal != null
    ? `€${canonicalTotal.toLocaleString("en-GB")}${partyLabel ? ` · ${partyLabel}` : ""}`
    : priceFromEur != null
      ? `from €${priceFromEur.toLocaleString("en-GB")} / guest · investment takes shape with your day`
      : "investment takes shape with your day";

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
        className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3 border-b py-2 motion-reduce:transition-none"
        style={{ borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)" }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className="text-[10px] uppercase font-bold tracking-[0.30em] shrink-0"
              style={{ color: "var(--teal)" }}
              data-testid="studio-v3-voice-mark"
            >
              YES
            </span>
            <span
              className="text-[10px] uppercase font-semibold tracking-[0.22em] shrink-0"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, var(--ivory))" }}
            >
              Investment
            </span>
            <span
              className="min-w-0 text-[12px] sm:text-[12.5px] font-medium tabular-nums"
              style={{ color: "var(--charcoal)" }}
              data-testid={canonicalTotal != null ? "studio-v3-investment-ribbon-total" : undefined}
              data-eur={canonicalTotal ?? undefined}
            >
              {line}
            </span>
            {canonicalTotal != null && canonicalAdultUnit != null ? (
              <span
                className="text-[11px] tabular-nums"
                style={{ color: "color-mix(in oklab, var(--charcoal) 58%, transparent)" }}
              >
                €{canonicalAdultUnit.toLocaleString("en-GB")} / adult
              </span>
            ) : null}
            {deltaEur != null ? (
              <span
                data-testid="studio-v3-investment-ribbon-delta"
                data-delta-eur={deltaEur}
                className="text-[10.5px] font-semibold tabular-nums transition-opacity duration-200 motion-reduce:transition-none"
                style={{ color: "var(--gold)" }}
                aria-live="polite"
              >
                Updated {deltaEur > 0 ? "+" : "−"}€{Math.abs(deltaEur).toLocaleString("en-GB")}
              </span>
            ) : null}
          </div>
          {voice ? (
            <div
              className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-[10.5px]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 52%, transparent)" }}
              data-testid="studio-v3-region-voice"
            >
              <span className="shrink-0 uppercase tracking-[0.18em]" style={{ color: "var(--teal)" }}>
                {voice.eyebrow}
              </span>
              <span style={{ color: "var(--gold)" }} aria-hidden>
                ·
              </span>
              <span className="truncate italic" style={{ fontFamily: "var(--font-serif)" }}>
                {voice.whisper}
              </span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide investment ribbon for this session"
          className="shrink-0 min-h-[44px] px-2 text-[10px] uppercase tracking-[0.2em] font-semibold transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] motion-reduce:transition-none"
          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, var(--ivory))" }}
        >
          Hide
        </button>
      </div>
    </div>
  );
}
