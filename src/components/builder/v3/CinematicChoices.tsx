import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { StudioDict } from "@/hooks/useStudioLocale";
import type { Intention, JourneyType, Mood, Pace, Who } from "@/components/builder/types";

/**
 * CinematicChoices — full-screen, cinematic, sequential emotion selection.
 *
 * Phase order: mood → depth (single day | multi-day) → who → intention.
 *
 * When depth = "multi", the parent diverts to the white-glove concierge
 * scene (MultiDayConcierge) instead of continuing the day-builder flow.
 */

type PhaseKind = "mood" | "depth" | "who" | "intention";
const PHASE_ORDER: PhaseKind[] = ["mood", "depth", "who", "intention"];

const CLIP = {
  coast: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
  table: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
  viewpoint: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
  caboRoca: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
  hiddenCove: "/__l5e/assets-v1/6e836749-2d77-463c-838c-72735c80e770/scene-hidden-cove.mp4",
  celebration: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
  localTable: "/__l5e/assets-v1/9db73543-09c3-4d53-93bd-4abbb15a4b00/scene-local-table.mp4",
  hiddenStreet: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
  route: "/__l5e/assets-v1/501885a8-7399-4591-99fc-1c410b24c428/scene-route-portugal.mp4",
  sesimbra: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
} as const;

const MOOD_CLIPS: Record<Mood, string> = {
  romantic: CLIP.hiddenCove,
  slow: CLIP.coast,
  curious: CLIP.hiddenStreet,
  energetic: CLIP.celebration,
  open: CLIP.viewpoint,
};
const DEPTH_CLIPS: Record<JourneyType, string> = {
  day: CLIP.viewpoint,
  multi: CLIP.route,
};
const WHO_CLIPS: Record<Who, string> = {
  couple: CLIP.hiddenCove,
  family: CLIP.localTable,
  friends: CLIP.celebration,
  solo: CLIP.caboRoca,
  corporate: CLIP.route,
  group: CLIP.celebration,
};
const INTENTION_CLIPS: Record<Intention, string> = {
  wine: CLIP.table,
  gastronomy: CLIP.localTable,
  coast: CLIP.coast,
  nature: CLIP.viewpoint,
  heritage: CLIP.sesimbra,
  hidden: CLIP.hiddenStreet,
  wonder: CLIP.caboRoca,
  wellness: CLIP.hiddenCove,
};

function clipFor(kind: PhaseKind, value: string): string {
  if (kind === "mood") return MOOD_CLIPS[value as Mood] ?? CLIP.coast;
  if (kind === "depth") return DEPTH_CLIPS[value as JourneyType] ?? CLIP.viewpoint;
  if (kind === "who") return WHO_CLIPS[value as Who] ?? CLIP.localTable;
  return INTENTION_CLIPS[value as Intention] ?? CLIP.table;
}

export interface ChoicesPick {
  mood?: Mood;
  journeyType?: JourneyType;
  who?: Who;
  intention?: Intention;
  pace?: Pace;
  seed: string;
}

interface Props {
  t: StudioDict;
  active: {
    mood: Mood | null;
    journeyType: JourneyType | null;
    who: Who | null;
    intention: Intention | null;
  };
  /** Affinity-derived ms duration for the fade/scale transition (480–720). */
  motionMs?: number;
  onPick: (p: ChoicesPick) => void;
  onComplete: () => void;
}

export function CinematicChoices({ t, active, motionMs = 620, onPick, onComplete }: Props) {
  const valueFor = (p: PhaseKind) =>
    p === "depth" ? active.journeyType : (active as Record<string, unknown>)[p];
  const firstIncomplete = useMemo<PhaseKind | null>(() => {
    for (const p of PHASE_ORDER) if (!valueFor(p)) return p;
    return null;
  }, [active]);

  const [phase, setPhase] = useState<PhaseKind | null>(firstIncomplete);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    setPhase(firstIncomplete);
  }, [firstIncomplete]);

  useEffect(() => {
    if (phase === null) onComplete();
  }, [phase, onComplete]);

  if (phase === null) return null;

  // Intention is trimmed to 3 for decision-fatigue reduction.
  const options =
    phase === "mood"
      ? t.moodOptions.slice(0, 4)
      : phase === "depth"
        ? t.journeyTypeOptions
        : phase === "who"
          ? t.whoOptions.slice(0, 4)
          : t.intentionOptions.slice(0, 3);
  const title = t.phaseTitles[phase];
  const hint = t.phaseHints[phase];
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const stepLine = t.phaseStepLabel
    .replace("{n}", String(phaseIndex + 1))
    .replace("{total}", String(PHASE_ORDER.length));

  const isDepth = phase === "depth";

  const handlePick = (value: string, label: string) => {
    if (transitioning) return;
    setTransitioning(true);
    const pick: ChoicesPick = { seed: label.toLowerCase() };
    if (phase === "mood") pick.mood = value as Mood;
    if (phase === "depth") pick.journeyType = value as JourneyType;
    if (phase === "who") pick.who = value as Who;
    if (phase === "intention") pick.intention = value as Intention;
    onPick(pick);
    window.setTimeout(() => setTransitioning(false), motionMs);
  };

  // ── BEAT 2 — OPENING EMOTIONAL PULL ───────────────────────────────────
  // First phase ("mood") gets a dedicated cinematic layout: 3 full-bleed
  // vertical scenes, one editorial framing question, no step indicators,
  // no eyebrow, no icons. Each scene IS the choice — entering one feels
  // like stepping into the day, not picking a category.
  if (phase === "mood") {
    return (
      <div
        key={phase}
        className={`absolute inset-0 z-40 flex flex-col bg-[color:var(--charcoal)] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          transitioning ? "opacity-0 scale-[0.99]" : "opacity-100 scale-100"
        }`}
        style={{ transition: `opacity ${motionMs}ms, transform ${motionMs}ms` }}
      >
        {/* Single framing question — serif italic, no eyebrow, no chip */}
        <div className="relative z-10 px-8 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3 text-center pointer-events-none">
          <h2
            className="font-serif italic text-[22px] sm:text-[28px] leading-[1.22] text-[color:var(--ivory)] max-w-[24ch] mx-auto drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] animate-in fade-in slide-in-from-top-1 duration-[900ms]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {t.openingPrompt}
          </h2>
        </div>

        {/* 3 full-bleed scenes stacked vertically — each one a doorway */}
        <ul className="relative z-10 flex-1 flex flex-col gap-2 px-2 pb-3 min-h-0" role="list">
          {t.openingScenes.map((opt, i) => {
            const isActive = active.mood === opt.value;
            return (
              <li key={`mood-${opt.value}`} className="min-h-0 flex-1">
                <button
                  type="button"
                  onClick={() => handlePick(opt.value, opt.label)}
                  className={`group relative h-full w-full overflow-hidden rounded-[4px] border transition-all duration-[520ms] ease-out animate-in fade-in zoom-in-[0.99] active:scale-[0.992] ${
                    isActive
                      ? "border-[color:var(--gold)]/85 shadow-[0_0_0_1px_oklch(0.78_0.12_85_/_0.45),0_22px_50px_rgba(0,0,0,0.5)]"
                      : "border-[color:var(--ivory)]/10 shadow-[0_16px_38px_rgba(0,0,0,0.45)] hover:border-[color:var(--ivory)]/30"
                  }`}
                  style={{ animationDelay: `${280 + i * 220}ms`, animationFillMode: "both", animationDuration: "1100ms" }}
                  aria-pressed={isActive}
                  aria-label={opt.label}
                >
                  <video
                    aria-hidden="true"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.025]"
                    style={{ filter: "saturate(0.82) contrast(1.03) brightness(0.7)" }}
                  >
                    <source src={clipFor("mood", opt.value)} type="video/mp4" />
                  </video>
                  {/* Editorial bottom-left gradient — text breathes against it */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, oklch(0.15 0.02 240 / 0.05) 0%, oklch(0.15 0.02 240 / 0.05) 45%, oklch(0.15 0.02 240 / 0.72) 100%)",
                    }}
                  />
                  <span className="absolute inset-x-0 bottom-0 z-10 px-5 sm:px-7 pb-5 sm:pb-6 text-left">
                    <span
                      className="block font-serif italic text-[20px] sm:text-[24px] leading-[1.18] text-[color:var(--ivory)] drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] max-w-[18ch]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {opt.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── Phases 2+ (depth, who, intention) — quieter grid, restrained chrome ──
  return (
    <div
      key={phase}
      className={`absolute inset-0 z-40 flex flex-col bg-[color:var(--charcoal)] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        transitioning ? "opacity-0 scale-[0.985]" : "opacity-100 scale-100"
      }`}
      style={{ transition: `opacity ${motionMs}ms, transform ${motionMs}ms` }}
    >
      <header className="relative z-10 px-5 pt-5 pb-2 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-[600ms]">
        <span className="text-[9.5px] uppercase tracking-[0.34em] font-medium text-[color:var(--ivory)]/55">
          {stepLine}
        </span>
        <div className="flex items-center gap-1.5">
          {PHASE_ORDER.map((p, i) => {
            const done = i < phaseIndex || Boolean(valueFor(p));
            const isCur = i === phaseIndex;
            return (
              <span
                key={p}
                className={`block rounded-full transition-all duration-500 ${
                  isCur
                    ? "w-6 h-[2px] bg-[color:var(--gold)]"
                    : done
                      ? "w-2.5 h-[2px] bg-[color:var(--gold)]/60"
                      : "w-2.5 h-[2px] bg-[color:var(--ivory)]/18"
                }`}
              />
            );
          })}
        </div>
      </header>

      <div className="relative z-10 px-6 pt-4 pb-3 text-center animate-in fade-in slide-in-from-bottom-2 duration-[700ms]">
        <h2
          className="text-[24px] sm:text-[30px] font-semibold leading-[1.1] text-[color:var(--ivory)]"
          style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
        >
          {title}
        </h2>
        <p
          className="mt-2 text-[13px] italic text-[color:var(--ivory)]/60"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {hint}
        </p>
      </div>

      <div className="relative z-10 flex-1 px-4 pb-6 pt-2 min-h-0">
        <ul
          className={`grid gap-3 h-full ${isDepth ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-2"}`}
          role="list"
        >
          {options.map((opt, i) => {
            const isActive =
              phase === "depth"
                ? active.journeyType === opt.value
                : phase === "who"
                  ? active.who === opt.value
                  : active.intention === opt.value;
            return (
              <li key={`${phase}-${opt.value}`} className="min-h-0">
                <button
                  type="button"
                  onClick={() => handlePick(opt.value, opt.label)}
                  className={`group relative h-full w-full overflow-hidden rounded-[6px] border transition-all duration-[420ms] ease-out animate-in fade-in zoom-in-95 active:scale-[0.985] ${
                    isActive
                      ? "border-[color:var(--gold)] shadow-[0_0_0_2px_oklch(0.78_0.12_85_/_0.4),0_18px_42px_rgba(0,0,0,0.5)]"
                      : "border-[color:var(--ivory)]/15 shadow-[0_14px_34px_rgba(0,0,0,0.42)] hover:border-[color:var(--gold)]/70"
                  }`}
                  style={{ animationDelay: `${120 + i * 90}ms`, animationFillMode: "both" }}
                  aria-pressed={isActive}
                  aria-label={opt.label}
                >
                  <video
                    aria-hidden="true"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04] group-active:scale-[1.02]"
                    style={{ filter: "saturate(0.82) contrast(1.04) brightness(0.74)" }}
                  >
                    <source src={clipFor(phase, opt.value)} type="video/mp4" />
                  </video>
                  <span className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal)]/80 via-[color:var(--charcoal)]/25 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 flex items-end justify-between gap-2">
                    <span
                      className={`font-semibold leading-tight text-[color:var(--ivory)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] ${
                        isDepth ? "text-[17px] sm:text-[19px]" : "text-[15px] sm:text-[17px]"
                      }`}
                      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
                    >
                      {opt.label}
                    </span>
                    <Sparkles
                      size={14}
                      className={`shrink-0 transition-all ${
                        isActive
                          ? "text-[color:var(--gold)] opacity-100 scale-110"
                          : "text-[color:var(--gold)] opacity-60 group-hover:opacity-100 group-hover:scale-110"
                      }`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
