import { memo } from "react";

/**
 * PortugalSilhouette — ambient geographic anchor.
 *
 * Faint, stylised silhouette of mainland Portugal that lives behind the
 * Studio V3 phases. As the traveller progresses through the conversation,
 * the coastline draws itself in (teal) and — when a region intent is
 * inferred — a soft gold pulse settles where the journey is taking
 * shape. The point is anticipation: the map exists *before* it awakens.
 *
 * Strict atmosphere only — no labels, no chrome, no interactivity.
 * Always pointer-events-none. Respects prefers-reduced-motion.
 */
export type SilhouetteRegion = "arrabida" | "lisbon-coast" | "alentejo" | "centro" | null;

interface Props {
  /** 0..1 — how much of the coastline has drawn in. */
  fill: number;
  /** Optional inferred destination region. Adds a gold pulse dot. */
  region?: SilhouetteRegion;
}

// Stylised mainland Portugal — concave west coast, wider south.
// Not a survey grade outline; an editorial silhouette read as Portugal.
const PT_PATH =
  "M 32 6 L 78 10 L 82 30 L 86 56 L 82 86 L 78 116 L 72 144 L 64 170 L 54 196 L 40 210 L 28 204 L 20 182 L 16 154 L 20 124 L 26 96 L 22 66 L 18 38 L 24 16 Z";

const REGION_DOT: Record<NonNullable<SilhouetteRegion>, { x: number; y: number }> = {
  centro: { x: 52, y: 68 },
  "lisbon-coast": { x: 42, y: 128 },
  arrabida: { x: 46, y: 146 },
  alentejo: { x: 60, y: 158 },
};

function PortugalSilhouetteBase({ fill, region = null }: Props) {
  const clamped = Math.max(0, Math.min(1, fill));

  // Approximate path length so stroke-dasharray reveal is smooth.
  const PATH_LENGTH = 620;
  const dashOffset = PATH_LENGTH * (1 - clamped);
  const dot = region ? REGION_DOT[region] : null;

  return (
    <div
      aria-hidden
      data-testid="studio-v3-anticipation-layer"
      data-region={region ?? "none"}
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center opacity-100"
      style={{ contain: "layout paint style", transform: "translateZ(0)", willChange: "transform, opacity" }}
    >
      <svg
        viewBox="0 0 100 220"
        preserveAspectRatio="xMidYMid meet"
        className="h-[78%] sm:h-[82%] w-auto motion-reduce:transition-none"
        style={{ opacity: 0.5 }}
      >
        {/* Ghost outline — always present, very faint. */}
        <path
          d={PT_PATH}
          fill="none"
          stroke="color-mix(in oklab, var(--charcoal) 14%, transparent)"
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
        {/* Drawn coastline — teal, grows with progress. */}
        <path
          d={PT_PATH}
          fill="none"
          stroke="color-mix(in oklab, var(--teal) 55%, transparent)"
          strokeWidth={0.9}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={PATH_LENGTH}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 0.61, 0.36, 1)" }}
        />
        {/* Soft interior wash — fades in with progress. */}
        <path
          d={PT_PATH}
          fill="color-mix(in oklab, var(--sand) 50%, transparent)"
          style={{ opacity: clamped * 0.35, transition: "opacity 900ms ease-out" }}
        />
        {/* Region pulse — gold dot at the inferred destination. */}
        {dot ? (
          <g key={region} data-testid="studio-v3-region-pulse" style={{ transformOrigin: `${dot.x}px ${dot.y}px`, transformBox: "fill-box" }}>
            <circle
              cx={dot.x}
              cy={dot.y}
              r={3}
              fill="color-mix(in oklab, var(--gold) 30%, transparent)"
              className="motion-reduce:hidden"
              style={{ animation: "studioV3PtPulse 2600ms ease-in-out infinite" }}
            />
            <circle cx={dot.x} cy={dot.y} r={1.2} fill="var(--gold)" />
          </g>
        ) : null}
      </svg>
      <style>{`
        @keyframes studioV3PtPulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.8); }
        }
      `}</style>
    </div>
  );
}

export const PortugalSilhouette = memo(PortugalSilhouetteBase);
