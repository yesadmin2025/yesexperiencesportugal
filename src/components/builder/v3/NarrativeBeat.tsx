import { useEffect, useState } from "react";

/**
 * NarrativeBeat — transient atmospheric line that surfaces at emotional
 * transitions only. Editorial serif italic, centered, breathes in for ~600ms,
 * holds, then dissolves after ~5.5s. Never persistent UI — it appears, it
 * lands, it disappears. The traveller never sees "AI text on screen"; they
 * feel a moment of recognition.
 *
 * Reduced-motion: no transform, only opacity; still respects the dissolve.
 */
interface Props {
  /** Fragment text (already sanitized server-side). */
  fragment: string | null;
  /** Timestamp of when this fragment arrived — drives the lifecycle. */
  at: number | null;
  /** Hold duration in ms (default 5500). Tuned by affinity.pacing in caller. */
  holdMs?: number;
  /** Optional onComplete callback when the beat fully fades out. */
  onComplete?: () => void;
}

export function NarrativeBeat({ fragment, at, holdMs = 5500, onComplete }: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!fragment || !at) {
      setVisible(false);
      setMounted(false);
      return;
    }
    setMounted(true);
    // Allow one frame so the enter transition runs.
    const enterTimer = window.setTimeout(() => setVisible(true), 40);
    const exitTimer = window.setTimeout(() => setVisible(false), holdMs);
    const unmountTimer = window.setTimeout(() => {
      setMounted(false);
      onComplete?.();
    }, holdMs + 900);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [fragment, at, holdMs, onComplete]);

  if (!mounted || !fragment) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-[38%] z-30 flex justify-center px-6"
    >
      <p
        className="max-w-[28ch] text-center italic text-[15px] sm:text-[16px] leading-[1.55] text-[color:var(--ivory)] text-balance transition-all duration-[900ms] ease-out motion-reduce:transition-opacity"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          opacity: visible ? 0.92 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          textShadow: "0 1px 18px rgba(0,0,0,0.55)",
          letterSpacing: "0.005em",
        }}
      >
        {fragment}
      </p>
    </div>
  );
}
