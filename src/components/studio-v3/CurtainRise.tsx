// Studio V3 — Cinematic curtain rise for the Signature reveal.
//
// Mounts once when the user enters the final "storyboard" phase, holds
// for ~1800ms, then dissolves on its own (250ms under reduced-motion).
// Shows the regional voice eyebrow + a short past-tense memory line so
// the reveal feels earned. Pure read of StudioV3State; never invents
// stops, partners, or prices.

import { useEffect, useState } from "react";
import { resolveStudioV3Route } from "./curation";
import { signatureTours } from "@/data/signatureTours";
import { regionalVoiceFor } from "./regionalVoice";
import { COMPANIONS, FEELINGS, INTERESTS, RHYTHMS, type StudioV3State } from "./types";
import { getOptionLabel } from "./curation";

interface CurtainRiseProps {
  state: StudioV3State;
  /** Fires when the curtain finishes lifting; parent may use it for cleanup. */
  onDone?: () => void;
}

export function CurtainRise({ state, onDone }: CurtainRiseProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit" | "done">("enter");

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const t = window.setTimeout(() => {
        setPhase("done");
        onDone?.();
      }, 250);
      return () => window.clearTimeout(t);
    }
    const t1 = window.setTimeout(() => setPhase("hold"), 480);
    const t2 = window.setTimeout(() => setPhase("exit"), 1500);
    const t3 = window.setTimeout(() => {
      setPhase("done");
      onDone?.();
    }, 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [onDone]);

  // Resolve region voice from the about-to-be-revealed Signature.
  const resolved =
    state.feeling && state.companions && state.rhythm
      ? resolveStudioV3Route({
          feeling: state.feeling,
          companions: state.companions,
          rhythm: state.rhythm,
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

  // Memory snippet — keep it short for the curtain.
  const memory = (() => {
    const parts: string[] = [];
    if (state.feeling) parts.push(getOptionLabel(FEELINGS, state.feeling).toLowerCase());
    if (state.companions) parts.push(getOptionLabel(COMPANIONS, state.companions).toLowerCase());
    if (state.interests?.[0])
      parts.push(getOptionLabel(INTERESTS, state.interests[0]).toLowerCase());
    if (state.rhythm) parts.push(`${getOptionLabel(RHYTHMS, state.rhythm).toLowerCase()} rhythm`);
    if (parts.length < 2) return null;
    return parts.join(" · ");
  })();

  if (phase === "done") return null;

  const visible = phase === "hold" || phase === "enter";

  return (
    <div
      role="presentation"
      aria-hidden
      data-testid="studio-v3-curtain-rise"
      data-phase={phase}
      className="fixed inset-0 z-[70] flex items-center justify-center px-6 pointer-events-none motion-reduce:transition-none"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--charcoal) 96%, transparent) 0%, color-mix(in oklab, var(--charcoal) 88%, transparent) 100%)",
        opacity: phase === "exit" ? 0 : 1,
        transition: "opacity 380ms ease-out",
      }}
    >
      <div
        className="w-full max-w-[420px] text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 520ms ease-out 80ms, transform 520ms ease-out 80ms",
        }}
      >
        <p
          className="text-[10.5px] uppercase tracking-[0.32em] font-bold inline-flex items-center justify-center gap-2"
          style={{ color: "var(--gold)" }}
        >
          <span style={{ color: "var(--ivory)" }}>YES</span>
          <span aria-hidden>—</span>
          <span>{voice?.eyebrow ?? "PORTUGAL VOICE"}</span>
        </p>

        {voice ? (
          <p
            className="mt-6 text-[20px] sm:text-[22px] leading-[1.35] italic"
            style={{
              fontFamily: "var(--font-serif)",
              color: "color-mix(in oklab, var(--ivory) 92%, transparent)",
            }}
          >
            {voice.whisper}
          </p>
        ) : null}

        {memory ? (
          <p
            className="mt-5 text-[11px] uppercase tracking-[0.24em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--ivory) 60%, transparent)" }}
          >
            {memory}
          </p>
        ) : null}

        <div
          className="mt-7 mx-auto h-px"
          style={{
            width: visible ? "120px" : "0px",
            background: "var(--gold)",
            transition: "width 720ms ease-out 220ms",
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
