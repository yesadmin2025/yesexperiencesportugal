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
  accent?: "teal" | "gold" | "ivory";
  exiting?: boolean;
  step?: number;
  totalSteps?: number;
  progress?: { percent: number; phrase: string } | null;
  /** Regional anticipation — a quiet pulse hinting at the resolving region.
   *  `fill` is 0..1 (used to modulate intensity); `region` is the resolved
   *  region id (e.g. "arrabida") or `null` while destinationIntent is still
   *  ambiguous. When `region` is null, no pulse is rendered — only the
   *  layer itself, so layout stays stable. */
  anticipation?: { fill: number; region: string | null } | null;
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
      {/* Hairline gold horizon. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] z-[2] h-px w-12 -translate-x-1/2"
        style={{ background: "var(--gold)" }}
      />

      {/* Regional anticipation layer — sits between wash and content.
          Renders a soft, region-tinted pulse once destinationIntent
          resolves; before that it's an empty, layout-stable shell. */}
      {anticipation ? (
        <RegionAnticipationLayer
          fill={anticipation.fill}
          region={anticipation.region}
        />
      ) : null}

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

      <div data-testid="studio-v3-content-layer" className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-start px-5 pt-28 pb-28 sm:justify-center sm:py-20">
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

/**
 * RegionAnticipationLayer — a low-key pulse that warms the stage in the tint
 * of the resolving region. Pure atmosphere: pointer-events-none, aria-hidden,
 * sits between the wash and the content layer, and respects reduced motion.
 *
 * - `region === null` → renders an empty, region="none" shell (no pulse), so
 *   the layer is always present and layout never shifts as intent resolves.
 * - `fill` (0..1) modulates the pulse opacity so confidence reads visually.
 */
const REGION_TINT: Record<string, string> = {
  arrabida: "color-mix(in oklab, var(--teal) 28%, transparent)",
  douro: "color-mix(in oklab, var(--gold) 28%, transparent)",
  alentejo: "color-mix(in oklab, var(--sand) 70%, transparent)",
  lisboa: "color-mix(in oklab, var(--teal) 22%, transparent)",
  sintra: "color-mix(in oklab, var(--teal) 24%, transparent)",
  porto: "color-mix(in oklab, var(--gold) 24%, transparent)",
};

function RegionAnticipationLayer({
  fill,
  region,
}: {
  fill: number;
  region: string | null;
}) {
  const clamped = Math.max(0, Math.min(1, fill));
  const tint =
    region && REGION_TINT[region]
      ? REGION_TINT[region]
      : "color-mix(in oklab, var(--gold) 18%, transparent)";

  return (
    <div
      aria-hidden
      data-testid="studio-v3-anticipation-layer"
      data-region={region ?? "none"}
      data-fill={clamped.toFixed(2)}
      className="pointer-events-none absolute inset-0 z-[1] motion-reduce:hidden"
    >
      {region ? (
        <div
          data-testid="studio-v3-region-pulse"
          className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "min(78vw, 520px)",
            aspectRatio: "1 / 1",
            background: `radial-gradient(circle at 50% 50%, ${tint} 0%, transparent 62%)`,
            opacity: 0.35 + clamped * 0.55,
            animation: "studioV3RegionPulse 6.4s ease-in-out infinite",
          }}
        />
      ) : null}
      <style>{`
        @keyframes studioV3RegionPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: var(--anticipation-base, 0.5); }
          50% { transform: translate(-50%, -50%) scale(1.04); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
