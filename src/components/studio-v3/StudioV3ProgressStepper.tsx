// Studio V3 — 4-beat progression stepper.
//
// Maps the granular internal phase model (feeling → destination → who →
// occasion → date → pickup → guests → interests → rhythm → considerations
// → language → investment → map → storyboard) into the four emotional
// beats the traveller actually perceives:
//
//   Region → Rhythm → Dates → Compose
//
// Visible from the first answered phase onward; hidden on intro and on the
// final reveal so it never competes with the signature itself.

import { useEffect, useMemo } from "react";
import type { StudioV3Phase } from "./types";
import { recordStudioV3BuilderStep } from "@/lib/studio-v3-telemetry";

export const STUDIO_V3_BEATS = [
  { id: "region", label: "Region" },
  { id: "rhythm", label: "Rhythm" },
  { id: "dates", label: "Dates" },
  { id: "compose", label: "Compose" },
] as const;

export type StudioV3BeatId = (typeof STUDIO_V3_BEATS)[number]["id"];

/** Phase → beat index (0..3) or null when no beat should be highlighted. */
export function beatIndexForPhase(phase: StudioV3Phase): number | null {
  switch (phase) {
    case "intro":
      return null;
    case "feeling":
    case "destination":
    case "who":
    case "occasion":
    case "pickup":
    case "guests":
      return 0; // Region
    case "interests":
    case "rhythm":
    case "considerations":
    case "language":
    case "investment":
      return 1; // Rhythm
    case "date":
      return 2; // Dates
    case "map":
    case "storyboard":
      return 3; // Compose
    default:
      return null;
  }
}

export function StudioV3ProgressStepper({ phase }: { phase: StudioV3Phase }) {
  const active = useMemo(() => beatIndexForPhase(phase), [phase]);

  // Fire-and-forget telemetry whenever the perceived beat advances.
  useEffect(() => {
    if (active == null) return;
    const beat = STUDIO_V3_BEATS[active];
    recordStudioV3BuilderStep({
      step: beat.id,
      stepIndex: active,
      phase,
    });
  }, [active, phase]);

  if (active == null) return null;

  return (
    <nav
      aria-label="Studio progress"
      data-testid="studio-v3-progress-stepper"
      data-active-beat={STUDIO_V3_BEATS[active].id}
      className="mx-auto mt-4 mb-2 flex w-full max-w-[440px] items-center justify-between gap-2 px-5"
    >
      {STUDIO_V3_BEATS.map((beat, i) => {
        const isActive = i === active;
        const isDone = i < active;
        return (
          <div
            key={beat.id}
            className="flex flex-1 flex-col items-center gap-1.5"
            aria-current={isActive ? "step" : undefined}
          >
            <span
              aria-hidden
              className="block h-[3px] w-full rounded-full transition-colors duration-300"
              style={{
                background: isActive
                  ? "var(--gold)"
                  : isDone
                    ? "color-mix(in oklab, var(--gold) 55%, transparent)"
                    : "color-mix(in oklab, var(--charcoal) 12%, transparent)",
              }}
            />
            <span
              className="text-[9.5px] uppercase tracking-[0.22em] font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: isActive
                  ? "var(--charcoal)"
                  : "color-mix(in oklab, var(--charcoal) 55%, transparent)",
              }}
            >
              {beat.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
