import { type ReactNode, useEffect, useState } from "react";
import { PortugalSilhouette, type SilhouetteRegion } from "./PortugalSilhouette";

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
  accent?: "teal" | "gold" | "ivory";
  exiting?: boolean;
  step?: number;
  totalSteps?: number;
  progress?: { percent: number; phrase: string } | null;
  /** Ambient Portugal silhouette behind the content. Coastline draws in
   *  with `fill` (0..1); optional region pulses gold where the journey
   *  is taking shape. Strict atmosphere — never interactive. */
  anticipation?: { fill: number; region?: SilhouetteRegion } | null;
}

export function PhaseShell({
  children,
  accent = "ivory",
  exiting = false,
  step,
  totalSteps,
  progress,
  anticipation = null,
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
        data-testid="studio-v3-wash-layer"
        className="pointer-events-none absolute inset-0 z-0 motion-reduce:hidden"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${accentColor} 0%, transparent 65%)`,
          animation: "studioV3Breathe 14s ease-in-out infinite",
        }}
      />
      {/* Static fallback for reduced motion. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 hidden motion-reduce:block"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${accentColor} 0%, transparent 65%)`,
        }}
      />
      {/* Ambient Portugal silhouette — anticipation of the map. */}
      {anticipation ? (
        <PortugalSilhouette fill={anticipation.fill} region={anticipation.region ?? null} />
      ) : null}

      {/* Hairline gold horizon. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] z-[2] h-px w-12 -translate-x-1/2"
        style={{ background: "var(--gold)" }}
      />

      {/* Adaptive progress whisper — emotional phrase + soft percent.
          Calm, not loud; never a bar, never "step X of Y". */}
      {progress ? (
        <div
          data-testid="studio-v3-progress"
          className="absolute left-1/2 top-4 -translate-x-1/2 w-[min(92vw,520px)] px-1 select-none"
          aria-label={`${Math.round(progress.percent)}% shaped`}
          style={{ animation: "studioV3RiseIn 520ms ease-out both" }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p
              className="text-[12.5px] sm:text-[13.5px] leading-[1.35] truncate"
              style={{
                fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
                color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
              }}
            >
              {progress.phrase}
            </p>
            <p
              className="shrink-0 text-[9.5px] uppercase tracking-[0.26em] font-semibold"
              style={{ color: "var(--gold)" }}
            >
              — {Math.round(progress.percent)}% shaped
            </p>
          </div>
          <div
            aria-hidden
            className="mt-2 h-px w-full"
            style={{ background: "color-mix(in oklab, var(--gold) 35%, transparent)" }}
          />
        </div>
      ) : step && totalSteps ? (
        <div
          className="absolute left-1/2 top-5 -translate-x-1/2 text-[9.5px] uppercase tracking-[0.3em] font-semibold select-none"
          style={{ color: "color-mix(in oklab, var(--charcoal) 30%, transparent)" }}
          aria-label={`Step ${step} of ${totalSteps}`}
        >
          {String(step).padStart(2, "0")}{" "}
          <span style={{ color: "color-mix(in oklab, var(--gold) 70%, transparent)" }}>·</span>{" "}
          {String(totalSteps).padStart(2, "0")}
        </div>
      ) : null}

      <div data-testid="studio-v3-content-layer" className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-start px-5 pt-24 pb-32 sm:justify-center sm:py-20">
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
