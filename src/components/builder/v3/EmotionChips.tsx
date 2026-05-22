import { useEffect, useState } from "react";
import type { StudioDict } from "@/hooks/useStudioLocale";
import type { Intention, Mood, Pace, Who } from "@/components/builder/types";

/**
 * Emotion-first entry. Lets the traveller shape the journey by tapping how
 * they feel — never asking for stop names, never requiring typing. Each tap
 * patches state and triggers the same suggestion flow as a written narration.
 */

export interface EmotionPick {
  mood?: Mood;
  who?: Who;
  intention?: Intention;
  pace?: Pace;
  /** A short PT/EN/etc phrase to seed the narrative log. */
  seed: string;
}

interface Props {
  t: StudioDict;
  /** Tone of the surface — light over a dark scene, dark over a light sheet. */
  tone?: "light" | "dark";
  /** Currently selected values (so chips can show active state). */
  active?: { mood?: Mood | null; who?: Who | null; intention?: Intention | null; pace?: Pace | null };
  onPick: (p: EmotionPick) => void;
}

export function EmotionChips({ t, tone = "light", active, onPick }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(id);
  }, []);

  const isLight = tone === "light";
  const baseChip = isLight
    ? "bg-[color:var(--ivory)]/92 text-[color:var(--charcoal)] border-[color:var(--gold)]/40 hover:border-[color:var(--gold)]"
    : "bg-[color:var(--charcoal)]/85 text-[color:var(--ivory)] border-[color:var(--gold)]/40 hover:border-[color:var(--gold)]";
  const activeChip = isLight
    ? "bg-[color:var(--gold)]/95 text-[color:var(--charcoal)] border-[color:var(--gold)]"
    : "bg-[color:var(--gold)]/95 text-[color:var(--charcoal)] border-[color:var(--gold)]";
  const labelColor = isLight ? "text-[color:var(--ivory)]/70" : "text-[color:var(--charcoal)]/55";

  type RowKind = "mood" | "who" | "intention" | "pace";
  const rows: { kind: RowKind; options: { value: string; label: string }[]; seedPrefix: string }[] = [
    { kind: "mood", options: t.moodOptions, seedPrefix: "" },
    { kind: "who", options: t.whoOptions, seedPrefix: "" },
    { kind: "intention", options: t.intentionOptions, seedPrefix: "" },
    { kind: "pace", options: t.paceOptions, seedPrefix: "" },
  ];

  return (
    <div
      className={`w-full max-w-2xl mx-auto transition-all duration-[600ms] ease-out ${
        ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <p
        className={`text-center text-[10.5px] uppercase tracking-[0.28em] font-semibold mb-2.5 ${labelColor}`}
      >
        {t.emotionPrompt}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {rows.map((row) =>
          row.options.map((opt) => {
            const activeVal =
              row.kind === "mood"
                ? active?.mood
                : row.kind === "who"
                  ? active?.who
                  : row.kind === "intention"
                    ? active?.intention
                    : active?.pace;
            const isActive = activeVal === opt.value;
            return (
              <button
                key={`${row.kind}-${opt.value}`}
                type="button"
                onClick={() => {
                  const pick: EmotionPick = { seed: opt.label.toLowerCase() };
                  if (row.kind === "mood") pick.mood = opt.value as Mood;
                  if (row.kind === "who") pick.who = opt.value as Who;
                  if (row.kind === "intention") pick.intention = opt.value as Intention;
                  if (row.kind === "pace") pick.pace = opt.value as Pace;
                  onPick(pick);
                }}
                className={`inline-flex items-center min-h-[36px] rounded-full border backdrop-blur px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.01em] transition-all duration-300 hover:-translate-y-px ${
                  isActive ? activeChip : baseChip
                }`}
                aria-pressed={isActive}
              >
                {opt.label}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
