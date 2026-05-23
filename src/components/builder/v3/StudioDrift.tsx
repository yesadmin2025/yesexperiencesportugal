import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { composeDay, pickRegion, type ComposerProfile } from "@/lib/drift/composer";
import { recordDriftEvent } from "@/lib/drift/telemetry";
import { revealJourney } from "@/server/driftEngine.functions";
import {
  bump,
  topValue,
  type ConfidenceMap,
  type DriftDimension,
  EXPLICIT,
  SOFT,
} from "@/lib/drift/inference";

/**
 * StudioDrift — an emotionally intelligent discovery engine for real
 * YES Experiences journeys.
 *
 * Drift is a guided narrative that quietly gathers the practical signals
 * a real itinerary needs — name, pickup region, group size, travel
 * radius, energy, intensity, social register — and converges onto real
 * tours from the YES catalog. The story is never decorative: every
 * answer feeds match logic against `signatureTours`.
 *
 * Architecture
 * ────────────
 *   · DRIFT     — passive atmospheric moment (whisper, no demand)
 *   · TEXT      — single whispered question with one input (name)
 *   · CHOICE    — 2–3 scene tiles with soft hints; tap = imprint + advance
 *   · CONVERGE  — matched signature tours, presented as editorial cards
 *                 with a real link to the tour page
 *
 * Mobile-first (393px). Lowercase italic microcopy. No form chrome.
 */

// ─────────────────────────────────────────────────────────────────────────
// Profile + sensory vocabulary
// ─────────────────────────────────────────────────────────────────────────

type Motif =
  | "amber"
  | "salt"
  | "stone"
  | "candle"
  | "rain"
  | "vine"
  | "harbour"
  | "linen"
  | "fado"
  | "basil"
  | "bread";

type Companions = "solo" | "couple" | "family" | "group";
type PickupRegion = "lisbon" | "centro" | "alentejo";
type Radius = "near" | "far" | "anywhere";
type Energy = "slow" | "vivid";
type Style = "coast" | "heritage" | "wine" | "table";
type Social = "intimate" | "shared";

export interface DriftProfile {
  name?: string;
  companions?: Companions;
  pickup?: PickupRegion;
  radius?: Radius;
  energy?: Energy;
  style?: Style;
  social?: Social;
}

type Scene = {
  id: string;
  video: string;
  motifs: Motif[];
};

const SCENES: Record<string, Scene> = {
  arrabidaCoast: {
    id: "arrabida-coast",
    video: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    motifs: ["salt", "linen", "vine"],
  },
  caboRoca: {
    id: "cabo-roca",
    video: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    motifs: ["salt", "stone"],
  },
  hiddenStreet: {
    id: "hidden-street",
    video: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    motifs: ["rain", "stone", "basil"],
  },
  viewpoint: {
    id: "viewpoint",
    video: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    motifs: ["vine", "fado", "amber"],
  },
  candleTable: {
    id: "candle-table",
    video: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    motifs: ["candle", "amber", "bread"],
  },
  celebration: {
    id: "celebration",
    video: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
    motifs: ["candle", "amber", "fado", "linen"],
  },
  sesimbra: {
    id: "sesimbra",
    video: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    motifs: ["harbour", "salt", "rain"],
  },
};

const MOTIF_TINT: Record<Motif, string> = {
  amber:   "radial-gradient(ellipse at 50% 78%, color-mix(in oklab, var(--gold) 22%, transparent) 0%, transparent 62%)",
  candle:  "radial-gradient(ellipse at 50% 82%, color-mix(in oklab, var(--gold-soft, var(--gold)) 26%, transparent) 0%, transparent 58%)",
  salt:    "radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--ivory) 14%, transparent) 0%, transparent 65%)",
  linen:   "radial-gradient(ellipse at 50% 70%, color-mix(in oklab, var(--ivory) 10%, transparent) 0%, transparent 60%)",
  stone:   "radial-gradient(ellipse at 30% 60%, color-mix(in oklab, var(--teal) 14%, transparent) 0%, transparent 65%)",
  rain:    "radial-gradient(ellipse at 60% 45%, color-mix(in oklab, var(--teal-2, var(--teal)) 16%, transparent) 0%, transparent 65%)",
  vine:    "radial-gradient(ellipse at 50% 80%, color-mix(in oklab, var(--gold) 18%, transparent) 0%, transparent 58%)",
  harbour: "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--teal) 18%, transparent) 0%, transparent 65%)",
  fado:    "radial-gradient(ellipse at 40% 60%, color-mix(in oklab, var(--gold-soft, var(--gold)) 12%, transparent) 0%, transparent 65%)",
  basil:   "radial-gradient(ellipse at 70% 55%, color-mix(in oklab, var(--ivory) 9%, transparent) 0%, transparent 60%)",
  bread:   "radial-gradient(ellipse at 50% 75%, color-mix(in oklab, var(--gold) 12%, transparent) 0%, transparent 58%)",
};

// Tour matching is now handled by `src/lib/drift/composer.ts`, which assembles
// a personalized day from the regional stops pool under operational rules
// (category caps, opening hours, drive-time budgets). The old tour-level
// regex matchers below were retired with that shift.

// ─── Motif → dimension nudges (predictive inference) ──────────────────────
// Soft signals: lingering on a scene with these motifs nudges the matching
// dimension's confidence up without ever fully claiming it. Explicit picks
// always win (EXPLICIT = 1.0); these only contribute < 0.4.
const MOTIF_NUDGE: Partial<Record<Motif, Array<[DriftDimension, string]>>> = {
  salt: [["style", "coast"], ["energy", "vivid"]],
  linen: [["style", "coast"], ["social", "intimate"]],
  harbour: [["style", "coast"], ["energy", "vivid"]],
  stone: [["style", "heritage"], ["energy", "slow"]],
  basil: [["style", "heritage"]],
  rain: [["style", "heritage"], ["energy", "slow"]],
  vine: [["style", "wine"], ["energy", "slow"]],
  fado: [["style", "wine"], ["social", "shared"]],
  candle: [["style", "table"], ["social", "intimate"]],
  amber: [["social", "intimate"], ["energy", "slow"]],
  bread: [["style", "table"]],
};

// ─── Chapter graph ────────────────────────────────────────────────────────

type ChapterKind = "drift" | "text" | "choice" | "convergence";

interface DriftChapter {
  kind: "drift";
  id: string;
  /** Function so we can weave the traveller name in once we know it. */
  whisper: (p: DriftProfile) => string;
  scenes: Scene[];
  holdMs: number;
}

interface TextChapter {
  kind: "text";
  id: string;
  scene: Scene;
  whisper: (p: DriftProfile) => string;
  placeholder: string;
  /** Where to write the answer on the profile. */
  field: "name";
}

interface ChoiceOption {
  scene: Scene;
  hint: string;
  imprint: Partial<DriftProfile>;
  reinforce: Motif[];
}

interface ChoiceChapter {
  kind: "choice";
  id: string;
  /** Dimension this chapter is intended to resolve — used by the dynamic
   *  router to skip the chapter if confidence on that dimension is already
   *  high enough from prior soft signals. */
  dim?: DriftDimension;
  whisper: (p: DriftProfile) => string;
  options: ChoiceOption[];
}

interface ConvergenceChapter {
  kind: "convergence";
  id: string;
}

type Chapter = DriftChapter | TextChapter | ChoiceChapter | ConvergenceChapter;

const greet = (p: DriftProfile, fallback: string) =>
  p.name ? `${fallback.replace(/^./, (c) => c.toLowerCase())}, ${p.name.toLowerCase()}` : fallback;

const CHAPTERS: Chapter[] = [
  {
    kind: "drift",
    id: "opening",
    whisper: () => "portugal já está acordada. respira primeiro.",
    scenes: [SCENES.arrabidaCoast, SCENES.hiddenStreet],
    holdMs: 7000,
  },
  {
    kind: "text",
    id: "name",
    scene: SCENES.viewpoint,
    whisper: () => "como te devemos chamar",
    placeholder: "o teu primeiro nome",
    field: "name",
  },
  {
    kind: "drift",
    id: "settling",
    whisper: (p) =>
      p.name
        ? `${p.name.toLowerCase()}, portugal está a reparar em ti.`
        : "portugal está a reparar em ti",
    scenes: [SCENES.viewpoint],
    holdMs: 5400,
  },
  {
    kind: "choice",
    id: "companions",
    whisper: () => "quem vem contigo",
    options: [
      {
        scene: SCENES.caboRoca,
        hint: "só, com o vento",
        imprint: { companions: "solo" },
        reinforce: ["stone", "salt"],
      },
      {
        scene: SCENES.candleTable,
        hint: "à mesa, a dois",
        imprint: { companions: "couple" },
        reinforce: ["candle", "amber"],
      },
      {
        scene: SCENES.celebration,
        hint: "entre os teus",
        imprint: { companions: "group" },
        reinforce: ["fado", "linen"],
      },
    ],
  },
  {
    kind: "choice",
    id: "pickup",
    whisper: () => "onde começa esta história",
    options: [
      {
        scene: SCENES.arrabidaCoast,
        hint: "lisboa e a costa a sul",
        imprint: { pickup: "lisbon" },
        reinforce: ["salt", "linen"],
      },
      {
        scene: SCENES.hiddenStreet,
        hint: "o centro, mais a norte",
        imprint: { pickup: "centro" },
        reinforce: ["stone", "basil"],
      },
      {
        scene: SCENES.viewpoint,
        hint: "alentejo, devagar",
        imprint: { pickup: "alentejo" },
        reinforce: ["vine", "amber"],
      },
    ],
  },
  {
    kind: "choice",
    id: "radius",
    whisper: () => "até onde irias seguir esse instinto",
    options: [
      {
        scene: SCENES.candleTable,
        hint: "perto, com calma",
        imprint: { radius: "near" },
        reinforce: ["candle", "bread"],
      },
      {
        scene: SCENES.viewpoint,
        hint: "um dia inteiro fora",
        imprint: { radius: "far" },
        reinforce: ["vine", "amber"],
      },
      {
        scene: SCENES.caboRoca,
        hint: "até onde for preciso",
        imprint: { radius: "anywhere" },
        reinforce: ["stone", "salt"],
      },
    ],
  },
  {
    kind: "choice",
    id: "energy",
    whisper: () => "que ritmo te assenta hoje",
    options: [
      {
        scene: SCENES.viewpoint,
        hint: "devagar, com vista",
        imprint: { energy: "slow" },
        reinforce: ["vine", "amber"],
      },
      {
        scene: SCENES.sesimbra,
        hint: "vivo, com mãos",
        imprint: { energy: "vivid" },
        reinforce: ["harbour", "salt"],
      },
    ],
  },
  {
    kind: "choice",
    id: "style",
    whisper: () => "o que te puxa primeiro",
    options: [
      {
        scene: SCENES.arrabidaCoast,
        hint: "a costa",
        imprint: { style: "coast" },
        reinforce: ["salt", "linen"],
      },
      {
        scene: SCENES.hiddenStreet,
        hint: "as pedras antigas",
        imprint: { style: "heritage" },
        reinforce: ["stone", "basil"],
      },
      {
        scene: SCENES.viewpoint,
        hint: "a vinha",
        imprint: { style: "wine" },
        reinforce: ["vine", "fado"],
      },
    ],
  },
  {
    kind: "choice",
    id: "social",
    whisper: () => "e quando a noite chega",
    options: [
      {
        scene: SCENES.candleTable,
        hint: "uma mesa só vossa",
        imprint: { social: "intimate" },
        reinforce: ["candle", "amber", "bread"],
      },
      {
        scene: SCENES.celebration,
        hint: "vidro a tocar vidro",
        imprint: { social: "shared" },
        reinforce: ["fado", "linen", "amber"],
      },
    ],
  },
  { kind: "convergence", id: "convergence" },
];

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  onExit?: () => void;
}

export function StudioDrift({ onExit }: Props) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [profile, setProfile] = useState<DriftProfile>({});
  const [audioOn, setAudioOn] = useState(false);
  const gravityRef = useRef<Map<Motif, number>>(new Map());
  const confidenceRef = useRef<ConfidenceMap>({});
  const [, setTick] = useState(0);

  const chapter = CHAPTERS[chapterIdx];

  /** Soft reinforce: motifs nudge gravity (audio + tint) AND inferred
   *  confidence on the dimensions they correlate with. */
  const reinforce = useCallback((motifs: Motif[], amount: number) => {
    const g = gravityRef.current;
    let conf = confidenceRef.current;
    for (const m of motifs) {
      g.set(m, Math.min(8, (g.get(m) ?? 0) + amount));
      for (const [dim, val] of MOTIF_NUDGE[m] ?? []) {
        conf = bump(conf, dim, val, SOFT * amount * 0.45);
      }
    }
    confidenceRef.current = conf;
    setTick((t) => t + 1);
  }, []);

  // Telemetry: session_start once on mount.
  useEffect(() => {
    void recordDriftEvent("session_start", { chapterId: CHAPTERS[0]?.id });
  }, []);

  // Telemetry: scene_shown whenever the chapter changes.
  useEffect(() => {
    if (!chapter) return;
    void recordDriftEvent("scene_shown", {
      chapterId: chapter.id,
      meta: { kind: chapter.kind, index: chapterIdx },
    });
  }, [chapter, chapterIdx]);

  /** Dynamic router: walk forward past any ChoiceChapter whose target
   *  dimension is already confidently inferred (top ≥ 0.85). Keeps drift
   *  + text + convergence chapters intact — only the "ask" steps are
   *  skipped when the system has already learned the answer. */
  const advance = useCallback(() => {
    setChapterIdx((i) => {
      let next = i + 1;
      const conf = confidenceRef.current;
      while (next < CHAPTERS.length - 1) {
        const c = CHAPTERS[next];
        if (c.kind !== "choice") break;
        const dim = (c.dim ?? (c.id as DriftDimension));
        const top = topValue(conf, dim);
        // Only skip dimensions the inference engine actually owns.
        const owned: DriftDimension[] = [
          "companions", "pickup", "radius", "energy", "style", "social",
        ];
        if (!owned.includes(dim)) break;
        if (!top || top.confidence < 0.85) break;
        // Skipped — synthesize an inferred answer onto the profile.
        setProfile((p) => ({ ...p, [dim]: top.value as never }));
        void recordDriftEvent("signal_captured", {
          chapterId: c.id,
          signalKey: dim,
          signalValue: top.value,
          meta: { inferred: true, confidence: Number(top.confidence.toFixed(2)) },
        });
        next += 1;
      }
      return Math.min(next, CHAPTERS.length - 1);
    });
  }, []);

  const onPick = useCallback(
    (opt: ChoiceOption) => {
      if (!audioOn) setAudioOn(true);
      setProfile((p) => ({ ...p, ...opt.imprint }));
      reinforce(opt.reinforce, 1.4);
      // Explicit imprint → full confidence on those dimensions.
      let conf = confidenceRef.current;
      for (const [k, v] of Object.entries(opt.imprint)) {
        if (v === undefined) continue;
        conf = bump(conf, k as DriftDimension, String(v), EXPLICIT);
        void recordDriftEvent("signal_captured", {
          chapterId: chapter.id,
          signalKey: k,
          signalValue: String(v),
        });
      }
      confidenceRef.current = conf;
      void recordDriftEvent("scene_answered", {
        chapterId: chapter.id,
        meta: { sceneId: opt.scene.id },
      });
      window.setTimeout(advance, 850);
    },
    [audioOn, reinforce, advance, chapter],
  );

  const onNameSubmit = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 32);
      if (clean) {
        setProfile((p) => ({ ...p, name: clean }));
        void recordDriftEvent("signal_captured", {
          chapterId: chapter.id,
          signalKey: "name",
          signalValue: clean.slice(0, 32),
        });
      }
      void recordDriftEvent("scene_answered", { chapterId: chapter.id });
      if (!audioOn) setAudioOn(true);
      window.setTimeout(advance, 700);
    },
    [audioOn, advance, chapter],
  );

  const memoryTints = useMemo(() => {
    const g = gravityRef.current;
    return [...g.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([m, w]) => ({
        bg: MOTIF_TINT[m],
        opacity: Math.min(0.7, 0.2 + w * 0.12),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdx, gravityRef.current.size]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      style={{ touchAction: "manipulation" }}
    >
      {chapter.kind === "drift" && (
        <DriftPhase
          key={chapter.id}
          chapter={chapter}
          profile={profile}
          onDone={advance}
          onLinger={(motifs) => reinforce(motifs, 0.6)}
          onAudio={() => !audioOn && setAudioOn(true)}
        />
      )}

      {chapter.kind === "text" && (
        <TextPhase
          key={chapter.id}
          chapter={chapter}
          profile={profile}
          onSubmit={onNameSubmit}
          onSkip={advance}
        />
      )}

      {chapter.kind === "choice" && (
        <ChoicePhase key={chapter.id} chapter={chapter} profile={profile} onPick={onPick} />
      )}

      {chapter.kind === "convergence" && (
        <ConvergencePhase profile={profile} confidence={confidenceRef.current} onExit={onExit} />
      )}

      {memoryTints.map((t, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-[2400ms] ease-out"
          style={{ background: t.bg, opacity: t.opacity, mixBlendMode: "soft-light" }}
        />
      ))}

      <Meridian index={chapterIdx} total={CHAPTERS.length} />
      <ChapterFade chapterId={chapter.id} />

      {onExit && chapter.kind !== "convergence" && (
        <button
          type="button"
          onClick={onExit}
          aria-label="sair"
          className="absolute top-2 left-2 z-40 grid h-11 w-11 place-items-center rounded-full transition-colors motion-safe:hover:bg-[color:var(--ivory)]/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ivory)]/60"
        >
          <span
            aria-hidden="true"
            className="block h-1.5 w-1.5 rounded-full bg-[color:var(--ivory)]/55"
          />
        </button>
      )}

      {audioOn && <AmbientAudio gravity={gravityRef.current} />}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Drift phase
// ─────────────────────────────────────────────────────────────────────────

function DriftPhase({
  chapter,
  profile,
  onDone,
  onLinger,
  onAudio,
}: {
  chapter: DriftChapter;
  profile: DriftProfile;
  onDone: () => void;
  onLinger: (motifs: Motif[]) => void;
  onAudio: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const scene = chapter.scenes[idx];

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (idx < chapter.scenes.length - 1) setIdx((i) => i + 1);
      else onDone();
    }, chapter.holdMs);
    const soft = window.setTimeout(() => onLinger(scene.motifs), chapter.holdMs * 0.55);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(soft);
    };
  }, [idx, chapter, onDone, onLinger, scene.motifs]);

  return (
    <>
      <SceneVideo src={scene.video} />
      <Vignette />
      <button
        type="button"
        aria-label=" "
        className="absolute inset-0 z-10 cursor-default outline-none"
        onMouseDown={onAudio}
        onTouchStart={onAudio}
      />
      <Whisper
        key={`w-${chapter.id}-${idx}`}
        text={chapter.whisper(profile)}
        delay={1200}
        hold={4000}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Text phase — one whispered question, one slim input
// ─────────────────────────────────────────────────────────────────────────

function TextPhase({
  chapter,
  profile,
  onSubmit,
  onSkip,
}: {
  chapter: TextChapter;
  profile: DriftProfile;
  onSubmit: (value: string) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <SceneVideo src={chapter.scene.video} />
      <Vignette stronger />
      <form
        className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 transition-opacity duration-[1400ms]"
        style={{ opacity: shown ? 1 : 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value);
          else onSkip();
        }}
      >
        <label
          className="italic text-[color:var(--ivory)] text-center mb-6"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "18px",
            letterSpacing: "0.005em",
            textShadow: "0 1px 22px rgba(0,0,0,0.74)",
            opacity: 0.86,
          }}
        >
          {chapter.whisper(profile)}
        </label>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={chapter.placeholder}
          maxLength={32}
          className="w-full max-w-[20ch] bg-transparent text-center text-[color:var(--ivory)] outline-none border-0 border-b py-2"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "20px",
            borderBottomColor: "color-mix(in oklab, var(--ivory) 38%, transparent)",
            caretColor: "var(--gold)",
          }}
        />
        <button
          type="submit"
          className="mt-8 text-[11px] tracking-[0.22em] uppercase text-[color:var(--ivory)]/70 hover:text-[color:var(--ivory)] transition-colors"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          continuar
        </button>
      </form>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Choice phase — 2–3 scene tiles
// ─────────────────────────────────────────────────────────────────────────

function ChoicePhase({
  chapter,
  profile,
  onPick,
}: {
  chapter: ChoiceChapter;
  profile: DriftProfile;
  onPick: (opt: ChoiceOption) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [tilesIn, setTilesIn] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setTilesIn(true), 280);
    const t2 = window.setTimeout(() => setShowHints(true), 1800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const handlePick = (opt: ChoiceOption) => {
    if (picked) return;
    setPicked(opt.scene.id);
    onPick(opt);
  };

  return (
    <>
      <Whisper text={chapter.whisper(profile)} delay={500} hold={5200} />
      <div className="absolute inset-0 z-10 flex flex-col">
        {chapter.options.map((opt, i) => {
          const isPicked = picked === opt.scene.id;
          const isDimmed = picked !== null && !isPicked;
          return (
            <button
              key={opt.scene.id}
              type="button"
              onClick={() => handlePick(opt)}
              className="relative flex-1 overflow-hidden outline-none transition-all duration-[1000ms] ease-out focus-visible:ring-1 focus-visible:ring-[color:var(--ivory)]/40"
              style={{
                opacity: !tilesIn ? 0 : isDimmed ? 0.12 : 1,
                transform: !tilesIn
                  ? "translateY(14px)"
                  : isPicked
                    ? "scale(1.02)"
                    : "scale(1)",
                transitionDelay: !tilesIn ? `${i * 140}ms` : "0ms",
              }}
            >
              <video
                src={opt.scene.video}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[kenburns_22s_ease-in-out_infinite_alternate]"
                style={{ filter: "saturate(0.94) contrast(1.03)" }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.06) 28%, rgba(0,0,0,0.06) 72%, rgba(0,0,0,0.50) 100%)",
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px"
                style={{ background: "color-mix(in oklab, var(--ivory) 18%, transparent)" }}
              />
              <span
                className="absolute inset-x-0 bottom-6 z-10 block text-center italic text-[color:var(--ivory)] transition-all duration-[1500ms]"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "15px",
                  letterSpacing: "0.01em",
                  textShadow: "0 1px 18px rgba(0,0,0,0.7)",
                  opacity: showHints ? 0.86 : 0,
                  transform: showHints ? "translateY(0)" : "translateY(6px)",
                }}
              >
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Convergence — a composed day, assembled from the regional stops pool
// under operational rules. Not a static tour card — a personal itinerary
// that mixes stops across YES tours within the same region.
// ─────────────────────────────────────────────────────────────────────────

function ConvergencePhase({
  profile,
  confidence,
  onExit,
}: {
  profile: DriftProfile;
  confidence: ConfidenceMap;
  onExit?: () => void;
}) {
  const region = useMemo(() => pickRegion(profile as ComposerProfile), [profile]);
  const day = useMemo(
    () => composeDay(profile as ComposerProfile, region, { confidence }),
    [profile, region, confidence],
  );
  const localLead = useMemo(() => composeLead(profile), [profile]);
  const heroScene = pickHeroScene(profile);
  const anchorTour: SignatureTour | undefined = useMemo(
    () => (day.anchorTourId ? signatureTours.find((t) => t.id === day.anchorTourId) : undefined),
    [day.anchorTourId],
  );
  const [ready, setReady] = useState(false);

  // Server-driven reveal — fetches AI tone-only story + editable voice CTAs.
  // Falls back gracefully to local composition if the call fails.
  const reveal = useServerFn(revealJourney);
  const [serverPayload, setServerPayload] = useState<Awaited<ReturnType<typeof revealJourney>> | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    void recordDriftEvent("drift_complete");
    reveal({
      data: {
        name: profile.name,
        companions: profile.companions,
        pickup: profile.pickup,
        radius: profile.radius,
        energy: profile.energy,
        style: profile.style,
        social: profile.social,
        confidence,
      },
    })
      .then((res) => {
        if (!alive) return;
        setServerPayload(res);
        void recordDriftEvent("reveal_shown", {
          meta: {
            region: res.region,
            stops: res.day.stops.length,
            storySource: res.story.source,
          },
        });
      })
      .catch(() => {
        if (!alive) return;
        void recordDriftEvent("reveal_shown", { meta: { fallback: true } });
      });
    return () => {
      alive = false;
    };
  }, [reveal, profile]);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2400);
    return () => window.clearTimeout(t);
  }, []);

  const lead = serverPayload?.story.microStory ?? localLead;
  const heroLine = serverPayload?.story.hero;
  const ctaBook = serverPayload?.cta.book ?? "reservar este dia";
  const ctaSave = serverPayload?.cta.save ?? "guardar para depois";
  const ctaRefine = serverPayload?.cta.refine ?? "refinar com um local";

  const driveHours = Math.floor(day.totals.driveMin / 60);
  const driveMins = day.totals.driveMin % 60;
  const driveLabel =
    driveHours > 0 ? `${driveHours}h${String(driveMins).padStart(2, "0")}` : `${driveMins}min`;

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-black">
      <div className="relative h-[58vh] min-h-[360px] w-full overflow-hidden">
        <SceneVideo src={heroScene.video} />
        <Vignette stronger />
        <div className="absolute inset-x-0 bottom-8 z-20 px-6 text-center pointer-events-none">
          <p
            className="italic text-[color:var(--ivory)] mx-auto max-w-[24ch]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "19px",
              lineHeight: 1.5,
              textShadow: "0 1px 22px rgba(0,0,0,0.78)",
              opacity: 0.94,
            }}
          >
            {lead}
          </p>
        </div>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label="sair"
            className="absolute top-4 left-4 z-30 h-6 w-6 rounded-full bg-[color:var(--ivory)]/15 hover:bg-[color:var(--ivory)]/30 transition-colors"
          />
        )}
      </div>

      <div
        className="relative bg-[color:var(--ivory)] px-5 pt-10 pb-16 transition-opacity duration-[1400ms]"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <p
          className="text-center text-[10.5px] tracking-[0.26em] uppercase mb-2"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          o teu dia, composto
        </p>
        <h2
          className="text-center mb-3"
          style={{
            fontFamily: "'Montserrat', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "22px",
            color: "var(--charcoal)",
            letterSpacing: "-0.005em",
          }}
        >
          {heroLine ?? (profile.name ? `Para ti, ${profile.name}` : "Para ti")}
        </h2>
        <p
          className="text-center mb-6"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "12px",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          {day.stops.length} paragens · {driveLabel} de estrada · partida de {day.originLabel}
        </p>

        {serverPayload && serverPayload.dna.length > 0 && (
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {serverPayload.dna.map((t, i) => (
              <span
                key={t.key}
                className="inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase motion-safe:animate-[fade-in_0.6s_ease-out_both]"
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 600,
                  background: "color-mix(in oklab, var(--gold) 14%, transparent)",
                  color: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--gold) 32%, transparent)",
                  animationDelay: `${300 + i * 140}ms`,
                }}
              >
                {t.label}
              </span>
            ))}
          </div>
        )}


        {day.stops.length === 0 ? (
          <p
            className="text-center italic"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "14px",
              color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
            }}
          >
            ainda não há um dia possível para este pedido — fala com um local.
          </p>
        ) : (
          <ol className="space-y-4">
            {day.stops.map((cs, i) => {
              const s = cs.stop;
              const openLabel = s.hours
                ? `${s.hours.open}–${s.hours.close}`
                : "aberto todo o dia";
              return (
                <li
                  key={s.id}
                  className="relative pl-8 pr-3 py-3 bg-white rounded-md motion-safe:animate-[fade-in_0.7s_ease-out_both]"
                  style={{
                    boxShadow:
                      "0 1px 0 color-mix(in oklab, var(--charcoal) 8%, transparent)",
                    animationDelay: `${500 + i * 110}ms`,
                  }}
                >

                  <span
                    aria-hidden="true"
                    className="absolute left-2 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontSize: "10px",
                      color: "var(--ivory)",
                      background: "var(--teal)",
                    }}
                  >
                    {i + 1}
                  </span>
                  {i > 0 && cs.driveFromPrev > 0 && (
                    <p
                      className="mb-1 italic"
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: "11px",
                        color: "color-mix(in oklab, var(--charcoal) 50%, transparent)",
                      }}
                    >
                      {cs.driveFromPrev}min de estrada
                    </p>
                  )}
                  <p
                    style={{
                      fontFamily: "'Montserrat', system-ui, sans-serif",
                      fontWeight: 600,
                      fontSize: "14.5px",
                      color: "var(--charcoal)",
                      lineHeight: 1.3,
                    }}
                  >
                    {s.name}
                  </p>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontSize: "12.5px",
                      lineHeight: 1.5,
                      color: "color-mix(in oklab, var(--charcoal) 76%, transparent)",
                    }}
                  >
                    {s.blurb}
                  </p>
                  <p
                    className="mt-2 text-[10.5px] tracking-[0.18em] uppercase"
                    style={{
                      fontFamily: "'Inter', system-ui, sans-serif",
                      color: "color-mix(in oklab, var(--charcoal) 50%, transparent)",
                    }}
                  >
                    {s.dwellMin}min · {openLabel}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        {day.warnings.length > 0 && (
          <ul className="mt-5 space-y-1">
            {day.warnings.map((w) => (
              <li
                key={w}
                className="text-center italic"
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "12px",
                  color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                }}
              >
                {w}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          {anchorTour ? (
            <Link
              to="/tours/$tourId"
              params={{ tourId: anchorTour.id }}
              onClick={() => void recordDriftEvent("cta_book", { meta: { tourId: anchorTour.id } })}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[12px] tracking-[0.22em] uppercase"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                background: "var(--teal)",
                color: "var(--ivory)",
              }}
            >
              {ctaBook} →
            </Link>
          ) : (
            <Link
              to="/contact"
              onClick={() => void recordDriftEvent("cta_refine")}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full text-[12px] tracking-[0.22em] uppercase"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                background: "var(--teal)",
                color: "var(--ivory)",
              }}
            >
              {ctaRefine} →
            </Link>
          )}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => void recordDriftEvent("cta_save")}
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "color-mix(in oklab, var(--charcoal) 64%, transparent)",
              }}
            >
              {ctaSave}
            </button>
            <Link
              to="/experiences"
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "color-mix(in oklab, var(--charcoal) 64%, transparent)",
              }}
            >
              explorar tudo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


function pickHeroScene(profile: DriftProfile): Scene {
  if (profile.social === "intimate") return SCENES.candleTable;
  if (profile.social === "shared") return SCENES.celebration;
  if (profile.style === "coast") return SCENES.arrabidaCoast;
  if (profile.style === "heritage") return SCENES.hiddenStreet;
  if (profile.style === "wine") return SCENES.viewpoint;
  return SCENES.viewpoint;
}

function composeLead(p: DriftProfile): string {
  const who = p.name ? `${p.name}, ` : "";
  if (p.social === "intimate" && (p.companions === "couple" || p.companions === "solo")) {
    return `${who}portugal está a guardar-vos uma mesa pequena, à luz baixa.`;
  }
  if (p.social === "shared" || p.companions === "group") {
    return `${who}há uma sala onde já se ouvem copos. portugal está a guardar-vos lugar.`;
  }
  if (p.style === "coast") {
    return `${who}o mar está a desacelerar para te receber.`;
  }
  if (p.style === "wine") {
    return `${who}uma vinha em silêncio — é por aí que se entra.`;
  }
  if (p.style === "heritage") {
    return `${who}uma rua antiga está à tua espera, mais lá para baixo.`;
  }
  return `${who}portugal já sabe por onde te levar.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────

function SceneVideo({ src }: { src: string }) {
  return (
    <video
      key={src}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-[2000ms]"
      style={{ filter: "saturate(0.92) contrast(1.02)" }}
    />
  );
}

function Vignette({ stronger = false }: { stronger?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        background: stronger
          ? "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.50) 92%), linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.62) 100%)"
          : "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.36) 96%), linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.50) 100%)",
      }}
    />
  );
}

function Whisper({
  text,
  delay = 600,
  hold = 3200,
}: {
  text: string;
  delay?: number;
  hold?: number;
}) {
  return (
    <div
      key={`whisper-${text}`}
      className="absolute inset-x-0 top-[18%] z-[60] flex justify-center px-6 pointer-events-none"
    >
      <p
        className="italic text-[color:var(--ivory)] max-w-[22ch] text-center"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "19px",
          lineHeight: 1.45,
          letterSpacing: "0.005em",
          textShadow:
            "0 1px 2px rgba(0,0,0,0.92), 0 2px 18px rgba(0,0,0,0.78)",
          opacity: 0,
          animation: `whisperFade ${delay + hold + 1400}ms ease-out forwards`,
          // delay handled inside keyframes via timing
          animationDelay: `${Math.max(0, delay - 300)}ms`,
        }}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * A single hairline meridian at the top, filling left→right as the journey
 * advances. Replaces the old dot strip — same information, less interface.
 * Fades out in the final third (philosophy: interface disappears as
 * confidence rises). Reduced-motion safe.
 */
function Meridian({ index, total }: { index: number; total: number }) {
  const pct = total <= 1 ? 1 : Math.min(1, (index + 1) / total);
  const visibility = pct > 0.7 ? Math.max(0.18, 1 - (pct - 0.7) / 0.3) : 1;
  return (
    <div
      aria-hidden="true"
      className="absolute top-0 left-0 right-0 z-40 h-px"
      style={{
        background: "color-mix(in oklab, var(--ivory) 8%, transparent)",
        opacity: visibility,
      }}
    >
      <div
        className="h-full origin-left transition-[transform,opacity] duration-[1400ms] ease-out"
        style={{
          transform: `scaleX(${pct})`,
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--ivory) 35%, transparent) 0%, color-mix(in oklab, var(--gold) 60%, transparent) 100%)",
        }}
      />
    </div>
  );
}

/**
 * Brief black wash that pulses between chapters to mask the video swap.
 * 420ms in, 720ms out — keeps the editing rhythm calm.
 */
function ChapterFade({ chapterId }: { chapterId: string }) {
  const [opacity, setOpacity] = useState(0);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setOpacity(0.55);
    const t = window.setTimeout(() => setOpacity(0), 420);
    return () => window.clearTimeout(t);
  }, [chapterId]);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-[720ms] ease-out motion-reduce:hidden"
      style={{ opacity }}
    />
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Ambient audio
// ─────────────────────────────────────────────────────────────────────────

function AmbientAudio({ gravity }: { gravity: Map<Motif, number> }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    ctxRef.current = ctx;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 0.7;
    filterRef.current = filter;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 3.2);

    let raf = 0;
    const tick = () => {
      const f = filterRef.current;
      const c = ctxRef.current;
      if (f && c) {
        let warm = 0;
        let cool = 0;
        for (const [m, w] of gravity) {
          if (m === "amber" || m === "candle" || m === "fado" || m === "vine" || m === "bread") warm += w;
          else cool += w;
        }
        const target = Math.max(220, 380 + warm * 55 - cool * 38);
        f.frequency.setTargetAtTime(target, c.currentTime, 1.8);
      }
      raf = window.setTimeout(tick, 900) as unknown as number;
    };
    tick();

    return () => {
      window.clearTimeout(raf);
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
        window.setTimeout(() => {
          noise.stop();
          void ctx.close();
        }, 1200);
      } catch {
        // ignore
      }
    };
  }, [gravity]);

  return null;
}
