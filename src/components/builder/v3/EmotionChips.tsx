import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { StudioDict } from "@/hooks/useStudioLocale";
import type { Intention, Mood, Pace, Who } from "@/components/builder/types";

/**
 * Phased emotion journey — one question at a time.
 *
 * Replaces the static wall of chips with a cinematic, four-chapter
 * progression: mood → who → intention → pace. Each pick advances after a
 * short pause (so the user feels the world responding), and a tiny dotted
 * progress bar shows where they are in the prologue.
 *
 * After all four phases are chosen, the component becomes a slim recap row
 * (no labels, just the active chips) so the composer + map can take over.
 */

export interface EmotionPick {
  mood?: Mood;
  who?: Who;
  intention?: Intention;
  pace?: Pace;
  seed: string;
}

type PhaseKind = "mood" | "who" | "intention" | "pace";
const PHASE_ORDER: PhaseKind[] = ["mood", "who", "intention", "pace"];

interface Props {
  t: StudioDict;
  tone?: "light" | "dark";
  active?: { mood?: Mood | null; who?: Who | null; intention?: Intention | null; pace?: Pace | null };
  onPick: (p: EmotionPick) => void;
}

export function EmotionChips({ t, tone = "light", active, onPick }: Props) {
  const isLight = tone === "light";
  const baseChip = isLight
    ? "bg-[color:var(--ivory)]/92 text-[color:var(--charcoal)] border-[color:var(--gold)]/40 hover:border-[color:var(--gold)]"
    : "bg-[color:var(--charcoal)]/85 text-[color:var(--ivory)] border-[color:var(--gold)]/40 hover:border-[color:var(--gold)]";
  const activeChip =
    "bg-[color:var(--gold)]/95 text-[color:var(--charcoal)] border-[color:var(--gold)]";
  const titleColor = isLight ? "text-[color:var(--ivory)]" : "text-[color:var(--charcoal)]";
  const hintColor = isLight ? "text-[color:var(--ivory)]/60" : "text-[color:var(--charcoal)]/55";
  const stepColor = isLight ? "text-[color:var(--gold)]" : "text-[color:var(--teal)]";

  // Compute first incomplete phase from props (so reload resumes correctly).
  const firstIncomplete = useMemo<PhaseKind | null>(() => {
    for (const p of PHASE_ORDER) {
      const v = active?.[p];
      if (v === null || v === undefined) return p;
    }
    return null;
  }, [active]);

  const [phase, setPhase] = useState<PhaseKind | null>(firstIncomplete);
  const [animKey, setAnimKey] = useState(0);

  // Re-sync when active changes externally (e.g. resume / reset).
  useEffect(() => {
    setPhase(firstIncomplete);
    setAnimKey((k) => k + 1);
  }, [firstIncomplete]);

  const phaseIndex = phase ? PHASE_ORDER.indexOf(phase) : PHASE_ORDER.length;

  const advance = () => {
    const next = PHASE_ORDER[phaseIndex + 1] ?? null;
    setPhase(next);
    setAnimKey((k) => k + 1);
  };

  const goBack = () => {
    const prev = PHASE_ORDER[Math.max(0, phaseIndex - 1)];
    setPhase(prev);
    setAnimKey((k) => k + 1);
  };

  const handlePick = (kind: PhaseKind, value: string, label: string) => {
    const pick: EmotionPick = { seed: label.toLowerCase() };
    if (kind === "mood") pick.mood = value as Mood;
    if (kind === "who") pick.who = value as Who;
    if (kind === "intention") pick.intention = value as Intention;
    if (kind === "pace") pick.pace = value as Pace;
    onPick(pick);
    // Cinematic pause so the choice "lands" before next chapter reveals.
    window.setTimeout(() => advance(), 380);
  };

  /* ── Completed state — slim recap, no titles ── */
  if (phase === null) {
    const recap: { kind: PhaseKind; label: string | null }[] = PHASE_ORDER.map((k) => {
      const v = active?.[k];
      if (!v) return { kind: k, label: null };
      const list =
        k === "mood"
          ? t.moodOptions
          : k === "who"
            ? t.whoOptions
            : k === "intention"
              ? t.intentionOptions
              : t.paceOptions;
      const opt = list.find((o) => o.value === v);
      return { kind: k, label: opt?.label ?? null };
    });

    return (
      <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-wrap justify-center gap-1.5">
          {recap
            .filter((r) => r.label)
            .map((r) => (
              <button
                key={r.kind}
                type="button"
                onClick={() => {
                  setPhase(r.kind);
                  setAnimKey((k) => k + 1);
                }}
                className={`inline-flex items-center min-h-[32px] rounded-full border backdrop-blur px-3 py-1 text-[11.5px] font-semibold tracking-[0.01em] transition-all duration-300 ${activeChip}`}
                aria-label={`${r.label} — tap to change`}
              >
                {r.label}
              </button>
            ))}
        </div>
      </div>
    );
  }

  /* ── Current phase options ── */
  const options =
    phase === "mood"
      ? t.moodOptions
      : phase === "who"
        ? t.whoOptions
        : phase === "intention"
          ? t.intentionOptions
          : t.paceOptions;
  const currentValue = active?.[phase] ?? null;
  const title = t.phaseTitles[phase];
  const hint = t.phaseHints[phase];
  const stepLine = t.phaseStepLabel
    .replace("{n}", String(phaseIndex + 1))
    .replace("{total}", String(PHASE_ORDER.length));

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mb-2.5">
        {PHASE_ORDER.map((p, i) => {
          const done = i < phaseIndex || Boolean(active?.[p]);
          const isCur = i === phaseIndex;
          return (
            <span
              key={p}
              className={`block rounded-full transition-all duration-500 ${
                isCur
                  ? "w-6 h-[3px] bg-[color:var(--gold)]"
                  : done
                    ? "w-2 h-[3px] bg-[color:var(--gold)]/70"
                    : "w-2 h-[3px] bg-[color:var(--ivory)]/25"
              }`}
            />
          );
        })}
      </div>

      {/* Phase frame */}
      <div
        key={animKey}
        className="animate-in fade-in slide-in-from-bottom-2 duration-[600ms] ease-out"
      >
        <p
          className={`text-center text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-1 ${stepColor}`}
        >
          {stepLine}
        </p>
        <h3
          className={`text-center text-[19px] sm:text-[21px] font-semibold leading-tight mb-1 ${titleColor}`}
          style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
        >
          {title}
        </h3>
        <p
          className={`text-center text-[12px] italic mb-3 ${hintColor}`}
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {hint}
        </p>

        <div className="flex flex-wrap justify-center gap-1.5">
          {options.map((opt) => {
            const isActive = currentValue === opt.value;
            return (
              <button
                key={`${phase}-${opt.value}`}
                type="button"
                onClick={() => handlePick(phase, opt.value, opt.label)}
                className={`inline-flex items-center min-h-[40px] rounded-full border backdrop-blur px-4 py-1.5 text-[13px] font-semibold tracking-[0.01em] transition-all duration-300 hover:-translate-y-px ${
                  isActive ? activeChip : baseChip
                }`}
                aria-pressed={isActive}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Phase nav */}
        <div className="flex items-center justify-center gap-4 mt-2.5">
          {phaseIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className={`inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.22em] font-semibold ${hintColor} hover:opacity-100 opacity-70 transition-opacity`}
            >
              <ChevronLeft size={11} />
              {t.phaseBack}
            </button>
          )}
          <button
            type="button"
            onClick={advance}
            className={`text-[10.5px] uppercase tracking-[0.22em] font-semibold ${hintColor} hover:opacity-100 opacity-60 transition-opacity`}
          >
            {t.phaseSkip}
          </button>
        </div>
      </div>
    </div>
  );
}
