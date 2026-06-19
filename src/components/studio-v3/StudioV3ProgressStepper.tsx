// Studio V3 — 4-beat progression stepper.
//
// Region → Rhythm → Dates → Compose
//
// Visible from the first answered phase onward; hidden on intro.
// Interactive: completed beats are keyboard-focusable buttons that
// jump BACK (never forward). Left/Right arrows move focus between
// reachable beats, Home/End jump to first/last reachable.

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { StudioV3Phase } from "./types";
import { recordStudioV3BuilderStep } from "@/lib/studio-v3-telemetry";

export const STUDIO_V3_BEATS = [
  { id: "region", label: "Region" },
  { id: "rhythm", label: "Rhythm" },
  { id: "dates", label: "Dates" },
  { id: "compose", label: "Compose" },
] as const;

export type StudioV3BeatId = (typeof STUDIO_V3_BEATS)[number]["id"];

/** First phase associated with each beat — used as jump-back target. */
const BEAT_ENTRY_PHASE: Record<StudioV3BeatId, StudioV3Phase> = {
  region: "feeling",
  rhythm: "rhythm",
  dates: "date",
  compose: "map",
};

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
      return 0;
    case "interests":
    case "rhythm":
    case "considerations":
    case "language":
    case "investment":
      return 1;
    case "date":
      return 2;
    case "map":
    case "storyboard":
      return 3;
    default:
      return null;
  }
}

export interface StudioV3ProgressStepperProps {
  phase: StudioV3Phase;
  /** When provided, completed beats become buttons that jump back to that beat's entry phase. */
  onJumpToBeat?: (beat: StudioV3BeatId, entryPhase: StudioV3Phase) => void;
  /** Fires when the active beat index advances (used by mobile reveal overlay). */
  onBeatAdvance?: (beat: StudioV3BeatId, index: number) => void;
}

export function StudioV3ProgressStepper({
  phase,
  onJumpToBeat,
  onBeatAdvance,
}: StudioV3ProgressStepperProps) {
  const active = useMemo(() => beatIndexForPhase(phase), [phase]);
  const lastAdvancedRef = useRef<number>(-1);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // Telemetry — emit on every perceived phase change.
  useEffect(() => {
    if (active == null) return;
    const beat = STUDIO_V3_BEATS[active];
    recordStudioV3BuilderStep({ step: beat.id, stepIndex: active, phase });
  }, [active, phase]);

  // Mobile reveal hook — only fire when active beat *advances*, not on back-jumps.
  useEffect(() => {
    if (active == null) return;
    if (active > lastAdvancedRef.current) {
      lastAdvancedRef.current = active;
      onBeatAdvance?.(STUDIO_V3_BEATS[active].id, active);
    }
  }, [active, onBeatAdvance]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (active == null) return;
      const reachable: number[] = [];
      for (let i = 0; i <= active; i += 1) reachable.push(i);
      const pos = reachable.indexOf(currentIndex);
      let nextPos = pos;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextPos = Math.min(reachable.length - 1, pos + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextPos = Math.max(0, pos - 1);
          break;
        case "Home":
          nextPos = 0;
          break;
        case "End":
          nextPos = reachable.length - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const target = buttonsRef.current[reachable[nextPos]];
      target?.focus();
    },
    [active],
  );

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
        const isReachable = isActive || isDone;
        const canJump = isDone && typeof onJumpToBeat === "function";

        const bar = (
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
        );
        const label = (
          <span
            className="text-[9.5px] uppercase tracking-[0.22em] font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: isReachable
                ? "var(--charcoal)"
                : "color-mix(in oklab, var(--charcoal) 55%, transparent)",
            }}
          >
            {beat.label}
          </span>
        );

        const sharedProps = {
          "data-beat": beat.id,
          "data-state": isActive ? "active" : isDone ? "done" : "upcoming",
          "aria-current": isActive ? ("step" as const) : undefined,
        };

        if (canJump) {
          return (
            <button
              key={beat.id}
              type="button"
              ref={(el) => {
                buttonsRef.current[i] = el;
              }}
              onClick={() => onJumpToBeat?.(beat.id, BEAT_ENTRY_PHASE[beat.id])}
              onKeyDown={(e) => handleKeyDown(e, i)}
              aria-label={`Return to ${beat.label}`}
              className="group flex flex-1 flex-col items-center gap-1.5 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
              {...sharedProps}
            >
              {bar}
              {label}
            </button>
          );
        }

        return (
          <div
            key={beat.id}
            className="flex flex-1 flex-col items-center gap-1.5"
            {...sharedProps}
          >
            {bar}
            {label}
          </div>
        );
      })}
    </nav>
  );
}
