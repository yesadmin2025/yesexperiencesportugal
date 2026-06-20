// Studio V3 — Affinity Bars (4 axes).
//
// Visualises how the current journey leans across four atmospheric axes:
// Atmosphere, Adventure, Culture, Indulgence. Each axis is a 0–5 dot rail
// where filled dots are gold and empty dots are sand. The score is derived
// deterministically from existing state — feeling, interests, rhythm,
// companions — and never invents new facts.
//
// Mobile-first: 4 stacked rows, each 28px tall, label on the left,
// 5 dots on the right. Respects prefers-reduced-motion (no entry animation).

import { useMemo } from "react";
import type { Feeling, Interest, Rhythm, Companions } from "./types";

interface AffinityBarsProps {
  feeling: Feeling | null;
  interests: Interest[];
  rhythm: Rhythm | null;
  companions: Companions | null;
}

type AxisKey = "atmosphere" | "adventure" | "culture" | "indulgence";

const AXES: Array<{ key: AxisKey; label: string }> = [
  { key: "atmosphere", label: "Atmosphere" },
  { key: "adventure", label: "Adventure" },
  { key: "culture", label: "Culture" },
  { key: "indulgence", label: "Indulgence" },
];

function clamp(n: number, min = 0, max = 5): number {
  return Math.max(min, Math.min(max, n));
}

function scoreAxes(
  feeling: Feeling | null,
  interests: Interest[],
  rhythm: Rhythm | null,
  companions: Companions | null,
): Record<AxisKey, number> {
  // Baselines so a half-formed journey still shows some shape.
  const s: Record<AxisKey, number> = {
    atmosphere: 1,
    adventure: 1,
    culture: 1,
    indulgence: 1,
  };

  switch (feeling) {
    case "coastal":
      s.atmosphere += 2;
      s.adventure += 1;
      break;
    case "wine-food":
      s.indulgence += 3;
      s.atmosphere += 1;
      break;
    case "hidden":
      s.adventure += 2;
      s.atmosphere += 1;
      break;
    case "romance":
      s.atmosphere += 3;
      s.indulgence += 1;
      break;
    case "family":
      s.atmosphere += 1;
      s.adventure += 1;
      break;
    case "culture":
      s.culture += 3;
      s.atmosphere += 1;
      break;
    case "adventure":
      s.adventure += 3;
      break;
    case "slow-luxury":
      s.indulgence += 2;
      s.atmosphere += 2;
      break;
  }

  for (const i of interests) {
    if (i === "wine" || i === "gastronomy") s.indulgence += 1;
    if (i === "nature" || i === "coast") s.adventure += 1;
    if (i === "heritage" || i === "local-life") s.culture += 1;
    if (i === "photography" || i === "wellness") s.atmosphere += 1;
  }

  if (rhythm === "slow" || rhythm === "immersive") s.atmosphere += 1;
  if (rhythm === "full" || rhythm === "immersive") s.adventure += 1;

  if (companions === "couple" || companions === "proposal") s.atmosphere += 1;
  if (companions === "celebration") s.indulgence += 1;
  if (companions === "family" || companions === "friends") s.adventure += 1;

  return {
    atmosphere: clamp(s.atmosphere),
    adventure: clamp(s.adventure),
    culture: clamp(s.culture),
    indulgence: clamp(s.indulgence),
  };
}

export function AffinityBars({
  feeling,
  interests,
  rhythm,
  companions,
}: AffinityBarsProps) {
  const scores = useMemo(
    () => scoreAxes(feeling, interests, rhythm, companions),
    [feeling, interests, rhythm, companions],
  );

  const anyData = !!feeling || interests.length > 0 || !!rhythm;
  if (!anyData) return null;

  return (
    <div data-testid="studio-v3-affinity-bars" className="mt-4">
      <p
        className="text-[9.5px] uppercase tracking-[0.22em] font-bold"
        style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
      >
        How your day leans
      </p>
      <ul className="mt-2 space-y-1.5">
        {AXES.map((axis) => {
          const filled = scores[axis.key];
          return (
            <li
              key={axis.key}
              className="flex items-center justify-between gap-3"
            >
              <span
                className="text-[10.5px] uppercase tracking-[0.18em] font-semibold"
                style={{
                  color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
                }}
              >
                {axis.label}
              </span>
              <span
                className="inline-flex items-center gap-1"
                aria-label={`${axis.label} ${filled} of 5`}
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const on = i < filled;
                  return (
                    <span
                      key={i}
                      aria-hidden
                      className="block h-1.5 w-1.5 rounded-full transition-colors duration-200"
                      style={{
                        background: on
                          ? "var(--gold)"
                          : "color-mix(in oklab, var(--sand) 90%, transparent)",
                        boxShadow: on
                          ? "0 0 0 1px color-mix(in oklab, var(--gold) 40%, transparent)"
                          : "none",
                      }}
                    />
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
