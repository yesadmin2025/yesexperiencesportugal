// Studio V3 — Quality Score card.
//
// Compact, editorial bar that visualises how coherent the day is.
// Drives off the pure `computeQualityScore` helper so the math is
// unit-tested in isolation. Renders nothing when there isn't enough
// signal yet (Studio Bible §11 — never show empty/0% bars).

import { useMemo } from "react";
import type { StudioV3State } from "./types";
import { computeQualityScore } from "@/lib/studio-v3-quality";

interface Props {
  state: StudioV3State;
}

const toneStyles = {
  excellent: {
    bar: "var(--gold)",
    label: "var(--gold)",
  },
  good: {
    bar: "color-mix(in oklab, var(--gold) 70%, var(--teal))",
    label: "var(--teal)",
  },
  consider: {
    bar: "color-mix(in oklab, var(--charcoal) 50%, transparent)",
    label: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
  },
} as const;

export function QualityScore({ state }: Props) {
  const score = useMemo(() => computeQualityScore(state), [state]);
  if (!score) return null;

  const tone = toneStyles[score.tone];

  return (
    <section
      data-testid="studio-v3-quality-score"
      data-score={score.score}
      data-tone={score.tone}
      aria-label={`Experience quality: ${score.label}, ${score.score} percent`}
      className="mx-auto mt-4 w-full max-w-[460px] px-5"
    >
      <div
        className="rounded-[6px] px-4 py-3"
        style={{
          background: "color-mix(in oklab, var(--ivory) 94%, var(--sand))",
          border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
        }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p
            className="text-[10px] uppercase tracking-[0.26em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            Quality of the day
          </p>
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold tabular-nums"
            style={{ color: tone.label }}
          >
            {score.label} <span className="ml-1 opacity-70">· {score.score}%</span>
          </p>
        </div>
        <div
          className="mt-2 h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: "color-mix(in oklab, var(--charcoal) 8%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${score.score}%`, background: tone.bar }}
            aria-hidden
          />
        </div>
        <p
          className="mt-2 text-[11.5px] italic leading-snug"
          style={{
            fontFamily: "var(--font-serif)",
            color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
          }}
        >
          {score.caption}
        </p>
      </div>
    </section>
  );
}
