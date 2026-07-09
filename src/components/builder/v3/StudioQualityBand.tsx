import { useMemo } from "react";
import type { ComposedDay } from "@/lib/drift/composer";
import { t as tt, type DriftLocale } from "@/lib/drift/i18n";
import type { DriftProfile } from "./StudioDrift";

/**
 * StudioQualityBand — Studio v4 / Fase 5.
 *
 * Shown inside the StudioLivePreview drawer (Story tab) once the engine
 * has enough signal to estimate a real "quality of fit" score for the day
 * being composed.
 *
 *   Experience Quality 92% · excellent flow and pacing
 *   ▰▰▰▰▱  Wine    · ▰▰▱▱▱  Coast
 *   ▰▰▰▰▰  Heritage· ▰▰▰▱▱  Ease
 *
 * Score is a real composition, not vibes:
 *   · profile coverage (how many drift dimensions are explicit)  — 35%
 *   · day breadth (variety of stop kinds — table/viewpoint/wine…) — 25%
 *   · pacing balance (1 active + 1 slow window inside the day)    — 20%
 *   · day length within radius budget (no overruns)               — 20%
 *
 * Only renders when confidence ≥ 0.5 (drawer is meaningful, score is honest).
 */
interface Props {
  day: ComposedDay;
  profile: DriftProfile;
  confidence: number;
  locale: DriftLocale;
}

const AFFINITY_KINDS = {
  wine: new Set(["winery", "cellar"]),
  coast: new Set(["beach", "viewpoint", "village"]),
  heritage: new Set(["heritage", "village"]),
  table: new Set(["table", "market", "workshop"]),
};

export function StudioQualityBand({ day, profile, confidence, locale }: Props) {
  const data = useMemo(() => {
    if (confidence < 0.5 || day.stops.length === 0) return null;

    // Profile coverage — explicit signals on the 5 drift dimensions
    const dims = [
      profile.companions,
      profile.pickup,
      profile.energy,
      profile.style,
      profile.social,
    ];
    const coverage = dims.filter(Boolean).length / dims.length; // 0..1

    // Day breadth — distinct stop kinds / target 4
    const kinds = new Set(day.stops.map((cs) => cs.stop.kind));
    const breadth = Math.min(1, kinds.size / 4);

    // Pacing balance — at least 1 slow (table/heritage/viewpoint) + 1 active (winery/workshop/cellar)
    const slow = day.stops.some((cs) =>
      ["table", "heritage", "viewpoint", "village"].includes(cs.stop.kind),
    );
    const active = day.stops.some((cs) =>
      ["winery", "workshop", "cellar", "market"].includes(cs.stop.kind),
    );
    const balance = slow && active ? 1 : slow || active ? 0.55 : 0.2;

    // Budget — total day < 11h
    const totalH = day.totals.dayMin / 60;
    const budget = totalH <= 9 ? 1 : totalH <= 11 ? 0.75 : 0.45;

    const score = Math.round(
      (coverage * 0.35 + breadth * 0.25 + balance * 0.2 + budget * 0.2) * 100,
    );

    // Affinity bars (0..5 ticks) — count stops matching each lens
    const tick = (set: Set<string>): number => {
      const n = day.stops.filter((cs) => set.has(cs.stop.kind)).length;
      return Math.min(5, n);
    };

    return {
      score,
      bars: [
        { key: "wine", label: tt("quality.wine", locale), n: tick(AFFINITY_KINDS.wine) },
        { key: "coast", label: tt("quality.coast", locale), n: tick(AFFINITY_KINDS.coast) },
        {
          key: "heritage",
          label: tt("quality.heritage", locale),
          n: tick(AFFINITY_KINDS.heritage),
        },
        { key: "table", label: tt("quality.table", locale), n: tick(AFFINITY_KINDS.table) },
      ],
    };
  }, [day, profile, confidence, locale]);

  if (!data) return null;

  const summary =
    data.score >= 90
      ? tt("quality.summary_high", locale)
      : data.score >= 75
        ? tt("quality.summary_mid", locale)
        : tt("quality.summary_low", locale);

  return (
    <section
      aria-label={tt("quality.aria", locale)}
      className="mb-4 rounded-[8px] px-3 py-3 motion-safe:animate-[fade-in_0.45s_ease-out_both]"
      style={{
        background: "var(--ivory)",
        border: "1px solid color-mix(in oklab, var(--charcoal) 12%, transparent)",
      }}
    >
      <header className="mb-2.5 flex items-baseline justify-between gap-2">
        <p
          className="text-[9.5px] uppercase tracking-[0.18em] font-bold"
          style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
        >
          {tt("quality.eyebrow", locale)}
        </p>
        <p
          className="tabular-nums"
          style={{
            fontFamily: "'Montserrat', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "20px",
            color: "var(--teal)",
            lineHeight: 1,
          }}
        >
          {data.score}%
        </p>
      </header>
      <p
        className="mb-3 italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "12px",
          lineHeight: 1.35,
          color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
        }}
      >
        {summary}
      </p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {data.bars.map((b) => (
          <li key={b.key} className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap"
              style={{ color: "var(--charcoal)", minWidth: 52 }}
            >
              {b.label}
            </span>
            <span className="flex items-center gap-[2px]" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className="block h-[6px] w-[6px] rounded-full"
                  style={{
                    background:
                      i < b.n
                        ? "var(--gold)"
                        : "color-mix(in oklab, var(--charcoal) 12%, transparent)",
                  }}
                />
              ))}
            </span>
            <span className="sr-only">
              {b.n} {tt("quality.of_five", locale)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
