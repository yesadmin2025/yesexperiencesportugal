import { useEffect, useState } from "react";
import type { Mood as SceneMood } from "@/lib/drift/behavior";
import { type DriftLocale } from "@/lib/drift/i18n";

/**
 * EmergingThemes — surfaces the predictive engine's `sceneWeighting`
 * as a thin, almost-invisible row of editorial chips that fade in
 * when a mood crosses threshold and fade out when it falls below.
 *
 * Studio philosophy guardrail: this is observational, not a control.
 * No clicks, no choices, no progress bar. Just gentle confirmation
 * that the engine is listening. Hidden during convergence (reveal
 * carries its own emotional language) and under prefers-reduced-motion
 * (we still render the chips, just without the soft pulse).
 */

const THEME_LABELS: Partial<Record<SceneMood, Record<DriftLocale, string>>> = {
  intimacy:    { en: "intimacy",     pt: "intimidade",   es: "intimidad",   fr: "intimité" },
  ritual:      { en: "ritual",       pt: "ritual",       es: "ritual",      fr: "rituel" },
  slowness:    { en: "slowness",     pt: "lentidão",     es: "calma",       fr: "lenteur" },
  arrival:     { en: "arrival",      pt: "chegada",      es: "llegada",     fr: "arrivée" },
  discovery:   { en: "discovery",    pt: "descoberta",   es: "descubrir",   fr: "découverte" },
  celebration: { en: "celebration",  pt: "celebração",   es: "celebración", fr: "célébration" },
};

interface Props {
  sceneWeighting: Partial<Record<SceneMood, number>>;
  locale: DriftLocale;
  /** Only show once the user has confirmed at least one explicit signal. */
  hasSignal: boolean;
}

export function EmergingThemes({ sceneWeighting, locale, hasSignal }: Props) {
  // Threshold: a mood must reach ≥ 0.6 to surface. Hysteresis at 0.5 to drop.
  const SHOW = 0.6;
  const HIDE = 0.5;

  const [active, setActive] = useState<SceneMood[]>([]);

  useEffect(() => {
    if (!hasSignal) {
      setActive([]);
      return;
    }
    setActive((prev) => {
      const next = new Set(prev);
      (Object.entries(sceneWeighting) as Array<[SceneMood, number]>).forEach(
        ([mood, weight]) => {
          if (weight >= SHOW) next.add(mood);
          else if (weight <= HIDE) next.delete(mood);
        },
      );
      // Cap at top 3 by current weight to keep the line readable.
      return Array.from(next)
        .sort(
          (a, b) =>
            (sceneWeighting[b] ?? 0) - (sceneWeighting[a] ?? 0),
        )
        .slice(0, 3);
    });
  }, [sceneWeighting, hasSignal]);

  if (active.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute top-9 left-0 right-0 z-40 pointer-events-none flex justify-center items-center gap-2 px-6"
    >
      {active.map((mood, i) => {
        const label = THEME_LABELS[mood]?.[locale] ?? THEME_LABELS[mood]?.en ?? mood;
        return (
          <span
            key={mood}
            className="motion-safe:animate-[fade-in_0.7s_ease-out_both] inline-flex items-center gap-2"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className="block h-[3px] w-[3px] rounded-full"
                style={{ background: "color-mix(in oklab, var(--gold) 60%, transparent)" }}
              />
            )}
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                fontSize: "12px",
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: "0",
                color: "color-mix(in oklab, var(--ivory) 90%, var(--gold))",
                textShadow: "0 1px 10px rgba(0,0,0,0.65)",
                opacity: 0.86,
              }}
            >
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
