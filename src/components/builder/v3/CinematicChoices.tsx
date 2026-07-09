import { useEffect, useMemo, useState } from "react";
import type { StudioDict } from "@/hooks/useStudioLocale";
import type { Intention, JourneyType, Mood, Pace, Who } from "@/components/builder/types";

/**
 * CinematicChoices — emotional scene selection (no quiz, no filters).
 *
 * Every phase is a cinematic composition the traveller steps INTO, not a
 * category they pick. Composition deliberately varies per phase to avoid
 * the onboarding-form rhythm:
 *
 *   • mood       → three full-bleed vertical scenes (entry pull)
 *   • depth      → two stacked editorial panels (single vs durational)
 *   • who        → asymmetric editorial grid (one tall + three small)
 *   • intention  → three full-bleed vertical scenes with poetic labels
 *
 * No step indicators, no eyebrow chips, no Sparkles icons, no hint text.
 * The framing question is in serif italic; option labels are in serif italic
 * placed bottom-left like an editorial caption — the scene IS the choice.
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

interface PhaseOption {
  value: string;
  label: string;
}

/** Shared bottom-left editorial caption — the scene IS the choice. */
function SceneCaption({ label, size = "md" }: { label: string; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "text-[21px] sm:text-[26px] leading-[1.18] max-w-[18ch]"
      : size === "sm"
        ? "text-[15px] sm:text-[17px] leading-[1.2] max-w-[16ch]"
        : "text-[18px] sm:text-[22px] leading-[1.2] max-w-[18ch]";
  return (
    <span className="absolute inset-x-0 bottom-0 z-10 px-4 sm:px-6 pb-4 sm:pb-5 text-left pointer-events-none">
      <span
        className={`block font-serif italic text-[color:var(--ivory)] drop-shadow-[0_2px_14px_rgba(0,0,0,0.75)] ${cls}`}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {label}
      </span>
    </span>
  );
}

/** Cinematic scene tile — full-bleed video, no chrome, no icon. */
function SceneTile({
  phase,
  option,
  isActive,
  onPick,
  captionSize = "md",
  delayMs = 0,
}: {
  phase: PhaseKind;
  option: PhaseOption;
  isActive: boolean;
  onPick: () => void;
  captionSize?: "sm" | "md" | "lg";
  delayMs?: number;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`group relative h-full w-full overflow-hidden rounded-[4px] border transition-all duration-[520ms] ease-out animate-in fade-in zoom-in-[0.985] active:scale-[0.992] ${
        isActive
          ? "border-[color:var(--gold)]/85 shadow-[0_0_0_1px_oklch(0.78_0.12_85_/_0.45),0_22px_50px_rgba(0,0,0,0.5)]"
          : "border-[color:var(--ivory)]/10 shadow-[0_16px_38px_rgba(0,0,0,0.45)] hover:border-[color:var(--ivory)]/30"
      }`}
      style={{
        animationDelay: `${delayMs}ms`,
        animationFillMode: "both",
        animationDuration: "1100ms",
      }}
      aria-pressed={isActive}
      aria-label={option.label}
    >
      <video
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.025] motion-reduce:transition-none"
        style={{ filter: "saturate(0.82) contrast(1.03) brightness(0.7)" }}
      >
        <source src={clipFor(phase, option.value)} type="video/mp4" />
      </video>
      {/* Editorial bottom-up gradient — text breathes against it */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.15 0.02 240 / 0.05) 0%, oklch(0.15 0.02 240 / 0.05) 42%, oklch(0.15 0.02 240 / 0.78) 100%)",
        }}
      />
      <SceneCaption label={option.label} size={captionSize} />
    </button>
  );
}

export function CinematicChoices({ t, active, motionMs = 620, onPick, onComplete }: Props) {
  const valueFor = (p: PhaseKind) =>
    p === "depth" ? active.journeyType : (active as Record<string, unknown>)[p];
  const firstIncomplete = useMemo<PhaseKind | null>(() => {
    for (const p of PHASE_ORDER) if (!valueFor(p)) return p;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Each phase trims options to match its composition.
  const options: PhaseOption[] =
    phase === "mood"
      ? t.openingScenes // 3 already-poetic scenes
      : phase === "depth"
        ? t.journeyTypeOptions // 2
        : phase === "who"
          ? t.whoOptions.slice(0, 4) // 4
          : t.intentionOptions.slice(0, 3); // 3 — calmer than 6

  const framing = t.phaseTitles[phase] ?? "";

  const handlePick = (option: PhaseOption) => {
    if (transitioning) return;
    setTransitioning(true);
    const pick: ChoicesPick = { seed: option.label.toLowerCase() };
    if (phase === "mood") pick.mood = option.value as Mood;
    if (phase === "depth") pick.journeyType = option.value as JourneyType;
    if (phase === "who") pick.who = option.value as Who;
    if (phase === "intention") pick.intention = option.value as Intention;
    onPick(pick);
    window.setTimeout(() => setTransitioning(false), motionMs);
  };

  const isActiveFor = (option: PhaseOption) =>
    phase === "mood"
      ? active.mood === option.value
      : phase === "depth"
        ? active.journeyType === option.value
        : phase === "who"
          ? active.who === option.value
          : active.intention === option.value;

  // ── Asymmetric editorial grid (who) — 1 tall left + 3 stacked right ──
  // Avoids the 2×2 grid rhythm; first option is the protagonist.
  const renderAsymmetric = () => {
    const [hero, ...rest] = options;
    return (
      <div className="relative z-10 flex-1 grid grid-cols-5 grid-rows-3 gap-2 px-2 pb-3 min-h-0">
        <div className="col-span-3 row-span-3 min-h-0">
          <SceneTile
            phase={phase}
            option={hero}
            isActive={isActiveFor(hero)}
            onPick={() => handlePick(hero)}
            captionSize="lg"
            delayMs={240}
          />
        </div>
        {rest.map((opt, i) => (
          <div key={`${phase}-${opt.value}`} className="col-span-2 row-span-1 min-h-0">
            <SceneTile
              phase={phase}
              option={opt}
              isActive={isActiveFor(opt)}
              onPick={() => handlePick(opt)}
              captionSize="sm"
              delayMs={360 + i * 160}
            />
          </div>
        ))}
      </div>
    );
  };

  // ── Vertical full-bleed stack (mood, depth, intention) ──
  const renderVerticalStack = () => (
    <ul className="relative z-10 flex-1 flex flex-col gap-2 px-2 pb-3 min-h-0" role="list">
      {options.map((opt, i) => (
        <li key={`${phase}-${opt.value}`} className="min-h-0 flex-1">
          <SceneTile
            phase={phase}
            option={opt}
            isActive={isActiveFor(opt)}
            onPick={() => handlePick(opt)}
            captionSize={options.length <= 2 ? "lg" : "md"}
            delayMs={280 + i * 220}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      key={phase}
      className={`absolute inset-0 z-40 flex flex-col bg-[color:var(--charcoal)] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        transitioning ? "opacity-0 scale-[0.99]" : "opacity-100 scale-100"
      }`}
      style={{ transition: `opacity ${motionMs}ms, transform ${motionMs}ms` }}
    >
      {/* Single framing question — serif italic, no eyebrow, no chip, no step indicator */}
      {framing && (
        <div className="relative z-10 px-8 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3 text-center pointer-events-none">
          <h2
            className="font-serif italic text-[20px] sm:text-[26px] leading-[1.22] text-[color:var(--ivory)] max-w-[24ch] mx-auto drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] animate-in fade-in slide-in-from-top-1 duration-[900ms]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {framing}
          </h2>
        </div>
      )}

      {phase === "who" ? renderAsymmetric() : renderVerticalStack()}
    </div>
  );
}
