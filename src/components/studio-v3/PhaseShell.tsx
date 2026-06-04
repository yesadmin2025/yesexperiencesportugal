import { type ReactNode, useEffect, useState } from "react";

/**
 * PhaseShell — cinematic frame shared by every Studio V3 phase.
 *
 * Renders a full-viewport ivory stage with a quietly moving warm gradient
 * underneath and a slow ambient light wash. The whole thing fades in on
 * mount and crossfades out when `exiting` is true, so a parent orchestrator
 * can sequence phases without abrupt cuts. Respects prefers-reduced-motion.
 *
 * Children compose the phase content. The shell handles atmosphere only.
 */
interface PhaseShellProps {
  children: ReactNode;
  /** Subtle hue accent that shifts per phase (teal / gold). */
  accent?: "teal" | "gold" | "ivory";
  /** When true, the shell fades out gracefully (~480ms). */
  exiting?: boolean;
  /** Phase index 1..N — drives a tiny progress whisper at the top. */
  step?: number;
  totalSteps?: number;
}

export function PhaseShell({
  children,
  accent = "ivory",
  exiting = false,
  step,
  totalSteps,
}: PhaseShellProps) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  const accentColor =
    accent === "teal"
      ? "color-mix(in oklab, var(--teal) 14%, transparent)"
      : accent === "gold"
        ? "color-mix(in oklab, var(--gold) 16%, transparent)"
        : "color-mix(in oklab, var(--sand) 60%, transparent)";

  return (
    <div
      className={`relative min-h-[100dvh] w-full overflow-hidden transition-opacity duration-[480ms] ease-out motion-reduce:transition-none ${
        entered && !exiting ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "var(--ivory)" }}
    >
      {/* Ambient wash — slow radial glow that breathes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 motion-reduce:hidden"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${accentColor} 0%, transparent 65%)`,
          animation: "studioV3Breathe 14s ease-in-out infinite",
        }}
      />
      {/* Static fallback for reduced motion. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden motion-reduce:block"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${accentColor} 0%, transparent 65%)`,
        }}
      />
      {/* Hairline gold horizon. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-px w-12 -translate-x-1/2"
        style={{ background: "var(--gold)" }}
      />

      {/* Tiny progress whisper. */}
      {step && totalSteps ? (
        <div
          className="absolute left-1/2 top-5 -translate-x-1/2 text-[10px] uppercase tracking-[0.28em] font-semibold select-none"
          style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
          aria-label={`Step ${step} of ${totalSteps}`}
        >
          {String(step).padStart(2, "0")} <span style={{ color: "var(--gold)" }}>·</span>{" "}
          {String(totalSteps).padStart(2, "0")}
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-5 py-16 sm:py-20">
        {children}
      </div>

      {/* Local keyframes — scoped via style tag to avoid polluting global CSS. */}
      <style>{`
        @keyframes studioV3Breathe {
          0%, 100% { opacity: 0.85; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2%); }
        }
        @keyframes studioV3RiseIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
