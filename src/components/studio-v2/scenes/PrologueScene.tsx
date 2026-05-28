import { useEffect, useState } from "react";
import { INTENT_IMAGE } from "@/lib/studio-v2/images";

interface PrologueSceneProps {
  /** Fired automatically after the atmosphere beat (~3.2s) or on tap. */
  onContinue: () => void;
}

/**
 * Phase 0 — PROLOGUE.
 * Fullscreen cinematic atmosphere. No CTAs, no chrome, no place names.
 * Auto-advances after ~3.2s; tap-to-skip is honored but never invited.
 * Respects prefers-reduced-motion (shortens the dwell, drops the slow pan).
 */
export function PrologueScene({ onContinue }: PrologueSceneProps) {
  const [entered, setEntered] = useState(false);
  const [whisper, setWhisper] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const t0 = window.setTimeout(() => setEntered(true), 60);
    const t1 = window.setTimeout(() => setWhisper(true), reduced ? 400 : 1200);
    const t2 = window.setTimeout(onContinue, reduced ? 1800 : 3200);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onContinue]);

  return (
    <button
      type="button"
      onClick={onContinue}
      aria-label="Begin"
      className="fixed inset-0 z-30 block h-[100dvh] w-full overflow-hidden bg-[var(--charcoal,#2E2E2E)] text-[var(--ivory,#FAF8F3)] focus:outline-none"
    >
      <img
        src={INTENT_IMAGE.coastal_cinematic.src}
        alt=""
        aria-hidden="true"
        className={[
          "absolute inset-0 h-full w-full object-cover transition-all duration-[2400ms] ease-out",
          entered ? "scale-100 opacity-100" : "scale-[1.06] opacity-0",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/65"
      />
      <div className="relative z-10 flex h-full w-full items-end justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <p
          className={[
            "max-w-[20rem] text-center font-serif text-[15px] italic leading-snug tracking-wide",
            "text-[var(--ivory,#FAF8F3)]/85 transition-all duration-[1100ms] ease-out",
            whisper ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          ].join(" ")}
        >
          Portugal, before the words begin.
        </p>
      </div>
    </button>
  );
}
