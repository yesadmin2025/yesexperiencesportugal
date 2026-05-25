import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { composeDay, pickRegion, type ComposedDay, type ComposerProfile } from "@/lib/drift/composer";
import { REGION_ORIGIN, type RegionKey } from "@/data/regionStops";
import { recordDriftBehaviorEvent, recordDriftEvent } from "@/lib/drift/telemetry";
import { revealJourney } from "@/server/driftEngine.functions";
import { composeStudioMoment } from "@/server/studioNarrative.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import { builderWaHref } from "@/components/builder/types";
import {
  bump,
  topValue,
  projectProfile,
  type ConfidenceMap,
  type DriftDimension,
  EXPLICIT,
  SOFT,
} from "@/lib/drift/inference";
import { SceneCanvas, type SceneSource } from "./SceneCanvas";
import { EncouragementBar } from "./EncouragementBar";
import { StudioConversionHud } from "./StudioConversionHud";
import { StudioTrustStrip } from "./StudioTrustStrip";
import { StudioLivePreview } from "./StudioLivePreview";
import { EmergingThemes } from "./EmergingThemes";
import { PriceWhisper } from "./PriceWhisper";
import { RevealInvestment } from "./RevealInvestment";
import { SmartRecommendations } from "./SmartRecommendations";
import { useDriftBehavior, type Mood as SceneMood } from "@/lib/drift/behavior";
import { derivePrediction, type TonalRegister } from "@/lib/drift/predict";
import { snapshotAdaptation, diffAdaptation, type AdaptationSnapshot } from "@/lib/drift/adaptation";
import { shouldShowBuildPreview } from "@/lib/drift/build-preview-visibility";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useStudioVariant } from "@/hooks/useStudioVariant";
import { useDriftLocale, t as tt, tName, type DriftLocale } from "@/lib/drift/i18n";


import wineHandImg from "@/assets/drift/wine-pour.jpg";
import sharedTableImg from "@/assets/drift/shared-table.jpg";
import silentVineyardImg from "@/assets/drift/silent-vineyard.jpg";
import dawnDouroImg from "@/assets/drift/dawn-douro.jpg";
import candleBreadImg from "@/assets/drift/candle-bread.jpg";
import atlanticHandsImg from "@/assets/drift/atlantic-hands.jpg";
import quietChapelImg from "@/assets/drift/quiet-chapel.jpg";
import linenBreezeImg from "@/assets/drift/linen-breeze.jpg";

// Lazy-load Leaflet-based map to avoid SSR window crashes.
const BuilderMap = lazy(() =>
  import("../BuilderMap").then((m) => ({ default: m.BuilderMap })),
);

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
type Duration = "day" | "multi";
type Energy = "slow" | "vivid";
type Style = "coast" | "heritage" | "wine" | "table";
type Social = "intimate" | "shared";

export interface DriftProfile {
  name?: string;
  companions?: Companions;
  pickup?: PickupRegion;
  radius?: Radius;
  duration?: Duration;
  energy?: Energy;
  style?: Style;
  social?: Social;
}

type Scene = {
  id: string;
  /** Cinematic video loop OR editorial still (priority: still > video if both). */
  video?: string;
  still?: string;
  ken?: "push" | "pull" | "drift";
  motifs: Motif[];
  /** Editorial intent tag — drives the predictive scene weighting layer. */
  mood?: SceneMood;
  /** 1 (calm/contemplative) → 5 (charged/celebratory). */
  intensity?: number;
};

/** Convert a Scene into a SceneSource the SceneCanvas understands. */
function sceneSource(s: Scene): SceneSource {
  if (s.still) return { kind: "still", src: s.still, ken: s.ken ?? "drift" };
  return { kind: "video", src: s.video! };
}

const SCENES: Record<string, Scene> = {
  arrabidaCoast: {
    id: "arrabida-coast",
    video: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
    motifs: ["salt", "linen", "vine"],
    mood: "arrival",
    intensity: 3,
  },
  caboRoca: {
    id: "cabo-roca",
    video: "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
    motifs: ["salt", "stone"],
    mood: "discovery",
    intensity: 4,
  },
  hiddenStreet: {
    id: "hidden-street",
    video: "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
    motifs: ["rain", "stone", "basil"],
    mood: "slowness",
    intensity: 2,
  },
  viewpoint: {
    id: "viewpoint",
    video: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
    motifs: ["vine", "fado", "amber"],
    mood: "slowness",
    intensity: 2,
  },
  candleTable: {
    id: "candle-table",
    video: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
    motifs: ["candle", "amber", "bread"],
    mood: "intimacy",
    intensity: 2,
  },
  celebration: {
    id: "celebration",
    video: "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
    motifs: ["candle", "amber", "fado", "linen"],
    mood: "celebration",
    intensity: 5,
  },
  sesimbra: {
    id: "sesimbra",
    video: "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
    motifs: ["harbour", "salt", "rain"],
    mood: "discovery",
    intensity: 4,
  },
  // Premium editorial stills — cinematic Ken Burns, film-grain overlay.
  wineHand: {
    id: "wine-hand",
    still: wineHandImg,
    ken: "pull",
    motifs: ["vine", "amber"],
    mood: "ritual",
    intensity: 3,
  },
  sharedTable: {
    id: "shared-table",
    still: sharedTableImg,
    ken: "push",
    motifs: ["candle", "amber", "bread"],
    mood: "intimacy",
    intensity: 3,
  },
  silentVineyard: {
    id: "silent-vineyard",
    still: silentVineyardImg,
    ken: "drift",
    motifs: ["vine", "amber"],
    mood: "slowness",
    intensity: 1,
  },
  dawnDouro: {
    id: "dawn-douro",
    still: dawnDouroImg,
    ken: "pull",
    motifs: ["vine", "stone"],
    mood: "arrival",
    intensity: 2,
  },
  candleBread: {
    id: "candle-bread",
    still: candleBreadImg,
    ken: "push",
    motifs: ["candle", "amber", "bread"],
    mood: "ritual",
    intensity: 3,
  },
  atlanticHands: {
    id: "atlantic-hands",
    still: atlanticHandsImg,
    ken: "drift",
    motifs: ["salt", "harbour"],
    mood: "discovery",
    intensity: 2,
  },
  quietChapel: {
    id: "quiet-chapel",
    still: quietChapelImg,
    ken: "drift",
    motifs: ["stone", "linen"],
    mood: "slowness",
    intensity: 1,
  },
  linenBreeze: {
    id: "linen-breeze",
    still: linenBreezeImg,
    ken: "drift",
    motifs: ["linen", "salt"],
    mood: "slowness",
    intensity: 2,
  },
};

/** Editorial still pools indexed by mood — used to upgrade a choice tile's
 *  visual when the predictive engine's top mood matches the option's mood.
 *  Keeps the imprint mapping intact (we only swap the visible source). */
const MOOD_STILLS: Partial<Record<SceneMood, Scene[]>> = {
  intimacy:    [SCENES.candleBread, SCENES.sharedTable],
  ritual:      [SCENES.wineHand, SCENES.candleBread],
  slowness:    [SCENES.silentVineyard, SCENES.quietChapel, SCENES.linenBreeze],
  arrival:     [SCENES.dawnDouro],
  discovery:   [SCENES.atlanticHands],
  celebration: [SCENES.sharedTable],
};

/** Deterministic still pick from a pool, seeded by a stable key. */
function pickStillForMood(mood: SceneMood | undefined, seed: string): Scene | null {
  if (!mood) return null;
  const pool = MOOD_STILLS[mood];
  if (!pool || pool.length === 0) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

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

const DRIFT_DIMENSIONS: DriftDimension[] = [
  "companions",
  "pickup",
  "radius",
  "energy",
  "style",
  "social",
];

const ALWAYS_ASK_CHAPTERS = new Set(["companions", "pickup", "duration", "radius"]);
const OPTIONAL_CHAPTER_IDS = ["energy", "style", "social"] as const;
type OptionalChapterId = (typeof OPTIONAL_CHAPTER_IDS)[number];

function isDriftDimension(key: string): key is DriftDimension {
  return DRIFT_DIMENSIONS.includes(key as DriftDimension);
}

// ─── Chapter graph ────────────────────────────────────────────────────────

type ChapterKind = "drift" | "text" | "choice" | "convergence";

interface DriftChapter {
  kind: "drift";
  id: string;
  /** Function so we can weave the traveller name in once we know it. */
  whisper: (p: DriftProfile, locale: DriftLocale) => string;
  scenes: Scene[];
  holdMs: number;
}

interface TextChapter {
  kind: "text";
  id: string;
  scene: Scene;
  whisper: (p: DriftProfile, locale: DriftLocale) => string;
  placeholder: (locale: DriftLocale) => string;
  /** Where to write the answer on the profile. */
  field: "name";
}

interface ChoiceOption {
  scene: Scene;
  hintKey: string;
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
  whisper: (p: DriftProfile, locale: DriftLocale) => string;
  options: ChoiceOption[];
}

interface ConvergenceChapter {
  kind: "convergence";
  id: string;
}

type Chapter = DriftChapter | TextChapter | ChoiceChapter | ConvergenceChapter;

const greet = (p: DriftProfile, fallback: string) =>
  p.name ? `${fallback.replace(/^./, (c) => c.toLowerCase())}, ${p.name.toLowerCase()}` : fallback;

/** Two-pace entry: travellers who chose "60 segundos" reveal faster. */
const isFastPace = (): boolean => {
  if (typeof window === "undefined") return false;
  try { return window.sessionStorage.getItem("studio.fastPace") === "1"; } catch { return false; }
};

function narrativeStageFor(chapter: Chapter, profile: DriftProfile, prediction?: ReturnType<typeof derivePrediction>) {
  if (chapter.kind === "convergence") return "reveal" as const;
  const resolved = [profile.companions, profile.pickup, profile.radius, profile.energy, profile.style, profile.social]
    .filter(Boolean).length;
  const fast = isFastPace();
  const emergenceThreshold = fast ? 0.32 : 0.62;
  const minResolved = fast ? 1 : 4;
  if ((prediction?.revealConfidence ?? 0) >= emergenceThreshold || resolved >= minResolved) return "emergence" as const;
  if (resolved >= 1 || profile.name) return "recognition" as const;
  return "invitation" as const;
}

function chapterSortKey(chapter: Chapter, confidence: ConfidenceMap, prediction: ReturnType<typeof derivePrediction>) {
  if (chapter.kind !== "choice") return -1;
  if (ALWAYS_ASK_CHAPTERS.has(chapter.id)) return -1;
  const dim = chapter.dim ?? (chapter.id as DriftDimension);
  if (!DRIFT_DIMENSIONS.includes(dim)) return -1;
  const top = topValue(confidence, dim)?.confidence ?? 0;
  const chapterMood = chapter.options
    .map((o) => o.scene.mood)
    .filter((m): m is SceneMood => Boolean(m))
    .sort((a, b) => (prediction.sceneWeighting[b] ?? 0.5) - (prediction.sceneWeighting[a] ?? 0.5))[0];
  const affinity = chapterMood ? prediction.sceneWeighting[chapterMood] ?? 0.5 : 0.5;
  return (1 - top) * 0.72 + affinity * 0.28;
}

const PROFILE_LABELS: Record<string, Record<DriftLocale, string>> = {
  solo: { en: "solo", pt: "a sós", es: "a solas", fr: "seul" },
  couple: { en: "for two", pt: "a dois", es: "para dos", fr: "à deux" },
  group: { en: "with your people", pt: "com os seus", es: "con su gente", fr: "avec vos proches" },
  lisbon: { en: "from Lisbon", pt: "a partir de Lisboa", es: "desde Lisboa", fr: "depuis Lisbonne" },
  centro: { en: "through Central Portugal", pt: "pelo Centro", es: "por el Centro", fr: "dans le Centre" },
  alentejo: { en: "in Alentejo", pt: "no Alentejo", es: "en Alentejo", fr: "en Alentejo" },
  near: { en: "close and slow", pt: "perto e devagar", es: "cerca y despacio", fr: "proche et lent" },
  far: { en: "a full day out", pt: "um dia inteiro fora", es: "un día completo fuera", fr: "une journée entière dehors" },
  anywhere: { en: "where it is worth it", pt: "onde valer a pena", es: "donde valga la pena", fr: "là où cela vaut le détour" },
  slow: { en: "slow", pt: "lento", es: "lento", fr: "lent" },
  vivid: { en: "vivid", pt: "vivo", es: "vivo", fr: "vivant" },
  coast: { en: "Atlantic", pt: "Atlântico", es: "Atlántico", fr: "Atlantique" },
  heritage: { en: "old stone", pt: "pedra antiga", es: "piedra antigua", fr: "pierre ancienne" },
  wine: { en: "vineyard ritual", pt: "ritual da vinha", es: "ritual de viñedo", fr: "rituel des vignes" },
  table: { en: "long table", pt: "mesa longa", es: "mesa larga", fr: "longue table" },
  intimate: { en: "quietly private", pt: "discreto e privado", es: "discreto y privado", fr: "discret et privé" },
  shared: { en: "generously shared", pt: "generosamente partilhado", es: "generosamente compartido", fr: "généreusement partagé" },
};

function labelValue(value: string | undefined, locale: DriftLocale): string | null {
  if (!value) return null;
  return PROFILE_LABELS[value]?.[locale] ?? PROFILE_LABELS[value]?.en ?? value;
}

function optionScore(opt: ChoiceOption, confidence: ConfidenceMap, prediction: ReturnType<typeof derivePrediction>) {
  const moodScore = opt.scene.mood ? prediction.sceneWeighting[opt.scene.mood] ?? 0.5 : 0.5;
  let explicitPull = 0;
  for (const [dim, value] of Object.entries(opt.imprint)) {
    if (!value || !isDriftDimension(dim)) continue;
    explicitPull = Math.max(explicitPull, confidence[`${dim}:${value}`] ?? 0);
  }
  return moodScore * 0.58 + explicitPull * 0.42;
}

function predictiveCue(confidence: number, locale: DriftLocale): string {
  if (locale === "pt") return confidence >= 0.72 ? "isto segue naturalmente" : confidence >= 0.48 ? "isto encaixa a seguir" : "talvez também goste disto";
  if (locale === "es") return confidence >= 0.72 ? "esto sigue con naturalidad" : confidence >= 0.48 ? "esto encaja a continuación" : "quizá también le guste";
  if (locale === "fr") return confidence >= 0.72 ? "cela vient naturellement" : confidence >= 0.48 ? "cela s’enchaîne bien" : "vous pourriez aussi aimer";
  return confidence >= 0.72 ? "this follows naturally" : confidence >= 0.48 ? "this feels right next" : "you might also love";
}

const CHAPTERS: Chapter[] = [
  {
    kind: "drift",
    id: "opening",
    whisper: (_p, locale) => tt("chapter.opening", locale),
    scenes: [SCENES.dawnDouro, SCENES.arrabidaCoast],
    holdMs: 7000,
  },
  {
    kind: "text",
    id: "name",
    scene: SCENES.linenBreeze,
    whisper: (_p, locale) => tt("chapter.name", locale),
    placeholder: (locale) => tt("chapter.name_placeholder", locale),
    field: "name",
  },
  {
    kind: "drift",
    id: "settling",
    whisper: (p, locale) =>
      p.name
        ? tt("chapter.settling_named", locale).replace("{name}", p.name.toLowerCase())
        : tt("chapter.settling", locale),
    scenes: [SCENES.quietChapel],
    holdMs: 5400,
  },
  {
    kind: "choice",
    id: "companions",
    whisper: (_p, locale) => tt("chapter.companions", locale),
    options: [
      {
        scene: SCENES.atlanticHands,
        hintKey: "hint.companions.0",
        imprint: { companions: "solo" },
        reinforce: ["stone", "salt"],
      },
      {
        scene: SCENES.candleBread,
        hintKey: "hint.companions.1",
        imprint: { companions: "couple" },
        reinforce: ["candle", "amber"],
      },
      {
        scene: SCENES.sharedTable,
        hintKey: "hint.companions.2",
        imprint: { companions: "group" },
        reinforce: ["fado", "linen"],
      },
    ],
  },
  {
    kind: "choice",
    id: "pickup",
    whisper: (_p, locale) => tt("chapter.pickup", locale),
    options: [
      {
        scene: SCENES.arrabidaCoast,
        hintKey: "hint.pickup.0",
        imprint: { pickup: "lisbon" },
        reinforce: ["salt", "linen"],
      },
      {
        scene: SCENES.hiddenStreet,
        hintKey: "hint.pickup.1",
        imprint: { pickup: "centro" },
        reinforce: ["stone", "basil"],
      },
      {
        scene: SCENES.silentVineyard,
        hintKey: "hint.pickup.2",
        imprint: { pickup: "alentejo" },
        reinforce: ["vine", "amber"],
      },
    ],
  },
  {
    kind: "choice",
    id: "duration",
    whisper: (_p, locale) => tt("chapter.duration", locale),
    options: [
      {
        scene: SCENES.candleBread,
        hintKey: "hint.duration.0",
        imprint: { duration: "day" },
        reinforce: ["candle", "bread"],
      },
      {
        scene: SCENES.dawnDouro,
        hintKey: "hint.duration.1",
        imprint: { duration: "multi", radius: "anywhere" },
        reinforce: ["vine", "linen", "stone"],
      },
    ],
  },
  {
    kind: "choice",
    id: "radius",
    whisper: (_p, locale) => tt("chapter.radius", locale),
    options: [
      {
        scene: SCENES.candleBread,
        hintKey: "hint.radius.0",
        imprint: { radius: "near" },
        reinforce: ["candle", "bread"],
      },
      {
        scene: SCENES.dawnDouro,
        hintKey: "hint.radius.1",
        imprint: { radius: "far" },
        reinforce: ["vine", "amber"],
      },
      {
        scene: SCENES.caboRoca,
        hintKey: "hint.radius.2",
        imprint: { radius: "anywhere" },
        reinforce: ["stone", "salt"],
      },
    ],
  },
  {
    kind: "choice",
    id: "energy",
    whisper: (_p, locale) => tt("chapter.energy", locale),
    options: [
      {
        scene: SCENES.quietChapel,
        hintKey: "hint.energy.0",
        imprint: { energy: "slow" },
        reinforce: ["vine", "amber"],
      },
      {
        scene: SCENES.sesimbra,
        hintKey: "hint.energy.1",
        imprint: { energy: "vivid" },
        reinforce: ["harbour", "salt"],
      },
    ],
  },
  {
    kind: "choice",
    id: "style",
    whisper: (_p, locale) => tt("chapter.style", locale),
    options: [
      {
        scene: SCENES.arrabidaCoast,
        hintKey: "hint.style.0",
        imprint: { style: "coast" },
        reinforce: ["salt", "linen"],
      },
      {
        scene: SCENES.hiddenStreet,
        hintKey: "hint.style.1",
        imprint: { style: "heritage" },
        reinforce: ["stone", "basil"],
      },
      {
        scene: SCENES.wineHand,
        hintKey: "hint.style.2",
        imprint: { style: "wine" },
        reinforce: ["vine", "fado"],
      },
    ],
  },
  {
    kind: "choice",
    id: "social",
    whisper: (_p, locale) => tt("chapter.social", locale),
    options: [
      {
        scene: SCENES.candleBread,
        hintKey: "hint.social.0",
        imprint: { social: "intimate" },
        reinforce: ["candle", "amber", "bread"],
      },
      {
        scene: SCENES.sharedTable,
        hintKey: "hint.social.1",
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
  const sessionId = useBuilderSessionId();
  const [chapterIdx, setChapterIdx] = useState(0);
  const [profile, setProfile] = useState<DriftProfile>({});
  const [audioOn, setAudioOn] = useState(false);
  const [narrativeLine, setNarrativeLine] = useState<string | null>(null);
  const [narrativeAt, setNarrativeAt] = useState<number | null>(null);
  const [askedOptionalChapters, setAskedOptionalChapters] = useState<Set<OptionalChapterId>>(() => new Set());
  const [interludeWhisper, setInterludeWhisper] = useState<string | null>(null);
  const gravityRef = useRef<Map<Motif, number>>(new Map());
  const confidenceRef = useRef<ConfidenceMap>({});
  const firedStagesRef = useRef<Set<string>>(new Set());
  const aiBudgetRef = useRef(0);
  const [, setTick] = useState(0);
  const locale = useDriftLocale();
  const composeMoment = useServerFn(composeStudioMoment);

  // Predictive behavior layer — silently shapes pacing, weighting, tone.
  const behavior = useDriftBehavior();
  const prediction = useMemo(
    () => derivePrediction(confidenceRef.current, behavior.state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapterIdx, behavior.state.decisionLatency.length, behavior.state.attractionEvents.length],
  );

  const chapter = CHAPTERS[chapterIdx];
  const stage = narrativeStageFor(chapter, profile, prediction);
  const inferredProfile = useMemo(
    () => ({ ...projectProfile(confidenceRef.current, 0.42), ...profile }) as DriftProfile,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, chapterIdx, prediction.revealConfidence],
  );
  const liveRegion = useMemo(() => pickRegion(inferredProfile as ComposerProfile), [inferredProfile]);
  const liveDay = useMemo(
    () => composeDay(inferredProfile as ComposerProfile, liveRegion, {
      confidence: confidenceRef.current,
      tonalRegister: prediction.tonalRegister,
      intensityPreference: prediction.intensity,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inferredProfile, liveRegion, chapterIdx, prediction.tonalRegister],
  );
  // Sticky build-preview must only surface AFTER the traveller has chosen
  // a pickup region — otherwise we display a fabricated stop ("Livramento
  // market, Setúbal") for someone who hasn't said where they want to start.
  // That breaks the no-invention rule and confuses the rhythm.
  // Drive the BuildPreview gate from CSS height breakpoints (matchMedia)
  // rather than raw `window.innerHeight`. This:
  //   • fires only when the breakpoint is actually crossed (no resize churn);
  //   • naturally accounts for CSS px / DPR / browser chrome / soft keyboard;
  //   • mirrors the `@media (max-height: …)` defense rule in styles.css so
  //     JS and CSS agree on the threshold.
  const fitsBasicHeight = useMediaQuery("(min-height: 640px)", true);
  const fitsDenseHeight = useMediaQuery("(min-height: 720px)", true);
  // BuildPreview is 84px + 12px inset + ~108px reserve. On short viewports
  // with 3 choice cards it bleeds over the 3rd option. The pure rule lives
  // in `build-preview-visibility.ts` so it can be unit-tested across
  // resize/rotation scenarios without mounting React. We collapse the
  // matchMedia booleans back into a representative vh value to keep the
  // pure-function API single-shaped.
  const choiceCount = chapter.kind === "choice" ? chapter.options.length : 0;
  const breakpointVh = fitsDenseHeight ? 720 : fitsBasicHeight ? 640 : 0;
  const showBuildPreview = shouldShowBuildPreview({
    chapterKind: chapter.kind,
    choiceCount,
    hasPickup: Boolean(profile.pickup),
    chapterIdx,
    liveStopsCount: liveDay.stops.length,
    vh: breakpointVh,
  });
  const buildPreviewIsDense = choiceCount >= 3;



  // Adaptation telemetry — emit `prediction_update` ONLY when the engine
  // actually moved (top mood, itinerary, collapse list, pacing, …).
  // This turns each row into evidence that a real user signal shifted the
  // recommendation and keeps churn rows out of the table.
  const lastAdaptationRef = useRef<AdaptationSnapshot | null>(null);
  useEffect(() => {
    if (!chapter || chapter.kind === "convergence") return;
    const snapshot = snapshotAdaptation(prediction, confidenceRef.current, liveDay);
    const diff = diffAdaptation(lastAdaptationRef.current, snapshot);
    if (!diff.changed) return;
    lastAdaptationRef.current = snapshot;
    void recordDriftBehaviorEvent("prediction_update", {
      chapterId: chapter.id,
      predictedTonalRegister: prediction.tonalRegister,
      predictedIntensity: String(Number(prediction.intensity.toFixed(2))),
      revealConfidence: Number(prediction.revealConfidence.toFixed(3)),
      meta: {
        pacingClass: prediction.pacingClass,
        nextBestDimensions: prediction.nextBestDimensions,
        inferredProfile,
        shouldCollapseAhead: prediction.shouldCollapseAhead,
        changeReasons: diff.reasons,
        snapshot,
        previousSnapshot: diff.previous,
        behaviorCounts: {
          decisions: behavior.state.decisionLatency.length,
          attractions: behavior.state.attractionEvents.length,
          skips: behavior.state.skipEvents.length,
          lingers: behavior.state.lingerEvents.length,
        },
      },
    });
  }, [
    chapter?.id,
    chapter?.kind,
    prediction.pacingClass,
    prediction.tonalRegister,
    prediction.revealConfidence,
    prediction.intensity,
    prediction.shouldCollapseAhead,
    liveDay,
    inferredProfile,
    behavior.state.attractionEvents.length,
    behavior.state.decisionLatency.length,
    behavior.state.skipEvents.length,
    behavior.state.lingerEvents.length,
  ]);


  useEffect(() => {
    if (!sessionId || !chapter) return;
    const key = `${stage}:${chapter.id}`;
    if (stage === "invitation" || firedStagesRef.current.has(key) || aiBudgetRef.current >= 4) return;
    firedStagesRef.current.add(key);
    aiBudgetRef.current += 1;
    let cancelled = false;
    composeMoment({
      data: {
        sessionId,
        mode: "narrative",
        locale,
        mood: prediction.tonalRegister,
        who: profile.companions ?? null,
        intention: profile.style ?? null,
        journeyType: profile.duration === "multi" ? "multi" : "day",
        travellerName: stage === "reveal" ? profile.name ?? null : null,
        narrativeStage: stage,
        confidence: prediction.revealConfidence,
        acceptedCount: Object.values(profile).filter(Boolean).length,
        lastFragment: narrativeLine,
        lastAcceptedTag: chapter.id,
      },
    })
      .then((r) => {
        if (!cancelled && r.mode === "narrative" && r.fragment) {
          setNarrativeLine(r.fragment);
          setNarrativeAt(Date.now());
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId, chapter?.id, stage, locale, prediction.tonalRegister, prediction.revealConfidence]);

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
      const optionalCandidates = CHAPTERS
        .map((c, idx) => ({ c, idx }))
        .filter(({ c }) => c.kind === "choice" && OPTIONAL_CHAPTER_IDS.includes(c.id as OptionalChapterId))
        .filter(({ c }) => !askedOptionalChapters.has(c.id as OptionalChapterId));
      if (i >= 6 && optionalCandidates.length > 0 && !prediction.shouldCollapseAhead) {
        const targetDim = prediction.nextBestDimensions.find((dim) => !askedOptionalChapters.has(dim));
        const best = targetDim
          ? optionalCandidates.find(({ c }) => c.id === targetDim)
          : optionalCandidates.sort(
            (a, b) => chapterSortKey(b.c, conf, prediction) - chapterSortKey(a.c, conf, prediction),
          )[0];
        if (best) return best.idx;
      }
      while (next < CHAPTERS.length - 1) {
        const c = CHAPTERS[next];
        if (c.kind !== "choice") break;
        if (ALWAYS_ASK_CHAPTERS.has(c.id)) break;
        const dim = (c.dim ?? (c.id as DriftDimension));
        const top = topValue(conf, dim);
        // Only skip dimensions the inference engine actually owns.
        if (!DRIFT_DIMENSIONS.includes(dim)) break;
        if (!prediction.shouldCollapseAhead && (!top || top.confidence < 0.78)) break;
        if (prediction.shouldCollapseAhead && (!top || top.confidence < 0.5)) break;
        if (!top) break;
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
  }, [askedOptionalChapters, prediction]);

  const onPick = useCallback(
    (opt: ChoiceOption, alternatives: ChoiceOption[]) => {
      if (!audioOn) setAudioOn(true);
      if (OPTIONAL_CHAPTER_IDS.includes(chapter.id as OptionalChapterId)) {
        setAskedOptionalChapters((prev) => new Set(prev).add(chapter.id as OptionalChapterId));
      }
      setProfile((p) => ({ ...p, ...opt.imprint }));
      reinforce(opt.reinforce, 1.4);
      // Behavior signal — chose this scene, skipped the others.
      behavior.recordChoice({
        sceneId: opt.scene.id,
        mood: opt.scene.mood,
        intensity: opt.scene.intensity,
        alternatives: alternatives
          .filter((a) => a.scene.id !== opt.scene.id)
          .map((a) => ({ sceneId: a.scene.id, mood: a.scene.mood, intensity: a.scene.intensity })),
      });
      // Explicit imprint → full confidence on those dimensions.
      let conf = confidenceRef.current;
      for (const [k, v] of Object.entries(opt.imprint)) {
        if (v === undefined) continue;
        if (isDriftDimension(k)) {
          conf = bump(conf, k, String(v), EXPLICIT);
        }
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
      // Pacing: decisive users get a tighter snap to next chapter.
      const snap = prediction.pacingClass === "decisive" ? 480 : 850;
      // Multi-day = a dedicated cinematic interlude before the next chapter,
      // honoring the Bible's "higher emotional tier" rule for multi-day.
      if (chapter.id === "duration" && opt.imprint.duration === "multi") {
        setInterludeWhisper(tt("chapter.duration_multi_whisper", locale));
        window.setTimeout(() => {
          setInterludeWhisper(null);
          advance();
        }, 2600);
        return;
      }
      window.setTimeout(advance, snap);
    },
    [audioOn, reinforce, advance, chapter, behavior, prediction.pacingClass, locale],
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
          locale={locale}
          holdScale={prediction.holdScale}
          onDone={advance}
          onLinger={(motifs, ms) => {
            reinforce(motifs, 0.6);
            behavior.recordLinger(ms);
          }}
          onAudio={() => !audioOn && setAudioOn(true)}
        />
      )}

      {chapter.kind === "text" && (
        <TextPhase
          key={chapter.id}
          chapter={chapter}
          profile={profile}
          locale={locale}
          onSubmit={onNameSubmit}
          onSkip={advance}
        />
      )}

      {chapter.kind === "choice" && (
        <ChoicePhase
          key={chapter.id}
          chapter={chapter}
          profile={profile}
          locale={locale}
          onPick={onPick}
          sceneWeighting={prediction.sceneWeighting}
          tonalRegister={prediction.tonalRegister}
          prediction={prediction}
          confidence={confidenceRef.current}
          hasBuildPreview={showBuildPreview}
          onSceneShown={behavior.markSceneShown}
          onAttraction={(opt) =>
            {
              behavior.recordAttraction({
                sceneId: opt.scene.id,
                mood: opt.scene.mood,
                intensity: opt.scene.intensity,
                weight: 1.2,
              });
              reinforce(opt.reinforce, 0.75);
            }
          }
        />
      )}

      {chapter.kind === "convergence" && (
        <ConvergencePhase
          profile={profile}
          confidence={confidenceRef.current}
          prediction={prediction}
          locale={locale}
          onExit={onExit}
        />
      )}

      {memoryTints.map((t, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-[2400ms] ease-out"
          style={{ background: t.bg, opacity: t.opacity, mixBlendMode: "soft-light" }}
        />
      ))}

      {chapter.kind !== "convergence" && (
        <>
          <StudioConversionHud
            index={chapterIdx}
            total={CHAPTERS.length}
            confidence={prediction.revealConfidence}
            pricePerGuestFrom={145}
            fast={isFastPace()}
          />
          <StudioTrustStrip
            reviewsLabel={tt("trust.reviews", locale) || "reviews"}
          />
          <EncouragementBar index={chapterIdx} total={CHAPTERS.length} locale={locale} name={profile.name} />
          <EmergingThemes
            sceneWeighting={prediction.sceneWeighting}
            locale={locale}
            hasSignal={Boolean(profile.companions || profile.pickup || profile.energy || profile.style)}
          />
          <PriceWhisper
            revealConfidence={prediction.revealConfidence}
            locale={locale}
          />
        </>
      )}
      {/* Predictive AI whisper — personalized fragment produced by composeStudioMoment
          for THIS user's behavior, profile and stage. Makes the predictive engine
          visible: every traveller sees a different line at a different moment. */}
      {chapter.kind !== "convergence" && narrativeLine && narrativeAt && (
        <AiWhisper key={narrativeAt} text={narrativeLine} />
      )}
      {showBuildPreview && (
        <StudioLivePreview
          day={liveDay}
          region={liveRegion}
          locale={locale}
          profile={inferredProfile}
          prediction={prediction}
          activeStopIndex={Math.min(liveDay.stops.length - 1, Math.max(0, chapterIdx - 4))}
          dense={buildPreviewIsDense}
        />
      )}

      <ChapterFade chapterId={chapter.id} />

      {onExit && chapter.kind !== "convergence" && (
        <button
          type="button"
          onClick={onExit}
          aria-label={tt("ui.exit", locale)}
          className="absolute top-2 left-2 z-40 grid h-11 w-11 place-items-center rounded-full transition-colors motion-safe:hover:bg-[color:var(--ivory)]/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ivory)]/60"
        >
          <span
            aria-hidden="true"
            className="block h-1.5 w-1.5 rounded-full bg-[color:var(--ivory)]/55"
          />
        </button>
      )}

      {chapter.kind !== "convergence" && chapterIdx > 0 && (
        <button
          type="button"
          onClick={() => setChapterIdx((i) => Math.max(0, i - 1))}
          aria-label={tt("ui.back", locale) || "Back"}
          className="absolute bottom-[100px] left-3 z-[46] inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ivory)]/60"
          style={{
            color: "color-mix(in oklab, var(--ivory) 70%, transparent)",
            background: "color-mix(in oklab, var(--charcoal) 50%, transparent)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            border: "1px solid color-mix(in oklab, var(--ivory) 10%, transparent)",
            opacity: 0.78,
          }}
        >
          <span aria-hidden="true">‹</span>
          {tt("ui.back", locale) || "Back"}
        </button>
      )}

      {interludeWhisper && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[70] flex items-center justify-center px-7 pointer-events-none motion-safe:animate-[fade-in_0.9s_ease-out_both]"
          style={{ background: "rgba(0,0,0,0.62)" }}
        >
          <p
            className="text-center italic"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "23px",
              lineHeight: 1.42,
              color: "var(--ivory)",
              maxWidth: "22ch",
              textShadow: "0 2px 30px rgba(0,0,0,0.9)",
              opacity: 0.96,
            }}
          >
            {interludeWhisper}
          </p>
        </div>
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
  locale,
  onDone,
  onLinger,
  onAudio,
  holdScale = 1,
}: {
  chapter: DriftChapter;
  profile: DriftProfile;
  locale: DriftLocale;
  onDone: () => void;
  onLinger: (motifs: Motif[], ms: number) => void;
  onAudio: () => void;
  holdScale?: number;
}) {
  const [idx, setIdx] = useState(0);
  const scene = chapter.scenes[idx];

  const onDoneRef = useRef(onDone);
  const onLingerRef = useRef(onLinger);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => { onLingerRef.current = onLinger; }, [onLinger]);

  useEffect(() => {
    const hold = Math.max(1500, chapter.holdMs * holdScale);
    const motifs = scene.motifs;
    const t = window.setTimeout(() => {
      if (idx < chapter.scenes.length - 1) setIdx((i) => i + 1);
      else onDoneRef.current();
    }, hold);
    const soft = window.setTimeout(
      () => onLingerRef.current(motifs, hold * 0.55),
      hold * 0.55,
    );
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(soft);
    };
  }, [idx, chapter.id, chapter.holdMs, chapter.scenes.length, scene.motifs, holdScale]);


  return (
    <>
      <SceneVideo scene={scene} />
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
        text={chapter.whisper(profile, locale)}
        delay={1200}
        hold={4000}
        variant="opening"
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
  locale,
  onSubmit,
  onSkip,
}: {
  chapter: TextChapter;
  profile: DriftProfile;
  locale: DriftLocale;
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
      <SceneVideo scene={chapter.scene} />
      <Vignette stronger />
      <form
        className="absolute inset-0 z-20 flex flex-col items-center justify-center px-7 transition-opacity duration-[1400ms]"
        style={{ opacity: shown ? 1 : 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value);
          else onSkip();
        }}
      >
        <label
          className="text-[color:var(--ivory)] text-center mb-8"
          style={{
            fontFamily: "'Montserrat', system-ui, sans-serif",
            fontSize: "25px",
            fontWeight: 700,
            lineHeight: 1.16,
            letterSpacing: "0",
            textShadow: "0 2px 28px rgba(0,0,0,0.84)",
            opacity: 0.96,
          }}
        >
          {chapter.whisper(profile, locale)}
        </label>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={chapter.placeholder(locale)}
          maxLength={32}
          className="w-full max-w-[18ch] bg-transparent text-center text-[color:var(--ivory)] outline-none border-0 border-b py-3"
          style={{
            fontFamily: "'Montserrat', system-ui, sans-serif",
            fontSize: "21px",
            fontWeight: 600,
            letterSpacing: "0",
            borderBottomColor: "color-mix(in oklab, var(--gold) 54%, transparent)",
            caretColor: "var(--gold)",
          }}
        />
        <button
          type="submit"
          className="mt-8 text-[11px] uppercase text-[color:var(--ivory)]/78 hover:text-[color:var(--ivory)] transition-colors"
          style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "0.18em" }}
        >
          {tt("text.continue", locale)}
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
  locale,
  onPick,
  sceneWeighting,
  tonalRegister,
  prediction,
  confidence,
  hasBuildPreview = false,
  onAttraction,
  onSceneShown,
}: {
  chapter: ChoiceChapter;
  profile: DriftProfile;
  locale: DriftLocale;
  onPick: (opt: ChoiceOption, alternatives: ChoiceOption[]) => void;
  sceneWeighting?: Record<SceneMood, number>;
  tonalRegister?: TonalRegister;
  prediction?: ReturnType<typeof derivePrediction>;
  confidence?: ConfidenceMap;
  hasBuildPreview?: boolean;
  onAttraction?: (opt: ChoiceOption) => void;
  onSceneShown?: (sceneId: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [tilesIn, setTilesIn] = useState(false);
  const [idle, setIdle] = useState(false);

  // Order by predicted affinity; drop weakest option only if at least two
  // strong ones remain. Keeps the choice rhythm honest, never empties it.
  const ordered = useMemo(() => {
    const w = (o: ChoiceOption) =>
      o.scene.mood && sceneWeighting ? sceneWeighting[o.scene.mood] ?? 0.5 : 0.5;
    const sorted = [...chapter.options].sort((a, b) => {
      if (prediction && confidence) return optionScore(b, confidence, prediction) - optionScore(a, confidence, prediction);
      return w(b) - w(a);
    });
    if (prediction && sorted.length >= 3 && prediction.revealConfidence >= (isFastPace() ? 0.38 : 0.72)) return sorted.slice(0, 2);
    if (sceneWeighting && sorted.length >= 3) {
      const last = sorted[sorted.length - 1]!;
      if (w(last) < 0.22) return sorted.slice(0, sorted.length - 1);
    }
    return sorted;
  }, [chapter.options, sceneWeighting, prediction, confidence]);

  // Predictive cue is only meaningful once the AI has a real read on the
  // traveller. Before confidence ≥ 0.48 ("this feels right next") the line
  // becomes meaningless filler ("you might also love" with no context), so
  // we suppress it entirely and let the atmosphere breathe.
  const rawCue = predictiveCue(prediction?.revealConfidence ?? 0, locale);
  const cue = (prediction?.revealConfidence ?? 0) >= 0.48 ? rawCue : null;

  useEffect(() => {
    const t1 = window.setTimeout(() => setTilesIn(true), 280);
    const t2 = window.setTimeout(() => setShowHints(true), 1800);
    const t3 = window.setTimeout(() => setIdle(true), 6000);
    ordered.forEach((o) => onSceneShown?.(o.scene.id));
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id]);

  const handlePick = (opt: ChoiceOption) => {
    if (picked) return;
    setPicked(opt.scene.id);
    onPick(opt, ordered);
  };

  // Long-press = strong attraction signal (≥500ms hold without release).
  const pressRef = useRef<number | null>(null);
  const handlePressStart = (opt: ChoiceOption) => {
    pressRef.current = window.setTimeout(() => {
      onAttraction?.(opt);
      pressRef.current = null;
    }, 520) as unknown as number;
  };
  const handlePressEnd = () => {
    if (pressRef.current !== null) {
      window.clearTimeout(pressRef.current);
      pressRef.current = null;
    }
  };

  return (
    <>
      <Whisper text={chapter.whisper(profile, locale)} delay={360} hold={5200} variant="choice" />
      {cue && (
        <p
          aria-hidden="true"
          className="absolute inset-x-0 top-[23%] z-[56] px-7 text-center transition-opacity duration-[900ms]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "12px",
            fontStyle: "italic",
            fontWeight: 400,
            letterSpacing: "0.005em",
            color: "color-mix(in oklab, var(--gold) 72%, var(--ivory))",
            textShadow: "0 1px 14px rgba(0,0,0,0.72)",
            opacity: tilesIn ? 0.78 : 0,
          }}
        >
          {cue}
        </p>
      )}
      {idle && !picked && (
        <p
          aria-live="polite"
          className="absolute inset-x-0 z-[55] px-7 text-center pointer-events-none motion-safe:animate-[fade-in_0.6s_ease-out_both]"
          style={{
            bottom: hasBuildPreview ? "120px" : "16px",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "color-mix(in oklab, var(--ivory) 78%, transparent)",
            textShadow: "0 1px 10px rgba(0,0,0,0.7)",
          }}
        >
          {tt("choice.idle_hint", locale)}
        </p>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-3 pb-3" style={{ top: hasBuildPreview ? "25%" : "30%", bottom: hasBuildPreview ? "108px" : 0 }}>
        {ordered.map((opt, i) => {
          const isPicked = picked === opt.scene.id;
          const isDimmed = picked !== null && !isPicked;
          // Upgrade visible source to a cinematic still when the option's
          // mood aligns with the predicted tonal register (or scene already
          // has no video). Imprint mapping is untouched.
          const upgradeMoods: SceneMood[] = (() => {
            switch (tonalRegister) {
              case "intimate": return ["intimacy", "slowness"];
              case "ritual": return ["ritual", "intimacy"];
              case "playful": return ["celebration"];
              case "expansive": return ["arrival", "discovery"];
              default: return [];
            }
          })();
          const shouldUpgrade =
            !opt.scene.still &&
            opt.scene.mood !== undefined &&
            upgradeMoods.includes(opt.scene.mood);
          const renderedScene =
            (shouldUpgrade
              ? pickStillForMood(opt.scene.mood, `${chapter.id}:${opt.scene.id}`)
              : null) ?? opt.scene;
          const optionLabel = tt(opt.hintKey, locale);
          return (
            <button
              key={opt.scene.id}
              type="button"
              onClick={() => handlePick(opt)}
              onMouseDown={() => handlePressStart(opt)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(opt)}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressEnd}
              // A11y:
              //  • explicit aria-label so the option is announced even when
              //    the visible hint is opacity:0 during the reveal cadence;
              //  • aria-pressed mirrors the picked state;
              //  • min-h-11 keeps each card ≥ 44px tap target even when the
              //    container squeezes to fit 3 cards in a short viewport.
              aria-label={tt("ui.choose", locale).replace("{label}", optionLabel)}
              aria-pressed={isPicked}
              className="relative flex-1 min-h-11 overflow-hidden rounded-[7px] outline-none transition-all duration-[1000ms] ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal)]"
              style={{
                opacity: !tilesIn ? 0 : isDimmed ? 0.12 : 1,
                transform: !tilesIn
                  ? "translateY(14px)"
                  : isPicked
                    ? "scale(1.02)"
                    : "scale(1)",
                transitionDelay: !tilesIn ? `${i * 140}ms` : "0ms",
                boxShadow: "0 16px 42px rgba(0,0,0,0.34)",
              }}
            >

              <SceneCanvas source={sceneSource(renderedScene)} />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.08) 36%, rgba(0,0,0,0.10) 62%, rgba(0,0,0,0.72) 100%)",
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px"
                style={{ background: "color-mix(in oklab, var(--ivory) 18%, transparent)" }}
              />
              <span
                className="absolute inset-x-0 bottom-5 z-10 block px-5 text-center text-[color:var(--ivory)] transition-all duration-[1500ms]"
                style={{
                  fontFamily: "'Montserrat', system-ui, sans-serif",
                  fontSize: "16px",
                  fontWeight: 700,
                  lineHeight: 1.18,
                  letterSpacing: "0",
                  textShadow: "0 2px 22px rgba(0,0,0,0.86)",
                  opacity: showHints ? 0.94 : 0,
                  transform: showHints ? "translateY(0)" : "translateY(8px)",
                }}
              >
                {tt(opt.hintKey, locale)}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}


function ProgressiveBuildPreview({
  day,
  region,
  locale,
  profile,
  prediction,
  activeStopIndex,
  dense = false,
}: {
  day: ComposedDay;
  region: RegionKey;
  locale: DriftLocale;
  profile?: DriftProfile;
  prediction?: ReturnType<typeof derivePrediction>;
  activeStopIndex: number;
  /** Set when the active chapter renders 3+ choice cards.
   *  Pairs with the `@media (max-height: 719.98px)` rule in styles.css. */
  dense?: boolean;
}) {
  const visibleStops = Math.max(1, Math.min(day.stops.length, activeStopIndex + 1));
  const previewStops = day.stops.slice(0, visibleStops);
  const mapStops = previewStops.map((cs, i) => ({
    key: cs.stop.id,
    region_key: region,
    label: cs.stop.name,
    blurb: cs.stop.blurb ?? null,
    tag: null,
    lat: cs.stop.coords.lat,
    lng: cs.stop.coords.lng,
    duration_minutes: cs.stop.dwellMin,
    driveMinutesFromPrev: i === 0 ? 0 : cs.driveFromPrev,
  }));
  const origin = REGION_ORIGIN[region];
  const last = previewStops[previewStops.length - 1]?.stop;
  if (!last || !origin) return null;

  const signals = [
    labelValue(profile?.companions, locale),
    labelValue(profile?.style, locale),
    labelValue(profile?.energy, locale),
  ].filter(Boolean).slice(0, 2).join(" · ");
  const confidencePct = Math.round((prediction?.revealConfidence ?? 0) * 100);

  return (
    <div
      // A11y: expose as a named live region so screen readers announce
      // itinerary updates as the day composes itself; `polite` so it
      // never interrupts the user's current choice interaction.
      role="region"
      aria-label={tt("build.region_label", locale)}
      aria-live="polite"
      className={`studio-build-preview${dense ? " is-dense" : ""} absolute inset-x-3 bottom-3 z-30 overflow-hidden rounded-[7px] motion-safe:animate-[fade-in_0.55s_ease-out_both]`}
      style={{ height: 84, background: "color-mix(in oklab, var(--charcoal) 72%, transparent)", boxShadow: "0 18px 45px rgba(0,0,0,0.42)", border: "1px solid color-mix(in oklab, var(--ivory) 16%, transparent)" }}
    >


      <div className="grid grid-cols-[96px_1fr] items-stretch">
        <div className="relative h-[84px] overflow-hidden">
          <Suspense fallback={<div className="h-full w-full bg-[color:var(--sand)]" />}>
            <BuilderMap stops={mapStops} regionCenter={{ lat: origin.lat, lng: origin.lng }} regionKey={region} emotionalMode activeStopIndex={mapStops.length - 1} chrome={false} locale={locale} />
          </Suspense>
        </div>
        <div className="relative px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[9px] uppercase" style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, letterSpacing: "0.2em", color: "var(--gold)" }}>
                {tt("build.eyebrow", locale)}{confidencePct > 0 ? ` · ${confidencePct}%` : ""}
              </p>
              <p className="truncate" style={{ fontFamily: "'Montserrat', system-ui, sans-serif", fontSize: "12.5px", fontWeight: 700, lineHeight: 1.2, color: "var(--ivory)", letterSpacing: 0 }}>
                {last.name}
              </p>
              {signals && (
                <p className="mt-0.5 truncate" style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: "9.5px", lineHeight: 1.25, color: "color-mix(in oklab, var(--gold) 72%, var(--ivory))" }}>
                  {signals}
                </p>
              )}
            </div>
            <Link
              to="/builder"
              search={{ legacy: "stepper" } as never}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--gold)]/55 bg-[color:var(--gold)]/12 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.18em] font-semibold text-[color:var(--gold)] transition-colors hover:bg-[color:var(--gold)]/22 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold)]"
              aria-label="Continue this draft in the full builder"
            >
              Reserve →
            </Link>
          </div>
          {/* progressive dots — visible steps composed so far */}
          <div className="mt-1 flex items-center gap-1" aria-hidden="true">
            {Array.from({ length: Math.min(day.stops.length, 6) }, (_, i) => (
              <span
                key={i}
                className="block h-[2px] flex-1 rounded-full"
                style={{
                  background:
                    i < visibleStops
                      ? "var(--gold)"
                      : "color-mix(in oklab, var(--ivory) 22%, transparent)",
                  transition: "background 360ms ease",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
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
  prediction,
  locale,
  onExit,
}: {
  profile: DriftProfile;
  confidence: ConfidenceMap;
  prediction?: ReturnType<typeof derivePrediction>;
  locale: DriftLocale;
  onExit?: () => void;
}) {
  const region = useMemo(() => pickRegion(profile as ComposerProfile), [profile]);
  const day = useMemo(
    () => composeDay(profile as ComposerProfile, region, {
      confidence,
      tonalRegister: prediction?.tonalRegister,
      intensityPreference: prediction?.intensity,
    }),
    [profile, region, confidence, prediction?.tonalRegister, prediction?.intensity],
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
        // Predictive + i18n hints — tone-only, never invents facts.
        locale,
        tonalRegister: prediction?.tonalRegister,
        intensityPreference: prediction?.intensity,
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
            tonalRegister: prediction?.tonalRegister,
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
  }, [reveal, profile, locale, prediction?.tonalRegister, prediction?.intensity]);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2400);
    return () => window.clearTimeout(t);
  }, []);

  // Drive map highlight to follow the story arc — each line illuminates
  // the corresponding stop on the map, so words and place breathe together.
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);
  useEffect(() => {
    if (!ready || day.stops.length === 0) return;
    const arcLen = serverPayload?.story.arc?.length ?? 0;
    const lineCount = arcLen > 1 ? arcLen - 1 : 0; // last arc line = longing pull, no specific stop
    if (lineCount === 0) return;
    const stopCount = day.stops.length;
    const timers: number[] = [];
    for (let i = 0; i < lineCount; i++) {
      const stopIdx = Math.min(stopCount - 1, Math.round((i / Math.max(1, lineCount - 1)) * (stopCount - 1)));
      timers.push(
        window.setTimeout(() => setActiveStopIndex(stopIdx), 900 + i * 1600),
      );
    }
    timers.push(
      window.setTimeout(() => setActiveStopIndex(null), 900 + lineCount * 1600 + 2400),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [ready, serverPayload?.story.arc, day.stops.length]);


  const lead = serverPayload?.story.microStory ?? localLead;
  const arc = serverPayload?.story.arc ?? [];
  const heroLine = serverPayload?.story.hero;
  const ctaBook = locale === "en" ? tt("cta.book", locale) : (serverPayload?.cta.book ?? tt("cta.book", locale));
  const ctaSave = locale === "en" ? tt("cta.save", locale) : (serverPayload?.cta.save ?? tt("cta.save", locale));
  const ctaRefine = locale === "en" ? tt("cta.refine", locale) : (serverPayload?.cta.refine ?? tt("cta.refine", locale));

  // Contextual WhatsApp message — optional, soft, never primary (per Bible).
  // Threads the user's actual profile into a hand-written-feeling intro so the
  // local on the other end already has context before they answer.
  const waMessage = useMemo(() => {
    const lines: string[] = [tt("wa.intro", locale)];
    if (profile.name) lines.push(tt("wa.with_name", locale).replace("{name}", profile.name));
    if (profile.pickup) {
      const regionLabel =
        profile.pickup === "lisbon" ? "Lisboa"
          : profile.pickup === "centro" ? "Centro"
          : "Alentejo";
      lines.push(tt("wa.region", locale).replace("{region}", regionLabel));
    }
    if (profile.companions) {
      const companionsMap: Record<string, { pt: string; en: string }> = {
        solo: { pt: "sozinho(a)", en: "solo" },
        couple: { pt: "a dois", en: "a couple" },
        family: { pt: "em família", en: "family" },
        group: { pt: "em grupo", en: "a group" },
      };
      const c = companionsMap[profile.companions];
      if (c) lines.push(tt("wa.companions", locale).replace("{companions}", locale === "en" ? c.en : c.pt));
    }
    lines.push("");
    lines.push(tt("wa.closing", locale));
    return lines.join("\n");
  }, [profile, locale]);
  const ctaWhatsapp = tt("cta.whatsapp", locale);

  // Map stops in the shape BuilderMap expects.
  const mapStops = useMemo(
    () =>
      day.stops.map((cs, i) => ({
        key: cs.stop.id,
        region_key: region,
        label: cs.stop.name,
        blurb: cs.stop.blurb ?? null,
        tag: null,
        lat: cs.stop.coords.lat,
        lng: cs.stop.coords.lng,
        duration_minutes: cs.stop.dwellMin,
        driveMinutesFromPrev: i === 0 ? 0 : cs.driveFromPrev,
      })),
    [day.stops, region],
  );
  const regionCenter = useMemo(() => {
    const o = REGION_ORIGIN[region];
    return o ? { lat: o.lat, lng: o.lng } : null;
  }, [region]);

  const driveHours = Math.floor(day.totals.driveMin / 60);
  const driveMins = day.totals.driveMin % 60;
  const driveLabel =
    driveHours > 0 ? `${driveHours}h${String(driveMins).padStart(2, "0")}` : `${driveMins}min`;

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-black">
      <div className="relative h-[54vh] min-h-[340px] w-full overflow-hidden">
        {mapStops.length > 0 && regionCenter ? (
          <Suspense fallback={<SceneVideo scene={heroScene} />}>
            <BuilderMap stops={mapStops} regionCenter={regionCenter} regionKey={region} emotionalMode activeStopIndex={activeStopIndex} locale={locale} />
          </Suspense>
        ) : (
          <SceneVideo scene={heroScene} />
        )}
        <Vignette stronger />
        <div className="absolute inset-x-0 bottom-8 z-20 px-6 pointer-events-none">
          <p
            className="mx-auto mb-3 text-center text-[9.5px] uppercase text-[color:var(--gold)]"
            style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, letterSpacing: "0.2em" }}
          >
            {tt("reveal.map_label", locale)}
          </p>
          <h2
            className="mx-auto max-w-[15ch] text-center text-[color:var(--ivory)]"
            style={{
              fontFamily: "'Montserrat', system-ui, sans-serif",
              fontSize: "30px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "0",
              textShadow: "0 2px 34px rgba(0,0,0,0.9)",
              opacity: 0.98,
            }}
          >
            {heroLine ?? tName("reveal.hero_fallback", locale, profile.name)}
          </h2>
        </div>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label={tt("ui.exit", locale)}
            className="absolute top-4 left-4 z-30 h-6 w-6 rounded-full bg-[color:var(--ivory)]/15 hover:bg-[color:var(--ivory)]/30 transition-colors"
          />
        )}
      </div>

      <div
        className="relative bg-[color:var(--ivory)] px-5 pt-12 pb-16 transition-opacity duration-[1400ms]"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <p
          className="text-center text-[10.5px] uppercase mb-2"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: "0.22em",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          {tName("reveal.eyebrow", locale, profile.name)}
        </p>
        <p
          className="text-center text-[9.5px] uppercase mb-6"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: "0.28em",
            color: "var(--gold)",
            fontWeight: 600,
          }}
        >
          {tt("reveal.signed_by", locale)}
        </p>
        <p className="mx-auto mb-4 max-w-[34ch] text-center italic" style={{ fontFamily: "Georgia, serif", fontSize: "17px", lineHeight: 1.55, color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}>
          {lead}
        </p>
        <p
          className="text-center mb-6"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "12px",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          {day.stops.length} {tt("reveal.stops", locale)} · {driveLabel} {tt("reveal.road", locale)} · {tt("reveal.departure", locale)} {day.originLabel}
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

        {/* Story arc — 3-4 chained editorial lines, fade-in cascade.
            Last line = longing pull: serif italic, larger, gold. */}
        {arc.length > 0 && (
          <div className="mb-10 mx-auto max-w-[34ch] space-y-5 text-center">
            {arc.map((line, i) => {
              const isPull = i === arc.length - 1 && arc.length > 1;
              return (
                <p
                  key={i}
                  className="motion-safe:animate-[fade-in_0.9s_ease-out_both]"
                  style={{
                    fontFamily: isPull
                      ? "Georgia, 'Times New Roman', serif"
                      : "'Inter', system-ui, sans-serif",
                    fontStyle: isPull ? "italic" : "normal",
                    fontSize: isPull ? "25px" : "15px",
                    fontWeight: isPull ? 400 : 500,
                    lineHeight: isPull ? 1.34 : 1.7,
                    letterSpacing: "0",
                    color: isPull
                      ? "var(--gold)"
                      : "color-mix(in oklab, var(--charcoal) 76%, transparent)",
                    marginTop: isPull ? "10px" : undefined,
                    animationDelay: `${700 + i * 360}ms`,
                  }}
                >
                  {line}
                </p>
              );
            })}
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
            {tt("reveal.no_day", locale)}
          </p>
        ) : (
          <ol className="space-y-3">
            {day.stops.map((cs, i) => {
              const s = cs.stop;
              const openLabel = s.hours
                ? `${s.hours.open}–${s.hours.close}`
                : tt("reveal.open_all_day", locale);
              return (
                <li
                  key={s.id}
                  className="relative pl-9 pr-4 py-4 rounded-[7px] motion-safe:animate-[fade-in_0.7s_ease-out_both]"
                  style={{
                    background: "color-mix(in oklab, var(--ivory) 86%, white)",
                    boxShadow:
                      "0 1px 0 color-mix(in oklab, var(--charcoal) 9%, transparent), 0 14px 34px color-mix(in oklab, var(--charcoal) 7%, transparent)",
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
                      background: "var(--charcoal)",
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
                      {cs.driveFromPrev}{tt("reveal.drive_from_prev", locale).startsWith("min") ? "" : " "}{tt("reveal.drive_from_prev", locale)}
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

        {anchorTour && (
          <RevealInvestment
            anchor={anchorTour}
            companions={profile.companions}
            locale={locale}
            stopsCount={day.stops.length}
          />
        )}

        {anchorTour && (
          <SmartRecommendations
            anchor={anchorTour}
            profile={{
              pickup: profile.pickup,
              radius: profile.radius,
              energy: profile.energy,
              style: profile.style,
            }}
            locale={locale}
          />
        )}

        <div className="mt-10 flex flex-col items-center gap-4">

          {anchorTour ? (
            <Link
              to="/tours/$tourId"
              params={{ tourId: anchorTour.id }}
              onClick={() => void recordDriftEvent("cta_book", { meta: { tourId: anchorTour.id } })}
              className="inline-flex min-h-11 items-center justify-center rounded-[6px] px-6 py-3 text-[12px] uppercase"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 700,
                letterSpacing: "0.18em",
                background: "var(--teal)",
                color: "var(--ivory)",
                boxShadow: "0 16px 34px color-mix(in oklab, var(--teal) 28%, transparent)",
              }}
            >
              {ctaBook} →
            </Link>
          ) : (
            <Link
              to="/contact"
              onClick={() => void recordDriftEvent("cta_refine")}
              className="inline-flex min-h-11 items-center justify-center rounded-[6px] border px-6 py-3 text-[12px] uppercase"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 700,
                letterSpacing: "0.18em",
                borderColor: "color-mix(in oklab, var(--gold) 55%, transparent)",
                color: "var(--charcoal)",
              }}
            >
              {ctaRefine} →
            </Link>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
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
            <a
              href={builderWaHref(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void recordDriftEvent("cta_whatsapp", { meta: { stage: "reveal" } })}
              className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.22em] uppercase"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "color-mix(in oklab, var(--teal) 88%, transparent)",
              }}
            >
              <MessageCircle size={13} strokeWidth={1.6} aria-hidden="true" />
              {ctaWhatsapp}
            </a>
            <Link
              to="/experiences"
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "color-mix(in oklab, var(--charcoal) 64%, transparent)",
              }}
            >
              {tt("cta.explore", locale)}
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
    return `${who}a mesa certa não faz ruído.`;
  }
  if (p.social === "shared" || p.companions === "group") {
    return `${who}há uma sala pronta para receber o vosso ritmo.`;
  }
  if (p.style === "coast") {
    return `${who}o Atlântico abre espaço à medida certa.`;
  }
  if (p.style === "wine") {
    return `${who}a vinha marca o compasso do dia.`;
  }
  if (p.style === "heritage") {
    return `${who}a pedra antiga guarda a entrada.`;
  }
  return `${who}já há um dia a ganhar forma.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────

function SceneVideo({ scene, tint }: { scene: Scene; tint?: string }) {
  return <SceneCanvas source={sceneSource(scene)} tint={tint} />;
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
  delay,
  hold,
  variant = "default",
}: {
  text: string;
  delay?: number;
  hold?: number;
  variant?: "default" | "opening" | "choice";
}) {
  void delay;
  void hold;
  const isOpening = variant === "opening";
  const isChoice = variant === "choice";
  return (
    <div
      key={`whisper-${text}`}
      className="absolute inset-x-0 z-[60] flex justify-center px-7 pointer-events-none"
      style={{
        animation: "whisperEnter 1400ms ease-out both",
        top: isChoice ? "10%" : isOpening ? "17%" : "18%",
      }}
    >
      <p
        className="text-center"
        style={{
          fontFamily: isOpening ? "Georgia, 'Times New Roman', serif" : "'Montserrat', system-ui, sans-serif",
          fontStyle: isOpening ? "italic" : "normal",
          fontSize: isChoice ? "27px" : isOpening ? "21px" : "25px",
          fontWeight: isOpening ? 400 : 700,
          lineHeight: isChoice ? 1.12 : isOpening ? 1.42 : 1.16,
          letterSpacing: "0",
          color: "var(--ivory)",
          maxWidth: isChoice ? "14ch" : isOpening ? "22ch" : "17ch",
          textShadow:
            "0 1px 2px rgba(0,0,0,0.94), 0 4px 30px rgba(0,0,0,0.82)",
          opacity: isOpening ? 0.95 : 0.98,
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


/**
 * AiWhisper — surfaces the personalized AI fragment produced by
 * composeStudioMoment. This is the visible proof of the predictive
 * engine: each traveller sees a different sensory line at a different
 * moment, threaded with their behavior, profile and stage. Auto-fades
 * after ~5.5s so it never blocks interaction. Reduced-motion safe.
 */
function AiWhisper({ text }: { text: string }) {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const t1 = window.setTimeout(() => setOpacity(0.92), 60);
    const t2 = window.setTimeout(() => setOpacity(0), 4800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-[26%] z-[55] flex justify-center px-8 transition-opacity duration-[1100ms] ease-out"
      style={{ opacity }}
    >
      <p
        className="text-center italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "15.5px",
          lineHeight: 1.55,
          letterSpacing: "0",
          color: "color-mix(in oklab, var(--ivory) 92%, var(--gold))",
          maxWidth: "24ch",
          textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 4px 28px rgba(0,0,0,0.78)",
        }}
      >
        {text}
      </p>
    </div>
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
