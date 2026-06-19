// MobileBeatReveal — cinematic full-screen beat handoff for mobile.
//
// When the perceived beat advances (Region → Rhythm → Dates → Compose),
// we briefly take over the viewport with a dark editorial canvas and
// light the next gold pin, then dissolve back into the question. This
// keeps the map out from "behind" the question on small screens and
// gives each beat its own moment.

import { useEffect, useState } from "react";
import type { StudioV3BeatId } from "./StudioV3ProgressStepper";
import { STUDIO_V3_BEATS } from "./StudioV3ProgressStepper";

const BEAT_TITLE: Record<StudioV3BeatId, string> = {
  region: "Where it begins",
  rhythm: "The rhythm of your day",
  dates: "Choosing your moment",
  compose: "Composing your Signature",
};

const BEAT_WHISPER: Record<StudioV3BeatId, string> = {
  region: "Portugal opens, slowly.",
  rhythm: "We listen to how you move.",
  dates: "Light bends toward your day.",
  compose: "Every stop, placed by hand.",
};

const REDUCE_DURATION = 0;
const HOLD_MS = 1200;

export interface MobileBeatRevealProps {
  /** When this changes, the overlay fires for that beat. */
  beat: StudioV3BeatId | null;
  /** Index 0..3, drives how many gold pins light up. */
  index: number;
  /** Called when the overlay finishes (parent clears `beat`). */
  onDone: () => void;
}

export function MobileBeatReveal({ beat, index, onDone }: MobileBeatRevealProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit" | "idle">("idle");

  useEffect(() => {
    if (!beat) {
      setPhase("idle");
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onDone();
      return;
    }
    setPhase("enter");
    const t1 = window.setTimeout(() => setPhase("hold"), 280);
    const t2 = window.setTimeout(() => setPhase("exit"), 280 + HOLD_MS);
    const t3 = window.setTimeout(() => {
      setPhase("idle");
      onDone();
    }, 280 + HOLD_MS + 320 + REDUCE_DURATION);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [beat, onDone]);

  if (!beat || phase === "idle") return null;

  const opacity = phase === "enter" ? 0 : phase === "exit" ? 0 : 1;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="studio-v3-mobile-beat-reveal"
      data-beat={beat}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8 sm:hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 40%, color-mix(in oklab, var(--teal) 55%, var(--charcoal)) 0%, var(--charcoal) 70%)",
        opacity,
        transition: "opacity 280ms ease",
        pointerEvents: "none",
      }}
    >
      {/* Pin constellation — lights up to the current beat. */}
      <div className="mb-6 flex items-center gap-3" aria-hidden>
        {STUDIO_V3_BEATS.map((_, i) => {
          const lit = i <= index;
          return (
            <span
              key={i}
              className="block rounded-full"
              style={{
                width: 8,
                height: 8,
                background: lit ? "var(--gold)" : "color-mix(in oklab, var(--ivory) 18%, transparent)",
                boxShadow: lit && i === index ? "0 0 16px 2px color-mix(in oklab, var(--gold) 60%, transparent)" : "none",
                transition: "background 280ms ease, box-shadow 280ms ease",
              }}
            />
          );
        })}
      </div>

      <p
        className="text-[10.5px] uppercase tracking-[0.32em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--gold) 90%, transparent)" }}
      >
        — {STUDIO_V3_BEATS[index]?.label}
      </p>
      <h2
        className="mt-3 text-center text-[24px] leading-[1.15] font-semibold"
        style={{ fontFamily: "var(--font-display)", color: "var(--ivory)" }}
      >
        {BEAT_TITLE[beat]}
      </h2>
      <p
        className="mt-3 text-center text-[14px] italic"
        style={{
          fontFamily: "var(--font-serif)",
          color: "color-mix(in oklab, var(--ivory) 75%, transparent)",
        }}
      >
        {BEAT_WHISPER[beat]}
      </p>
    </div>
  );
}
