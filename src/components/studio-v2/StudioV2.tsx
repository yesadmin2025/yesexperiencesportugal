import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bookmark, ChevronDown, MessageCircle, X } from "lucide-react";

import {
  emptyProfile,
  deriveArchetype,
  type GroupProfile,
  type IntentAtmosphere,
  type PaceV2,
  type TravelerProfile,
} from "@/lib/studio-v2/profile";
import {
  revealFraming,
  storyAfterIntent,
  storyAfterPace,
  storyAfterGroup,
  storyFinalLines,
  tierLabel,
} from "@/lib/studio-v2/content";
import {
  MOOD_SCENES,
  PICKUP_CITIES,
  inferProfile,
  convictionLine,
  convictionScript,
  type SceneSignal,
} from "@/lib/studio-v2/intent-infer";
import { INTENT_IMAGE } from "@/lib/studio-v2/images";
import {
  designExperience,
  previewJourney,
  type DesignResult,
  type JourneyPreview,
} from "@/lib/studio-v2/engine";
import { fmtMinutes } from "@/components/builder/types";
import { type RefineStop } from "./RefineStage";
import { LivingItinerary } from "./LivingItinerary";
import { MapReveal } from "./MapReveal";
import { Postcard } from "./Postcard";
import { AmbientToggle } from "./AmbientToggle";
import { DriftScene } from "./scenes/DriftScene";
import { SensePairScene } from "./scenes/SensePairScene";
import { MicroFictionScene } from "./scenes/MicroFictionScene";
// NameBeat external component reserved for the upcoming name-capture beat.
// Currently the inline NameBeat() below remains the source of truth.
import { StoryOpener } from "./StoryOpener";
import { whatsappHref } from "@/components/WhatsAppFab";
import { INTENT_ATMOSPHERE, INTENT_OPTIONS } from "@/lib/studio-v2/content";
import { useServerFn } from "@tanstack/react-start";
import { createStudioSession } from "@/lib/studio-v2/sessions.functions";
import { composeRealItinerary } from "@/lib/studio-v2/itinerary.functions";
import { createCustomBookingDraft } from "@/lib/studio-v2/bookings.functions";
import { trackBuilderEvent } from "@/lib/builder-analytics";
import { ConversionStage } from "./conversion/ConversionStage";

// Kept for type-compat with helpers below that still reference it.
const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);
void BuilderMap;

interface StudioV2Props {
  onExit: () => void;
  /** Optional pre-filled profile (e.g. resuming a saved share token). */
  initialProfile?: TravelerProfile;
  /** When true, jumps straight to the reveal beat using initialProfile. */
  startAtReveal?: boolean;
}

// ─── cinematic flow ──────────────────────────────────────────────────────
//
// Studio Bible north star: interface progressively disappears, guided not
// asked, Portugal felt early, AI orchestrates. Eight quiz screens replaced
// by 5 momentos: opening silence → 3 mood scenes (signal capture, no
// questions) → 1 logistics card (pax + pickup only) → conviction → reveal.

type Beat =
  | "prologue"
  | "opening"
  | "mood-1"
  | "mood-2"
  | "mood-3"
  | "mood-rhythm"
  | "logistics"
  | "tastes"
  | "conviction"
  | "name"
  | "thinking"
  | "reveal";

const SEQUENCE: Beat[] = [
  "prologue", "opening", "mood-1", "mood-2", "mood-3", "mood-rhythm",
  "logistics", "tastes", "conviction", "name", "thinking", "reveal",
];

/** Confidence threshold (0–1). Below this, the adaptive Rhythm scene fires
 *  to disambiguate intent before we commit to a composition. */
const CONFIDENCE_FLOOR = 0.55;

const SESSION_KEY = "yes.studio-v2.session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Editorial one-liner per region — used in the postcard headline. */
function regionWhisper(region: string | null | undefined): string {
  if (!region) return "a private composition, shaped to your rhythm";
  const key = region.toLowerCase();
  if (key.includes("douro")) return "the Douro, slow light over terraced wine";
  if (key.includes("alentejo")) return "the Alentejo, long horizons and quiet tables";
  if (key.includes("arrabida") || key.includes("setubal"))
    return "Arrábida, the Atlantic close enough to taste";
  if (key.includes("sintra")) return "Sintra, granite and salt mist on the same breath";
  if (key.includes("lisbon") || key.includes("lisboa"))
    return "Lisbon, hidden streets after the crowds";
  if (key.includes("centro")) return "central Portugal, slow villages and stone light";
  if (key.includes("porto")) return "Porto, granite light and river-quiet cellars";
  return "a private composition, shaped to your rhythm";
}

interface PersistedSession {
  beatIndex: number;
  profile: TravelerProfile;
  signals: SceneSignal[];
  pax: number;
  pickup: string;
  savedAt: number;
}

function readPersistedSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PersistedSession;
    if (!s || typeof s.beatIndex !== "number") return null;
    if (Date.now() - s.savedAt > SESSION_TTL_MS) return null;
    if (s.beatIndex <= 0) return null;
    return s;
  } catch { return null; }
}

function clearPersistedSession() {
  try { window.localStorage.removeItem(SESSION_KEY); } catch { /* */ }
}

export function StudioV2({ onExit, initialProfile, startAtReveal }: StudioV2Props) {
  // Resume payload — read once on mount, before any state is initialized.
  const [resumable, setResumable] = useState<PersistedSession | null>(() =>
    !startAtReveal && !initialProfile ? readPersistedSession() : null,
  );
  const [beatIndex, setBeatIndex] = useState(() =>
    startAtReveal ? SEQUENCE.indexOf("reveal") : 0,
  );
  const [profile, setProfile] = useState<TravelerProfile>(() => initialProfile ?? emptyProfile());
  const [result, setResult] = useState<DesignResult | null>(() =>
    startAtReveal && initialProfile ? designExperience(initialProfile) : null,
  );
  const [signals, setSignals] = useState<SceneSignal[]>([]);
  const [pax, setPax] = useState(2);
  const [pickup, setPickup] = useState<string>("");

  const beat = SEQUENCE[beatIndex];
  const next = useCallback(() => {
    setBeatIndex((i) => Math.min(SEQUENCE.length - 1, i + 1));
  }, []);

  const onSceneSignal = useCallback((sig: SceneSignal) => {
    const updated = [...signals, sig];
    setSignals(updated);
    void trackBuilderEvent("studio_v2_predict_signal", {
      sceneId: sig.sceneId,
      tappedFragmentId: sig.tappedFragmentId,
      lingerMs: sig.lingerMs,
    });
    setBeatIndex((i) => {
      const current = SEQUENCE[i];
      // Adaptive Rhythm clarifier: only fire after mood-3 if confidence
      // hasn't reached the floor. Otherwise jump straight to logistics.
      if (current === "mood-3") {
        const provisional = inferProfile(updated, { pax, pickup: pickup || "Lisboa" });
        if (provisional.confidence >= CONFIDENCE_FLOOR) {
          return SEQUENCE.indexOf("logistics");
        }
      }
      return Math.min(SEQUENCE.length - 1, i + 1);
    });
  }, [signals, pax, pickup]);

  const onLogisticsSubmit = useCallback(() => {
    const { profile: p, confidence, topIntent } = inferProfile(signals, { pax, pickup });
    setProfile((prev) => ({ ...p, name: prev.name, ops: { ...p.ops, preferredDate: prev.ops?.preferredDate } }));
    void trackBuilderEvent("studio_v2_predict_signal", {
      stage: "intent_inferred",
      topIntent, confidence: Math.round(confidence * 100), pax, pickup,
    });
    next();
  }, [signals, pax, pickup, next]);

  const onTastesSubmit = useCallback((tastes: string[], extraWeights: Partial<Record<string, number>>) => {
    setProfile((prev) => ({
      ...prev,
      ops: { ...prev.ops, tastes },
      priorityWeights: { ...prev.priorityWeights, ...(extraWeights as TravelerProfile["priorityWeights"]) },
    }));
    next();
  }, [next]);

  const thinkingTimer = useRef<number | null>(null);
  useEffect(() => {
    if (beat !== "thinking") return;
    if (thinkingTimer.current) window.clearTimeout(thinkingTimer.current);
    // Longer pause — Layer 3 "ritmo": confidence reads as restraint, not lag.
    thinkingTimer.current = window.setTimeout(() => {
      const archetype = deriveArchetype(profile);
      const r = designExperience({ ...profile, archetype });
      setResult(r);
      setBeatIndex((i) => Math.min(SEQUENCE.length - 1, i + 1));
    }, 3400);
    return () => {
      if (thinkingTimer.current) window.clearTimeout(thinkingTimer.current);
    };
  }, [beat, profile]);

  const showChrome = beat !== "opening" && beat !== "reveal";

  const inferred = useMemo(() => {
    if (signals.length === 0) return null;
    return inferProfile(signals, { pax, pickup: pickup || "Lisboa" });
  }, [signals, pax, pickup]);

  // Persist session for "continue where you left off" — write after any
  // meaningful state change past the opening. Cleared on reveal.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (startAtReveal) return; // shared-token resume isn't local progress
    if (beat === "opening") return;
    if (beat === "reveal") { clearPersistedSession(); return; }
    const payload: PersistedSession = {
      beatIndex, profile, signals, pax, pickup, savedAt: Date.now(),
    };
    try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch { /* */ }
  }, [beat, beatIndex, profile, signals, pax, pickup, startAtReveal]);

  const onResume = useCallback(() => {
    const s = resumable;
    if (!s) return;
    setProfile(s.profile);
    setSignals(s.signals ?? []);
    setPax(s.pax ?? 2);
    setPickup(s.pickup ?? "");
    const safeBeat = SEQUENCE[s.beatIndex] === "thinking"
      ? SEQUENCE.indexOf("conviction")
      : s.beatIndex;
    setBeatIndex(Math.max(0, safeBeat));
    setResumable(null);
  }, [resumable]);

  const onDeclineResume = useCallback(() => {
    clearPersistedSession();
    setResumable(null);
  }, []);

  return (
    <div
      className="studio-v2 relative min-h-screen w-full overflow-x-hidden"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      <header className="absolute right-0 top-0 z-30 flex items-center gap-1.5 px-4 py-4 sm:px-6">
        {/* Ambient sound — opt-in, gold/ivory; Layer 3 */}
        <div
          className="rounded-full"
          style={{
            background: showChrome
              ? "color-mix(in oklab, var(--ivory) 70%, transparent)"
              : "color-mix(in oklab, var(--charcoal) 28%, transparent)",
            backdropFilter: "blur(10px)",
          }}
        >
          <AmbientToggle />
        </div>
        <button
          onClick={onExit}
          aria-label="Exit studio"
          className="grid h-11 w-11 place-items-center rounded-full transition focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:outline-none"
          style={{
            background: showChrome
              ? "color-mix(in oklab, var(--ivory) 70%, transparent)"
              : "color-mix(in oklab, var(--charcoal) 28%, transparent)",
            color: showChrome ? "var(--charcoal)" : "var(--ivory)",
            backdropFilter: "blur(10px)",
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main key={beat} className="studio-v2-reveal relative z-10">
        {beat === "opening" && (
          <OpeningScene
            onTap={next}
            resumable={resumable}
            onResume={onResume}
            onDeclineResume={onDeclineResume}
          />
        )}
        {beat === "mood-1" && <DriftScene        scene={MOOD_SCENES[0]} index={1} onSignal={onSceneSignal} />}
        {beat === "mood-2" && <SensePairScene    scene={MOOD_SCENES[1]} index={2} onSignal={onSceneSignal} />}
        {beat === "mood-3" && <MicroFictionScene scene={MOOD_SCENES[2]} index={3} onSignal={onSceneSignal} />}
        {beat === "mood-rhythm" && (
          <MicroFictionScene scene={MOOD_SCENES[3]} index={4} onSignal={onSceneSignal} />
        )}
        {beat === "logistics" && (
          <LogisticsCard
            pax={pax} setPax={setPax}
            pickup={pickup} setPickup={setPickup}
            preferredDate={profile.ops?.preferredDate ?? ""}
            setPreferredDate={(d) => setProfile((p) => ({ ...p, ops: { ...p.ops, preferredDate: d || undefined } }))}
            onSubmit={onLogisticsSubmit}
          />
        )}
        {beat === "tastes" && (
          <TastesPicker
            initial={profile.ops?.tastes ?? []}
            onSubmit={onTastesSubmit}
          />
        )}
        {beat === "conviction" && inferred && (
          <ConvictionMoment
            topIntent={inferred.topIntent}
            line={convictionLine(
              inferred.topIntent,
              inferred.profile.pace ?? "balanced",
              pickup || "Lisboa",
              pax,
            )}
            script={convictionScript(
              signals,
              inferred.topIntent,
              inferred.profile.pace ?? "balanced",
              pickup || "Lisboa",
              pax,
            )}
            onContinue={next}
          />
        )}
        {beat === "name" && (
          <NameBeat
            initial={profile.name ?? ""}
            onSubmit={(name) => {
              setProfile((p) => ({ ...p, name: name.trim().slice(0, 40) }));
              next();
            }}
            onSkip={() => {
              setProfile((p) => ({ ...p, name: undefined }));
              next();
            }}
          />
        )}
        {beat === "thinking" && (
          <ThinkingBeat topIntent={inferred?.topIntent ?? "relaxed_scenic"} />
        )}

        {beat === "reveal" && result && (
          <section
            key="reveal"
            className="relative mx-auto w-full max-w-3xl px-5 pb-28 pt-10 sm:px-8 sm:pt-14"
          >
            <RevealStory profile={profile} region={result.region} signals={signals} />
            <Reveal result={result} />
          </section>
        )}
      </main>
    </div>
  );
}

// Suppress "unused" warnings for retained legacy types/helpers.
void previewJourney; void emptyProfile;

// ─── opening scene — editorial cold open ────────────────────────────────

function OpeningScene({
  onTap,
  resumable,
  onResume,
  onDeclineResume,
}: {
  onTap: () => void;
  resumable?: PersistedSession | null;
  onResume?: () => void;
  onDeclineResume?: () => void;
}) {
  const [stage, setStage] = useState(0); // 0 silence, 1 eyebrow, 2 phrase, 3 hint
  useEffect(() => {
    const t1 = window.setTimeout(() => setStage(1), 700);
    const t2 = window.setTimeout(() => setStage(2), 1700);
    const t3 = window.setTimeout(() => setStage(3), 3400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, []);

  // When a resume card is shown, suppress the full-bleed tap-to-begin so the
  // user has to make a deliberate choice (resume vs. start fresh).
  const showResume = !!resumable;

  return (
    <div className="studio-v2-grain studio-v2-vignette relative block h-[100svh] w-full overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={INTENT_IMAGE.coastal_cinematic.src}
          alt={INTENT_IMAGE.coastal_cinematic.alt}
          className="studio-v2-kenburns absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.88) contrast(1.05) brightness(0.92)" }}
        />
      </div>

      {/* Full-bleed tap-to-begin layer — sits behind editorial overlays so
          a tap anywhere advances, unless a resume card is shown. */}
      {!showResume && (
        <button
          type="button"
          onClick={onTap}
          aria-label="Begin"
          className="absolute inset-0 z-[1] block w-full bg-transparent focus-visible:outline-none"
        />
      )}

      {/* Top frame: brand mark + chapter */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
        <span
          className="text-[10px] uppercase tracking-[0.42em] transition-opacity duration-1000"
          style={{
            opacity: stage >= 1 ? 0.85 : 0,
            color: "var(--ivory)",
            fontWeight: 600,
          }}
        >
          YES · Portugal
        </span>
        <span
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.42em] transition-opacity duration-1000"
          style={{
            opacity: stage >= 1 ? 0.85 : 0,
            color: "color-mix(in oklab, var(--gold) 80%, var(--ivory))",
            fontWeight: 600,
          }}
        >
          <span className="studio-v2-rule" /> 00 / Arrival
        </span>
      </div>

      {/* Bottom-left editorial: phrase + author line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pb-[12vh] sm:px-10 sm:pb-[14vh]">
        <p
          className="mb-5 text-[10px] uppercase tracking-[0.42em] transition-opacity duration-1000"
          style={{
            opacity: stage >= 1 ? 0.85 : 0,
            color: "color-mix(in oklab, var(--gold) 80%, var(--ivory))",
            fontWeight: 600,
          }}
        >
          Composed for you
        </p>
        <h1
          className="text-[34px] leading-[1.04] sm:text-[52px] transition-all duration-[1400ms]"
          style={{
            opacity: stage >= 2 ? 1 : 0,
            transform: stage >= 2 ? "translateY(0)" : "translateY(14px)",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontWeight: 400,
            color: "var(--ivory)",
            maxWidth: "16ch",
            textShadow: "0 2px 28px rgba(0,0,0,0.35)",
            letterSpacing: "-0.005em",
          }}
        >
          Let instinct<br/>guide the way.
        </h1>

        {!showResume && (
          <div
            className="mt-10 flex items-center gap-4 transition-opacity duration-1000"
            style={{ opacity: stage >= 3 ? 1 : 0 }}
          >
            <span
              className="studio-v2-tap-indicator inline-block h-7 w-px"
              style={{ background: "color-mix(in oklab, var(--gold) 80%, var(--ivory))" }}
            />
            <span
              className="text-[10.5px] uppercase tracking-[0.36em]"
              style={{ color: "color-mix(in oklab, var(--ivory) 80%, transparent)", fontWeight: 600 }}
            >
              tap to begin
            </span>
          </div>
        )}
      </div>

      {/* Resume card — Layer 3 "continue where you left off". Editorial,
          restrained, gold rule + two clear choices. Sits above the tap layer. */}
      {showResume && (
        <div className="absolute inset-x-0 bottom-[18vh] z-20 flex justify-center px-6 sm:px-10">
          <div
            className="w-full max-w-[34rem] rounded-[2px] border px-6 py-6 text-center"
            style={{
              borderColor: "color-mix(in oklab, var(--gold) 40%, transparent)",
              background: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 700ms cubic-bezier(.22,.61,.36,1), transform 700ms cubic-bezier(.22,.61,.36,1)",
            }}
          >
            <p
              className="text-[10.5px] uppercase tracking-[0.36em]"
              style={{ color: "color-mix(in oklab, var(--gold) 85%, var(--ivory))", fontWeight: 700 }}
            >
              Welcome back
            </p>
            <p
              className="mt-3 text-[18px] leading-[1.3] sm:text-[20px]"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                color: "var(--ivory)",
              }}
            >
              Your day was almost composed.
            </p>
            <div className="mt-5 flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="inline-flex h-11 min-w-[18rem] items-center justify-center gap-2 px-6 text-[11.5px] uppercase tracking-[0.32em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{
                  background: "color-mix(in oklab, var(--gold) 90%, var(--ivory))",
                  color: "var(--charcoal)",
                  fontWeight: 700,
                }}
              >
                Continue where you left off
              </button>
              <button
                type="button"
                onClick={() => { onDeclineResume?.(); onTap(); }}
                className="h-10 px-4 text-[10.5px] uppercase tracking-[0.32em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{
                  color: "color-mix(in oklab, var(--ivory) 78%, transparent)",
                  fontWeight: 600,
                }}
              >
                Start a new story
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── mood scene — magazine spread, dominant + inset alternative ────────

function MoodSceneView({
  scene, onSignal,
}: {
  scene: (typeof MOOD_SCENES)[number];
  onSignal: (sig: SceneSignal) => void;
}) {
  const startedAt = useRef<number>(Date.now());
  const [dominantIdx, setDominantIdx] = useState<0 | 1>(0);
  useEffect(() => {
    startedAt.current = Date.now();
    setDominantIdx(0);
  }, [scene.id]);

  const sceneNum = MOOD_SCENES.findIndex((s) => s.id === scene.id) + 1;
  const sceneRoman = ["I", "II", "III"][sceneNum - 1] ?? String(sceneNum);
  const dominant = scene.fragments[dominantIdx];
  const alternative = scene.fragments[dominantIdx === 0 ? 1 : 0];

  const choose = (fragmentId: string) => {
    onSignal({
      sceneId: scene.id,
      tappedFragmentId: fragmentId,
      lingerMs: Date.now() - startedAt.current,
    });
  };

  return (
    <section
      key={scene.id}
      className="studio-v2-grain studio-v2-vignette relative h-[100svh] w-full overflow-hidden"
      aria-label={scene.eyebrow}
    >
      {/* Dominant cinematic image — tap to choose */}
      <button
        type="button"
        onClick={() => choose(dominant.id)}
        aria-label={dominant.whisper}
        className="absolute inset-0 block w-full overflow-hidden text-left focus-visible:outline-none"
      >
        <img
          key={`${scene.id}-${dominant.id}`}
          src={dominant.image}
          alt={dominant.alt}
          className="studio-v2-kenburns absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.9) contrast(1.04) brightness(0.94)" }}
        />
      </button>

      {/* Top frame: chapter + progress */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
        <span
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.42em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--ivory))", fontWeight: 600 }}
        >
          <span className="studio-v2-rule" /> Chapter {sceneRoman} · {scene.eyebrow}
        </span>
        <span className="flex items-center gap-1.5" aria-hidden>
          {MOOD_SCENES.map((s, i) => (
            <span
              key={s.id}
              className="block h-px transition-all duration-500"
              style={{
                width: i + 1 === sceneNum ? 22 : 10,
                background: i + 1 <= sceneNum
                  ? "color-mix(in oklab, var(--gold) 85%, var(--ivory))"
                  : "color-mix(in oklab, var(--ivory) 40%, transparent)",
              }}
            />
          ))}
        </span>
      </div>

      {/* Center-left whisper over dominant image */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[28vh] z-10 px-6 sm:px-10">
        <p
          key={`${scene.id}-${dominant.id}-whisper`}
          className="studio-v2-reveal text-[26px] leading-[1.18] sm:text-[34px]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            color: "var(--ivory)",
            maxWidth: "16ch",
            textShadow: "0 2px 24px rgba(0,0,0,0.45)",
          }}
        >
          {dominant.whisper}
        </p>
      </div>

      {/* Bottom dock: choose dominant + inset for the alternative */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-7 sm:px-10 sm:pb-10">
        <div className="flex items-end gap-3">
          {/* Primary: confirm dominant */}
          <button
            type="button"
            onClick={() => choose(dominant.id)}
            className="studio-v2-sheen group flex-1 rounded-[2px] px-5 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "color-mix(in oklab, var(--charcoal) 78%, transparent)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid color-mix(in oklab, var(--gold) 35%, transparent)",
              color: "var(--ivory)",
              minHeight: 56,
            }}
          >
            <span
              className="block text-[9.5px] uppercase tracking-[0.34em]"
              style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--ivory))", fontWeight: 600 }}
            >
              choose this
            </span>
            <span
              className="mt-1 flex items-center justify-between gap-2 text-[12.5px] uppercase tracking-[0.22em]"
              style={{ fontWeight: 600 }}
            >
              <span className="truncate">continue</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[3px]" aria-hidden />
            </span>
          </button>

          {/* Inset: switch to alternative */}
          <button
            type="button"
            onClick={() => setDominantIdx(dominantIdx === 0 ? 1 : 0)}
            aria-label={`Switch to: ${alternative.whisper}`}
            className="studio-v2-inset group relative w-[34%] max-w-[160px] overflow-hidden rounded-[2px] text-left transition-all focus-visible:outline-none focus-visible:ring-2"
            style={{ minHeight: 86 }}
          >
            <img
              src={alternative.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              style={{ filter: "saturate(0.85) brightness(0.82)" }}
              aria-hidden
            />
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--charcoal) 75%, transparent) 100%)" }}
            />
            <span className="relative flex h-full flex-col justify-between p-2.5">
              <span
                className="text-[8.5px] uppercase tracking-[0.32em]"
                style={{ color: "color-mix(in oklab, var(--gold) 85%, var(--ivory))", fontWeight: 600 }}
              >
                or
              </span>
              <span
                className="text-[11px] leading-[1.25]"
                style={{
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--ivory)",
                  textShadow: "0 1px 6px rgba(0,0,0,0.5)",
                }}
              >
                {alternative.whisper}
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}


// ─── logistics card — editorial pause, sand surface, gold detail ───────

function LogisticsCard({
  pax, setPax, pickup, setPickup, preferredDate, setPreferredDate, onSubmit,
}: {
  pax: number; setPax: (n: number) => void;
  pickup: string; setPickup: (s: string) => void;
  preferredDate: string; setPreferredDate: (d: string) => void;
  onSubmit: () => void;
}) {
  const ready = pickup.trim().length > 0;
  return (
    <section
      className="relative flex min-h-[100svh] w-full flex-col justify-center overflow-hidden"
      style={{ background: "var(--sand)" }}
    >
      {/* Ambient atmosphere wash + grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 80% 8%, color-mix(in oklab, var(--gold-soft) 55%, transparent) 0%, transparent 65%), radial-gradient(70% 50% at 0% 100%, color-mix(in oklab, var(--teal-2) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      <div className="studio-v2-grain absolute inset-0 pointer-events-none" aria-hidden />

      <div className="relative mx-auto w-full max-w-xl px-6 py-14 sm:px-8">
        <div className="studio-v2-reveal flex items-center gap-3">
          <span className="studio-v2-rule" />
          <span
            className="text-[10px] uppercase tracking-[0.42em]"
            style={{ color: "color-mix(in oklab, var(--gold) 78%, var(--charcoal))", fontWeight: 600 }}
          >
            Practicalities
          </span>
        </div>

        <h2
          className="studio-v2-reveal delay-1 mt-6 text-[30px] leading-[1.08] sm:text-[40px]"
          style={{
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: 700, letterSpacing: "-0.012em",
            color: "var(--charcoal)",
          }}
        >
          A few{" "}
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
            practical details
          </span>.
        </h2>

        <p
          className="studio-v2-reveal delay-2 mt-4 text-[14px] leading-[1.6]"
          style={{
            color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
            maxWidth: "32ch",
            fontStyle: "italic",
            fontFamily: "Georgia, serif",
          }}
        >
          So we can route the day around you — pickup, party size, and when.
        </p>

        {/* Pax — typographic numeral */}
        <div className="studio-v2-reveal delay-3 mt-12">
          <div className="flex items-baseline justify-between">
            <span
              className="text-[10px] uppercase tracking-[0.36em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
            >
              Guests
            </span>
            <span
              className="text-[10px] uppercase tracking-[0.32em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 40%, transparent)" }}
            >
              {pax === 1 ? "private" : pax <= 4 ? "intimate" : pax <= 8 ? "small group" : "group"}
            </span>
          </div>
          <div
            className="mt-2 flex items-center justify-between border-b pb-3"
            style={{ borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)" }}
          >
            <button
              type="button"
              onClick={() => setPax(Math.max(1, pax - 1))}
              aria-label="Decrease guests"
              className="grid h-11 w-11 place-items-center text-[22px] transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2"
              style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)", opacity: pax > 1 ? 0.8 : 0.3 }}
              disabled={pax <= 1}
            >−</button>
            <span
              className="tabular-nums leading-none"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 64,
                color: "var(--charcoal)",
                letterSpacing: "-0.02em",
              }}
            >
              {pax}
            </span>
            <button
              type="button"
              onClick={() => setPax(Math.min(20, pax + 1))}
              aria-label="Increase guests"
              className="grid h-11 w-11 place-items-center text-[22px] transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2"
              style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)", opacity: pax < 20 ? 0.8 : 0.3 }}
              disabled={pax >= 20}
            >+</button>
          </div>
        </div>

        {/* Pickup */}
        <div className="studio-v2-reveal delay-4 mt-10">
          <p
            className="mb-4 text-[10px] uppercase tracking-[0.36em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
          >
            Departing from
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {PICKUP_CITIES.map((c) => {
              const active = pickup === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPickup(c)}
                  className="group relative min-h-[44px] text-[15px] transition-all focus-visible:outline-none"
                  style={{
                    color: active ? "var(--charcoal)" : "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                    fontWeight: active ? 600 : 500,
                    fontFamily: "var(--font-sans, Inter), sans-serif",
                  }}
                >
                  {c}
                  <span
                    aria-hidden
                    className="absolute -bottom-1 left-0 h-px transition-all duration-500"
                    style={{
                      width: active ? "100%" : "0%",
                      background: "color-mix(in oklab, var(--gold) 85%, transparent)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred date — optional, helps us hold the day */}
        <div className="studio-v2-reveal delay-5 mt-10">
          <p
            className="mb-3 text-[10px] uppercase tracking-[0.36em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
          >
            When <span className="lowercase" style={{ letterSpacing: "0.18em" }}>(optional)</span>
          </p>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full max-w-[16rem] border-b bg-transparent py-2 text-[16px] focus:outline-none"
            style={{
              borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)",
              color: "var(--charcoal)",
              fontFamily: "var(--font-sans, Inter), sans-serif",
            }}
          />
        </div>

        {/* CTA */}
        <div className="mt-14 flex items-center gap-5">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!ready}
            className="studio-v2-sheen group inline-flex items-center gap-3 rounded-[2px] px-8 py-4 transition-all disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "var(--charcoal)",
              color: "var(--ivory)",
              minHeight: 56, minWidth: 240,
              fontFamily: "var(--font-sans, Inter), sans-serif",
              fontWeight: 600, fontSize: 12.5,
              letterSpacing: "0.26em", textTransform: "uppercase",
              border: "1px solid color-mix(in oklab, var(--gold) 30%, transparent)",
            }}
          >
            <span className="relative z-[1]">Continue</span>
            <ArrowRight
              className="relative z-[1] h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[4px]"
              aria-hidden
            />
          </button>
        </div>

        <p
          className="mt-6 text-[11px] italic"
          style={{
            fontFamily: "Georgia, serif",
            color: "color-mix(in oklab, var(--charcoal) 50%, transparent)",
          }}
        >
          A few details from you — the day is then designed around exactly what you want.
        </p>
      </div>
    </section>
  );
}

// ─── tastes picker — chip selection, lifts priorityWeights ──────────────

const TASTE_CHIPS: Array<{
  key: string;
  label: string;
  weights: Partial<Record<string, number>>;
}> = [
  { key: "wine",         label: "Wine & cellars",     weights: { wine_cellar: 70, vineyard_lunch: 60 } },
  { key: "sea",          label: "Coast & sea air",    weights: { coastal_scenery: 70, boat: 60 } },
  { key: "long_lunch",   label: "Long lunch",         weights: { vineyard_lunch: 70, local_gastronomy: 70 } },
  { key: "heritage",     label: "Heritage & stone",   weights: { heritage: 70, architecture: 60 } },
  { key: "hidden",       label: "Hidden villages",    weights: { hidden_villages: 70 } },
  { key: "photo",        label: "Photographic light", weights: { photography: 70 } },
  { key: "quiet",        label: "Quiet luxury",       weights: { quiet_luxury: 70, wellness: 50 } },
  { key: "boat",         label: "On the water",       weights: { boat: 80 } },
  { key: "local_food",   label: "Local table",        weights: { local_gastronomy: 80 } },
  { key: "sunset",       label: "Sunset hour",        weights: { coastal_scenery: 50, photography: 50 } },
];

function TastesPicker({
  initial, onSubmit,
}: {
  initial: string[];
  onSubmit: (tastes: string[], weights: Partial<Record<string, number>>) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const toggle = (k: string) =>
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k].slice(0, 6)));

  const submit = () => {
    const merged: Record<string, number> = {};
    for (const k of selected) {
      const chip = TASTE_CHIPS.find((c) => c.key === k);
      if (!chip) continue;
      for (const [pk, pv] of Object.entries(chip.weights)) {
        merged[pk] = Math.max(merged[pk] ?? 0, pv ?? 0);
      }
    }
    onSubmit(selected, merged);
  };

  return (
    <section
      className="relative flex min-h-[100svh] w-full flex-col justify-center overflow-hidden"
      style={{ background: "var(--ivory)" }}
    >
      <div className="studio-v2-grain absolute inset-0 pointer-events-none" aria-hidden />
      <div className="relative mx-auto w-full max-w-xl px-6 py-14 sm:px-8">
        <div className="studio-v2-reveal flex items-center gap-3">
          <span className="studio-v2-rule" />
          <span
            className="text-[10px] uppercase tracking-[0.42em]"
            style={{ color: "color-mix(in oklab, var(--gold) 78%, var(--charcoal))", fontWeight: 600 }}
          >
            Tastes
          </span>
        </div>

        <h2
          className="studio-v2-reveal delay-1 mt-6 text-[30px] leading-[1.08] sm:text-[40px]"
          style={{
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: 700, letterSpacing: "-0.012em",
            color: "var(--charcoal)",
          }}
        >
          What you{" "}
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
            actually love
          </span>.
        </h2>

        <p
          className="studio-v2-reveal delay-2 mt-4 text-[14px] leading-[1.6]"
          style={{
            color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
            maxWidth: "34ch",
            fontStyle: "italic",
            fontFamily: "Georgia, serif",
          }}
        >
          Pick up to six. Each one shapes the stops we choose — and what we leave aside.
        </p>

        <div className="studio-v2-reveal delay-3 mt-10 flex flex-wrap gap-2.5">
          {TASTE_CHIPS.map((c) => {
            const active = selected.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggle(c.key)}
                className="min-h-[44px] rounded-full border px-4 py-2 text-[14px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                style={{
                  borderColor: active
                    ? "var(--gold)"
                    : "color-mix(in oklab, var(--charcoal) 22%, transparent)",
                  background: active
                    ? "color-mix(in oklab, var(--gold) 18%, transparent)"
                    : "transparent",
                  color: active ? "var(--charcoal)" : "color-mix(in oklab, var(--charcoal) 75%, transparent)",
                  fontWeight: active ? 600 : 500,
                  fontFamily: "var(--font-sans, Inter), sans-serif",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="mt-12 flex items-center gap-5">
          <button
            type="button"
            onClick={submit}
            className="studio-v2-sheen group inline-flex items-center gap-3 rounded-[2px] px-8 py-4 transition-all focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "var(--charcoal)",
              color: "var(--ivory)",
              minHeight: 56, minWidth: 240,
              fontFamily: "var(--font-sans, Inter), sans-serif",
              fontWeight: 600, fontSize: 12.5,
              letterSpacing: "0.26em", textTransform: "uppercase",
              border: "1px solid color-mix(in oklab, var(--gold) 30%, transparent)",
            }}
          >
            <span className="relative z-[1]">
              {selected.length === 0 ? "Skip · compose my day" : "Compose my day"}
            </span>
            <ArrowRight
              className="relative z-[1] h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[4px]"
              aria-hidden
            />
          </button>
        </div>

        <p
          className="mt-6 text-[11px] italic"
          style={{
            fontFamily: "Georgia, serif",
            color: "color-mix(in oklab, var(--charcoal) 50%, transparent)",
          }}
        >
          Skip if nothing fits — we'll lean on the atmosphere we read from you.
        </p>
      </div>
    </section>
  );
}


// ─── conviction moment — the "we read you" reveal ───────────────────────

function ConvictionMoment({
  topIntent, line, script, onContinue,
}: {
  topIntent: IntentAtmosphere;
  line: { lead: string; body: string };
  script: import("@/lib/studio-v2/intent-infer").ConvictionScript;
  onContinue: () => void;
}) {
  // Stage choreography: each noticed line lands one after the other,
  // then the synthesis "reading", then the decision, then the CTA.
  // The single-line `line` prop is kept for analytics / fallback only.
  void line;
  const noticedCount = script.noticed.length;
  // Per-line delay (ms) so each "Toward X — past Y." gets its own beat.
  const PER_LINE = 900;
  const READING_DELAY = 400 + noticedCount * PER_LINE;
  const DECISION_DELAY = READING_DELAY + 900;
  const CTA_DELAY = DECISION_DELAY + 900;

  const [stage, setStage] = useState({ noticed: 0, reading: false, decision: false, cta: false });
  useEffect(() => {
    const timers: number[] = [];
    for (let i = 0; i < noticedCount; i++) {
      timers.push(window.setTimeout(() => {
        setStage((s) => ({ ...s, noticed: Math.max(s.noticed, i + 1) }));
      }, 350 + i * PER_LINE));
    }
    timers.push(window.setTimeout(() => setStage((s) => ({ ...s, reading: true })), READING_DELAY));
    timers.push(window.setTimeout(() => setStage((s) => ({ ...s, decision: true })), DECISION_DELAY));
    timers.push(window.setTimeout(() => setStage((s) => ({ ...s, cta: true })), CTA_DELAY));
    return () => { timers.forEach((t) => window.clearTimeout(t)); };
  }, [noticedCount, READING_DELAY, DECISION_DELAY, CTA_DELAY]);

  const img = INTENT_IMAGE[topIntent] ?? INTENT_IMAGE.relaxed_scenic;

  return (
    <section
      className="studio-v2-grain studio-v2-vignette relative min-h-[100svh] w-full overflow-hidden"
      aria-label="Your story so far"
    >
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={img.src}
          alt={img.alt}
          className="studio-v2-kenburns-alt absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.82) contrast(1.06) brightness(0.62)" }}
        />
        {/* extra bottom gradient for legibility of the layered text block */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[72%]"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 38%, rgba(0,0,0,0.72) 100%)",
          }}
        />
      </div>

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
        <span
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.42em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--ivory))", fontWeight: 600 }}
        >
          <span className="studio-v2-rule" /> Your story so far
        </span>
        <span
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.36em]"
          style={{ color: "color-mix(in oklab, var(--ivory) 75%, transparent)", fontWeight: 600 }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--gold)", animation: "studioV2Pulse 1.6s ease-in-out infinite" }}
          />
          Composing
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-[12vh] sm:px-10 sm:pb-[14vh]">
        {/* Noticed lines — one per scene, each a "Toward X — past Y." beat. */}
        <ul className="space-y-3 sm:space-y-4" aria-label="What you chose">
          {script.noticed.map((text, i) => {
            const shown = stage.noticed > i;
            return (
              <li
                key={i}
                className="transition-all duration-700"
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(10px)",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "var(--ivory)",
                  fontSize: "21px",
                  lineHeight: 1.32,
                  letterSpacing: "-0.005em",
                  textShadow: "0 2px 18px rgba(0,0,0,0.55)",
                  maxWidth: "26ch",
                }}
              >
                <span
                  aria-hidden
                  className="mr-3 inline-block align-middle"
                  style={{
                    width: shown ? 22 : 0,
                    height: 1,
                    background: "color-mix(in oklab, var(--gold) 85%, transparent)",
                    transition: "width 700ms cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
                {text}
              </li>
            );
          })}
        </ul>

        {/* Reading — the synthesis line, in sans, smaller, gold-tinted eyebrow. */}
        <div
          className="mt-8 transition-all duration-700"
          style={{
            opacity: stage.reading ? 1 : 0,
            transform: stage.reading ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.32em]"
            style={{
              color: "color-mix(in oklab, var(--gold) 85%, var(--ivory))",
              fontWeight: 600,
            }}
          >
            Where your story is going
          </p>
          <p
            className="mt-2 text-[14.5px] leading-[1.55]"
            style={{
              color: "color-mix(in oklab, var(--ivory) 94%, transparent)",
              maxWidth: "36ch",
              fontFamily: "var(--font-sans, Inter), sans-serif",
            }}
          >
            {script.reading}
          </p>
        </div>

        {/* Decision — the design move announced. */}
        <p
          className="mt-5 text-[14.5px] leading-[1.6] transition-all duration-700"
          style={{
            opacity: stage.decision ? 0.95 : 0,
            transform: stage.decision ? "translateY(0)" : "translateY(8px)",
            color: "color-mix(in oklab, var(--ivory) 90%, transparent)",
            maxWidth: "38ch",
            fontFamily: "var(--font-sans, Inter), sans-serif",
          }}
        >
          {script.decision}
        </p>

        <div
          className="mt-9 transition-opacity duration-700"
          style={{ opacity: stage.cta ? 1 : 0 }}
        >
          <button
            type="button"
            onClick={onContinue}
            className="studio-v2-sheen group inline-flex items-center gap-3 rounded-[2px] px-8 py-4 transition-all focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "color-mix(in oklab, var(--ivory) 96%, transparent)",
              color: "var(--charcoal)",
              minHeight: 56, minWidth: 220,
              fontFamily: "var(--font-sans, Inter), sans-serif",
              fontWeight: 600, fontSize: 12.5,
              letterSpacing: "0.26em", textTransform: "uppercase",
              border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
            }}
          >
            <span className="relative z-[1]">Show me the day</span>
            <ArrowRight
              className="relative z-[1] h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[4px]"
              aria-hidden
            />
          </button>
        </div>
      </div>
    </section>
  );
}




// ─── beat components ─────────────────────────────────────────────────────

function IntroBeat({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="relative min-h-[78vh] flex flex-col justify-center">
      {/* Cinematic ambient layer — subtle warm gold wash, no imagery, brand-safe */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-2rem] -top-10 -bottom-10"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 32%, color-mix(in oklab, var(--gold-soft) 45%, transparent) 0%, transparent 70%), radial-gradient(80% 50% at 100% 100%, color-mix(in oklab, var(--teal-2) 22%, transparent) 0%, transparent 65%)",
        }}
      />
      <p
        className="studio-v2-reveal relative text-[10.5px] uppercase tracking-[0.36em]"
        style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 600 }}
      >
        Portugal — designed for you
      </p>
      <h1
        className="studio-v2-reveal delay-1 relative mt-5 text-[36px] leading-[1.05] sm:text-[54px]"
        style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
      >
        Begin your Portugal{" "}
        <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
          story
        </span>
        .
      </h1>
      <p
        className="studio-v2-reveal delay-2 relative mt-5 text-[15px] leading-[1.55] max-w-[28ch]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
      >
        Each choice writes the next line. By the end you'll have a day shaped around you — map, rhythm and moments already in place.
      </p>
      <div className="studio-v2-reveal delay-3 relative mt-10">
        <ContinueButton label="Begin" onClick={onBegin} />
      </div>
      <p
        className="studio-v2-reveal delay-4 relative mt-6 text-[11px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
        }}
      >
        Designed with a local. Signed by you.
      </p>
    </section>
  );
}

function NameBeat({
  initial, onSubmit, onSkip,
}: { initial: string; onSubmit: (name: string) => void; onSkip: () => void }) {
  const [v, setV] = useState(initial);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <section className="min-h-[60vh] flex flex-col justify-center">
      <Eyebrow>Your story</Eyebrow>
      <Headline>What should we call this story?</Headline>
      <Helper>Optional. We use it only to personalise your written journey.</Helper>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}
        className="mt-6"
      >
        <input
          ref={inputRef}
          type="text"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="e.g. Maria"
          maxLength={40}
          className="w-full rounded-[2px] border bg-transparent px-4 py-4 text-[18px] focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderColor: "color-mix(in oklab, var(--charcoal) 20%, transparent)",
            color: "var(--charcoal)",
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: 600,
          }}
        />
        <div className="mt-6 flex items-center gap-4">
          <ContinueButton label={v.trim() ? "Continue" : "Begin"} onClick={() => onSubmit(v)} />
          {!v.trim() && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[11.5px] uppercase tracking-[0.28em] min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 rounded-[2px]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              skip
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function StoryBeat({ line, onSkip }: { line: string; onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Continue"
      className="block w-full min-h-[60vh] text-left focus-visible:outline-none"
    >
      <div className="flex min-h-[60vh] flex-col justify-center">
        <p
          className="studio-v2-reveal text-[10.5px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
        >
          Chapter
        </p>
        <p
          className="studio-v2-reveal delay-1 mt-5 text-[26px] leading-[1.2] sm:text-[34px]"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            color: "var(--charcoal)",
          }}
        >
          {line}
        </p>
        <p
          className="studio-v2-reveal delay-3 mt-8 text-[11px] uppercase tracking-[0.28em]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 45%, transparent)" }}
        >
          tap to continue
        </p>
      </div>
    </button>
  );
}

function InsightBeat({ line, onSkip }: { line: string; onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Continue"
      className="block w-full min-h-[55vh] text-left focus-visible:outline-none"
    >
      <div className="flex min-h-[55vh] flex-col justify-center">
        <div
          className="studio-v2-reveal inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
          </span>
          AI insight
        </div>
        <p
          className="studio-v2-reveal delay-1 mt-5 text-[20px] leading-[1.35] sm:text-[24px]"
          style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 500 }}
        >
          {line}
        </p>
      </div>
    </button>
  );
}

function RewardImageBeat({
  intent, onSkip,
}: { intent: IntentAtmosphere; onSkip: () => void }) {
  const atmo = INTENT_ATMOSPHERE[intent];
  const img = INTENT_IMAGE[intent];
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Continue"
      className="block w-full focus-visible:outline-none"
    >
      <figure
        className="studio-v2-reveal relative -mx-5 sm:-mx-8 overflow-hidden"
        style={{ height: "62vh", minHeight: 360, background: "var(--sand)" }}
      >
        <img
          src={img.src}
          alt={img.alt}
          width={1024}
          height={1024}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.92)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 40%, color-mix(in oklab, var(--charcoal) 70%, transparent) 100%)",
          }}
        />
        <figcaption className="absolute inset-x-5 bottom-6 sm:inset-x-8">
          <p
            className="text-[10.5px] uppercase tracking-[0.32em]"
            style={{ color: "color-mix(in oklab, var(--gold) 85%, var(--ivory))" }}
          >
            {INTENT_OPTIONS.find((o) => o.id === intent)?.label}
          </p>
          <p
            className="mt-2 text-[20px] leading-[1.3] sm:text-[26px]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              color: "var(--ivory)",
            }}
          >
            {atmo.whisper}
          </p>
        </figcaption>
      </figure>
      <p
        className="studio-v2-reveal delay-2 mt-4 text-[11px] uppercase tracking-[0.28em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
      >
        tap to continue
      </p>
    </button>
  );
}

function RewardMapBeat({
  preview, onSkip,
}: { preview: JourneyPreview; onSkip: () => void }) {
  return (
    <section className="studio-v2-reveal">
      <Eyebrow>Route taking shape</Eyebrow>
      <Headline>The map begins to draw itself.</Headline>
      <div
        className="relative mt-6 -mx-5 sm:-mx-8 overflow-hidden border-y"
        style={{
          height: "48vh",
          minHeight: 320,
          borderColor: "color-mix(in oklab, var(--charcoal) 8%, transparent)",
          background: "var(--sand)",
        }}
        aria-label="Live route preview"
      >
        <Suspense
          fallback={
            <div
              className="absolute inset-0 grid place-items-center text-[10.5px] uppercase tracking-[0.24em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            >
              shaping route…
            </div>
          }
        >
          <BuilderMap
            stops={preview.stops}
            regionCenter={preview.regionCenter}
            regionKey={preview.region}
            emotionalMode
            chrome={false}
          />
        </Suspense>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "linear-gradient(to top, color-mix(in oklab, var(--ivory) 92%, transparent) 8%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-3 left-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
          </span>
          {regionShort(preview.region)} · {preview.stops.length} stops
        </div>
      </div>
      <div className="mt-6">
        <ContinueButton label="Continue" onClick={onSkip} />
      </div>
    </section>
  );
}

function ThinkingBeat({ topIntent }: { topIntent: IntentAtmosphere }) {
  const img = INTENT_IMAGE[topIntent] ?? INTENT_IMAGE.relaxed_scenic;
  const lines = [
    "Matching atmosphere…",
    "Pacing the day…",
    "Tracing the route…",
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % lines.length), 750);
    return () => window.clearInterval(t);
  }, [lines.length]);
  return (
    <section
      className="studio-v2-grain studio-v2-vignette relative h-[100svh] w-full overflow-hidden"
      aria-label="Composing your day"
    >
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={img.src}
          alt=""
          className="studio-v2-kenburns absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.75) contrast(1.05) brightness(0.62) blur(2px)" }}
          aria-hidden
        />
      </div>
      <span className="studio-v2-scan" aria-hidden />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <span
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.42em]"
          style={{ color: "color-mix(in oklab, var(--gold) 85%, var(--ivory))", fontWeight: 600 }}
        >
          <span className="studio-v2-rule" /> Composing
        </span>
        <p
          key={idx}
          className="studio-v2-reveal mt-6 text-[22px] leading-[1.3] sm:text-[28px]"
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "var(--ivory)",
            textShadow: "0 2px 16px rgba(0,0,0,0.5)",
          }}
        >
          {lines[idx]}
        </p>
        <div className="mt-8 flex items-center gap-2">
          <ShimmerDot delay={0} />
          <ShimmerDot delay={140} />
          <ShimmerDot delay={280} />
        </div>
      </div>
    </section>
  );
}


function ShimmerDot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        background: "var(--gold)",
        animation: "studioV2Pulse 1.2s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

function RevealStory({
  profile, region, signals,
}: { profile: TravelerProfile; region: string; signals?: SceneSignal[] }) {
  const who = profile.name?.trim() ? `${profile.name.trim()}'s` : "Your";
  const hero = profile.intent ? INTENT_IMAGE[profile.intent] : undefined;
  const tier = tierLabel(profile.group?.luxuryTier);

  // Synthetic preview = cinematic atmosphere during exploration.
  // Real preview = actual Viator stops, fetched once on reveal.
  const syntheticPreview = useMemo(() => previewJourney(profile), [profile]);
  const composeReal = useServerFn(composeRealItinerary);
  const [real, setReal] = useState<Awaited<ReturnType<typeof composeReal>> | null>(null);
  // Editable copy of stops — Refine stage mutates this client-side.
  const [editedStops, setEditedStops] = useState<RefineStop[] | null>(null);
  // Cinematic map reveal — fires once when real stops first arrive.
  const [mapRevealOpen, setMapRevealOpen] = useState(false);
  const [mapRevealShown, setMapRevealShown] = useState(false);
  // Postcard — opens once after MapReveal collapses. Keepsake + share surface.
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [postcardShown, setPostcardShown] = useState(false);
  const [postcardToken, setPostcardToken] = useState<string | null>(null);
  const createSessionFn = useServerFn(createStudioSession);
  useEffect(() => {
    let cancelled = false;
    composeReal({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profile: profile as any,
        region: region as "arrabida" | "lisbon-coast" | "alentejo" | "centro",
        targetStops: profile.stopDensityTarget ?? 4,
      },
    })
      .then((r) => {
        if (cancelled) return;
        setReal(r);
        setEditedStops(r.stops.map((s) => ({
          key: s.key,
          region_key: s.region_key,
          label: s.label,
          blurb: s.blurb,
          tag: s.tag,
          lat: s.lat,
          lng: s.lng,
          duration_minutes: s.duration_minutes,
          source_tour_keys: s.source_tour_keys,
        })));
        if (!mapRevealShown) {
          setMapRevealOpen(true);
          setMapRevealShown(true);
        }
        // Pre-create the share session silently so the postcard's
        // "Share" button has a live invitation URL ready the moment
        // the postcard opens. Best-effort — never blocks the flow.
        if (!postcardToken) {
          createSessionFn({
            data: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              profile: profile as any,
              region,
              archetype: profile.archetype,
            },
          })
            .then((s) => { if (!cancelled) setPostcardToken(s.shareToken); })
            .catch(() => { /* postcard still works, share button just stays disabled */ });
        }
      })
      .catch(() => { /* fall back to synthetic */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeReal, profile, region]);

  // Map source: editedStops (real, mutable) when available, else synthetic.
  const livePreview = editedStops && editedStops.length >= 2 && real
    ? {
        region: real.region,
        regionCenter: {
          lat: editedStops.reduce((a, s) => a + s.lat, 0) / editedStops.length,
          lng: editedStops.reduce((a, s) => a + s.lng, 0) / editedStops.length,
        },
        stops: editedStops.map((s) => ({
          key: s.key,
          region_key: s.region_key,
          label: s.label,
          blurb: s.blurb,
          tag: s.tag,
          lat: s.lat,
          lng: s.lng,
          duration_minutes: s.duration_minutes,
          driveMinutesFromPrev: 0,
          source_tour_keys: s.source_tour_keys,
          score: 0,
        })),
        density: editedStops.length,
        driveBudgetMin: 0,
      }
    : syntheticPreview;

  // AI narrative layer removed (server module path blocked by client import-protection).
  // Static editorial framing carries the reveal.
  const ai = null as { title: string; subtitle: string } | null;


  return (
    <section className="mb-10">
      <StoryOpener profile={profile} region={region} signals={signals ?? []} />

      {/* Cinematic full-bleed map reveal — fires once when real stops arrive.
          Map draws the day; sequenced narrative summarizes it in one breath. */}
      <MapReveal
        open={mapRevealOpen}
        stops={livePreview.stops as unknown as import("@/components/builder/types").RoutedStopUI[]}
        regionCenter={livePreview.regionCenter}
        regionKey={livePreview.region}
        eyebrow={profile.name?.trim() ? `${profile.name.trim()}'s day` : "Your day, in one breath"}
        lines={storyFinalLines(
          { name: profile.name, intent: profile.intent, pace: profile.pace, group: profile.group },
          region,
        )}
        closer="The country has arranged itself around you."
        onClose={() => {
          setMapRevealOpen(false);
          // Hand the moment over to the postcard — keepsake + share, once.
          if (!postcardShown) {
            // Short beat so the map fade-out can settle before the postcard rises.
            window.setTimeout(() => {
              setPostcardOpen(true);
              setPostcardShown(true);
              void trackBuilderEvent("studio_v2_postcard_open", {
                region,
                intent: profile.intent,
                hasToken: Boolean(postcardToken),
              });
            }, 240);
          }
        }}
      />

      {/* Postcard — keepsake frame between the cinematic reveal and the
          editable itinerary. Carries the share surface (invitation URL). */}
      <Postcard
        open={postcardOpen}
        onClose={() => setPostcardOpen(false)}
        onContinue={() => {
          void trackBuilderEvent("studio_v2_postcard_continue", { region });
        }}
        hero={hero}
        headlineOwner={profile.name?.trim() ? `${profile.name.trim()}'s` : "Your"}
        headlineWhisper={regionWhisper(region)}
        lines={storyFinalLines(
          { name: profile.name, intent: profile.intent, pace: profile.pace, group: profile.group },
          region,
        )}
        stops={livePreview.stops.map((s) => ({
          key: s.key,
          label: s.label,
          duration_minutes: s.duration_minutes,
        }))}
        shareUrl={
          postcardToken && typeof window !== "undefined"
            ? `${window.location.origin}/studio-v2/i/${postcardToken}`
            : null
        }
        whatsappHref={whatsappHref(
          profile.name?.trim()
            ? `Olá! Sou ${profile.name.trim()} e acabei de desenhar um dia em ${regionWhisper(region)}. Gostaria de o refinar com um local designer.`
            : `Olá! Acabei de desenhar um dia em Portugal no Studio. Gostaria de o refinar com um local designer.`,
        )}
        onShare={(channel) =>
          void trackBuilderEvent("studio_v2_postcard_share", {
            channel,
            region,
            hasToken: Boolean(postcardToken),
          })
        }
      />


      {/* Hero image — real, editorial, no overlay text */}
      {hero && (
        <div
          className="studio-v2-reveal relative -mx-5 sm:-mx-8 mb-8 overflow-hidden"
          style={{ aspectRatio: "18 / 10" }}
        >
          <img
            src={hero.src}
            alt={hero.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 55%, color-mix(in oklab, var(--charcoal) 28%, transparent) 100%)",
            }}
          />
        </div>
      )}

      {/* The ambient map now lives inside LivingItinerary (sticky, behind
          the scenes). The standalone route panel above is intentionally
          omitted — map is co-protagonist, not chrome. */}

      {/* Refine stage — Swap / Remove / Reorder real stops */}
      {real && editedStops && (
        <LivingItinerary
          stops={editedStops}
          alternates={real.alternates}
          caps={real.caps}
          onChange={setEditedStops}
          intent={(profile.intent as IntentAtmosphere | undefined) ?? undefined}
          regionKey={livePreview.region}
          regionCenter={livePreview.regionCenter}
        />
      )}

      {/* Withheld stop — one final beat we keep as silhouette until booking.
          Creates longing (Bible §6). Purely presentational, never invents a
          stop name. Hidden if itinerary is too short to support a "one more". */}
      {real && editedStops && editedStops.length >= 3 && (
        <div
          className="mt-6 rounded-[2px] border px-5 py-5 sm:px-6 sm:py-6"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)",
            background: "color-mix(in oklab, var(--sand) 55%, transparent)",
          }}
        >
          <p
            className="text-[10.5px] uppercase tracking-[0.32em]"
            style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))", fontWeight: 700 }}
          >
            One more
          </p>
          <p
            className="mt-3 text-[17px] leading-[1.35] sm:text-[19px]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            {profile.name?.trim() ? `${profile.name.trim()}, we're` : "We're"} keeping the closing
            moment of your day quiet — it reveals itself only when you reserve.
          </p>
          <div
            aria-hidden
            className="mt-4 flex items-center gap-3 opacity-70"
          >
            <span
              className="inline-block h-8 w-8 rounded-full"
              style={{
                background: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
                filter: "blur(1px)",
              }}
            />
            <span
              className="inline-block h-2 flex-1 rounded-full"
              style={{
                background: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
              }}
            />
          </div>
        </div>
      )}





      <p
        className="text-[10.5px] uppercase tracking-[0.36em]"
        style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 600 }}
      >
        {who} signature Portugal experience
      </p>
      {ai ? (
        <>
          <h2
            className="mt-4 text-[28px] leading-[1.05] sm:text-[36px]"
            style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>YES —</span>{" "}
            {ai.title}.
          </h2>
          <p
            className="mt-5 text-[19px] leading-[1.4] sm:text-[22px]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              color: "var(--charcoal)",
            }}
          >
            {ai.subtitle}
          </p>
        </>
      ) : (
        <>
          <h2
            className="mt-4 text-[28px] leading-[1.05] sm:text-[36px]"
            style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            YES —{" "}
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}>
              you have just created
            </span>{" "}
            your Signature Portugal Experience.
          </h2>
          <p
            className="mt-5 text-[19px] leading-[1.4] sm:text-[22px]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              color: "var(--charcoal)",
            }}
          >
            {revealFraming(profile.intent, region)}
          </p>
        </>
      )}
      <ul
        className="mt-6 space-y-2 text-[14px] leading-relaxed"
        style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
      >
        {profile.intent && <li>· {storyAfterIntent(profile.intent)}</li>}
        {profile.pace   && <li>· {storyAfterPace(profile.pace)}</li>}
        {profile.group  && <li>· {storyAfterGroup(profile.group)}</li>}
      </ul>

      {/* Experience Investment — no invented prices, tier label only */}
      <div
        className="mt-8 rounded-[2px] border p-5"
        style={{
          borderColor: "color-mix(in oklab, var(--gold) 32%, transparent)",
          background: "color-mix(in oklab, var(--sand) 40%, transparent)",
        }}
      >
        <p
          className="text-[10.5px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))", fontWeight: 600 }}
        >
          Experience investment
        </p>
        <p
          className="mt-2 text-[17px] leading-[1.3]"
          style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600, color: "var(--charcoal)" }}
        >
          {tier} tier · all-inclusive · private throughout
        </p>
        <p
          className="mt-1 text-[12.5px] italic"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
          }}
        >
          Final investment is confirmed at reveal — no surprises.
        </p>
      </div>

      {/* Trust band — micro, factual */}
      <div
        className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center"
      >
        {["500+ travellers", "Private only", "Designed by locals", "Instant confirmation"].map((t) => (
          <span
            key={t}
            className="text-[10.5px] uppercase tracking-[0.28em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Primary conversion moment — climax of the reveal.
          ConversionStage routes to Instant / Refine / Both based on
          AI confidence + itinerary shape. Emotional momentum is
          preserved on every path: instant uses an in-place sheet
          (no redirect), refine introduces a named local in a single
          continuous gesture. */}
      {real && editedStops && editedStops.length >= 2 && (
        <ConversionStage
          profile={profile}
          region={region}
          archetype={(profile.archetype as string | undefined) ?? undefined}
          stops={editedStops}
        />
      )}
    </section>
  );
}

// ─── bespoke Secure CTA ─────────────────────────────────────────────────
// Creates a bespoke draft from the edited real stops and navigates to the
// custom checkout. NEVER points at /experiences — this is a custom day,
// not a packaged Signature tour.

function BespokeSecureCTA({
  profile, region, archetype, stops,
}: {
  profile: TravelerProfile;
  region: string;
  archetype?: string;
  stops: RefineStop[];
}) {
  const createDraft = useServerFn(createCustomBookingDraft);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totals = useMemo(() => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const hav = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const la1 = toRad(a.lat);
      const la2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    let km = 0;
    let exp = 0;
    for (let i = 0; i < stops.length; i++) {
      exp += stops[i].duration_minutes ?? 60;
      if (i > 0) km += hav(stops[i - 1], stops[i]);
    }
    return {
      km: Math.round(km),
      drive: Math.round((km / 55) * 60),
      experience: exp,
    };
  }, [stops]);

  const onClick = async () => {
    if (busy || stops.length < 2) return;
    setBusy(true);
    setErr(null);
    void trackBuilderEvent("studio_v2_secure_click", {
      archetype, region, intent: profile.intent, stopCount: stops.length,
    });
    try {
      const r = await createDraft({
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          profile: profile as any,
          region,
          archetype,
          stops: stops.map((s) => ({
            key: s.key,
            region_key: s.region_key,
            label: s.label,
            blurb: s.blurb ?? null,
            tag: s.tag ?? null,
            lat: s.lat,
            lng: s.lng,
            duration_minutes: s.duration_minutes,
            source_tour_keys: s.source_tour_keys ?? [],
          })),
          totalMinutes: totals.experience,
          totalDriveMinutes: totals.drive,
          totalKm: totals.km,
        },
      });
      void trackBuilderEvent("studio_v2_booking_draft_create", { draftToken: r.draftToken });
      window.location.href = `/checkout/${r.draftToken}`;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not secure your day.");
      setBusy(false);
    }
  };

  const waMsg = profile.name?.trim()
    ? `Olá! Sou ${profile.name.trim()} e acabei de desenhar um dia em Portugal no Studio. Gostaria de falar com um local designer antes de reservar.`
    : `Olá! Acabei de desenhar um dia em Portugal no Studio. Gostaria de falar com um local designer antes de reservar.`;

  return (
    <div className="mt-12 flex flex-col gap-4">
      <button
        type="button"
        onClick={onClick}
        disabled={busy || stops.length < 2}
        className="group inline-flex items-center justify-center gap-2.5 rounded-[2px] px-6 py-4 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "color-mix(in oklab, var(--gold) 92%, var(--charcoal))",
          color: "var(--charcoal)",
          minHeight: 56,
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          boxShadow: "0 8px 24px -12px color-mix(in oklab, var(--gold) 60%, transparent)",
        }}
      >
        {busy ? "Securing…" : "Reserve this day"}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-[3px]" aria-hidden />
      </button>
      {err && (
        <p className="text-center text-[12.5px]" style={{ color: "var(--charcoal)" }}>{err}</p>
      )}
      <p
        className="text-center text-[12.5px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        }}
      >
        A local designer confirms every timing and the final investment before any charge.
      </p>
      <div className="mt-1 flex items-center justify-center">
        <a
          href={whatsappHref(waMsg)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            void trackBuilderEvent("studio_v2_secure_whatsapp_fallback", {
              archetype, region, intent: profile.intent,
            })
          }
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] underline-offset-4 hover:underline min-h-[44px] px-2"
          style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)", fontWeight: 600 }}
        >
          Prefer to talk first? Chat with a local designer
        </a>
      </div>
    </div>
  );
}

// ─── reusable chrome ─────────────────────────────────────────────────────


function ChoiceBeat({
  eyebrow, title, helper, children, onBack, footer,
}: {
  eyebrow: string;
  title: React.ReactNode;
  helper: string;
  children: React.ReactNode;
  onBack: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <section>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Headline>{title}</Headline>
      <Helper>{helper}</Helper>
      <div className="mt-6">{children}</div>
      <div className="mt-10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] uppercase tracking-[0.28em] min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 rounded-[2px]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)", fontWeight: 600 }}
        >
          ← Back
        </button>
        {footer}
      </div>
    </section>
  );
}

function ContinueButton({
  label, onClick, disabled,
}: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-2.5 rounded-[2px] px-7 py-3.5 text-[12.5px] tracking-[0.22em] transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: "var(--charcoal)",
        color: "var(--ivory)",
        minHeight: 48,
        minWidth: 184,
        fontFamily: "var(--font-sans, Inter), sans-serif",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {label}
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[3px]"
        aria-hidden
      />
    </button>
  );
}

// ─── reveal action trio ──────────────────────────────────────────────────

function RevealActions({
  name,
  profile,
  region,
  archetype,
}: {
  name?: string;
  profile?: TravelerProfile;
  region?: string;
  archetype?: string;
}) {
  const saveSession = useServerFn(createStudioSession);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const onSave = async () => {
    if (saveState === "saving") return;
    setSaveState("saving");
    void trackBuilderEvent("studio_v2_save_click", { archetype, region, intent: profile?.intent });
    try {
      if (profile) {
        const r = await saveSession({
          data: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            profile: profile as any,
            region,
            archetype,
          },
        });
        const url = `${window.location.origin}/s/${r.shareToken}`;
        setShareUrl(url);
        try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
        try { window.localStorage.setItem("yes.studio-v2.last-share", url); } catch { /* */ }
        void trackBuilderEvent("studio_v2_save_success", { shareToken: r.shareToken });
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
      void trackBuilderEvent("studio_v2_save_error", {});
    }
  };
  const saved = saveState === "saved";

  const waMsg = name?.trim()
    ? `Olá! Sou ${name.trim()} e acabei de desenhar a minha experiência no Studio. Gostaria de a refinar com um local designer.`
    : "Olá! Acabei de desenhar uma experiência no Studio. Gostaria de a refinar com um local designer.";
  return (
    <div className="mt-12 flex flex-col gap-3">
      {/* Primary Secure CTA now lives in RevealStory (uses real edited stops). */}


      {/* 2 — Secondary: Save My Experience (ghost) */}
      <button
        type="button"
        onClick={onSave}
        className="inline-flex items-center justify-center gap-2.5 rounded-[2px] border px-6 py-3.5 transition-all focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "transparent",
          color: "var(--charcoal)",
          borderColor: "color-mix(in oklab, var(--charcoal) 22%, transparent)",
          minHeight: 48,
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
        {saveState === "saving"
          ? "Saving…"
          : saved
          ? (shareUrl ? "Saved · link copied" : "Saved")
          : saveState === "error"
          ? "Try again"
          : "Save my experience"}
      </button>
      {saved && shareUrl && (
        <p
          className="text-center text-[11px] tracking-[0.18em] uppercase break-all"
          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)", fontWeight: 600 }}
        >
          {shareUrl.replace(/^https?:\/\//, "")}
        </p>
      )}


      {/* 3 — Tertiary: Refine with a Local Designer (text) */}
      <a
        onClick={() => void trackBuilderEvent("studio_v2_refine_click", { archetype, region, intent: profile?.intent })}
        href={whatsappHref(waMsg)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-2 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 rounded-[2px]"
        style={{
          color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
          minHeight: 44,
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 600,
          fontSize: 11.5,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
        }}
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
        Refine with a local designer
      </a>

      <p
        className="mt-2 text-center text-[12px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
        }}
      >
        A local designer confirms every timing before booking.
      </p>
    </div>
  );
}







// ─── live journey layer ───────────────────────────────────────────────────
//
// Sticky cinematic map that reflects the current profile in real time.
// The InsightStrip floats over its lower edge during transitions.

function JourneyLayer({
  preview, insight, insightVisible,
}: { preview: JourneyPreview; insight: string; insightVisible: boolean }) {
  return (
    <div
      className="relative w-full h-[42vh] min-h-[260px] max-h-[420px] overflow-hidden border-y"
      style={{
        borderColor: "color-mix(in oklab, var(--charcoal) 8%, transparent)",
        background: "var(--sand)",
      }}
      aria-label="Live journey preview"
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center text-[10.5px] uppercase tracking-[0.24em] font-semibold" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
            shaping route…
          </div>
        }
      >
        <BuilderMap
          stops={preview.stops}
          regionCenter={preview.regionCenter}
          regionKey={preview.region}
          emotionalMode
          chrome={false}
        />
      </Suspense>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--ivory) 55%, transparent), transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--ivory) 92%, transparent) 8%, transparent 70%)",
        }}
      />

      <div
        className="absolute top-3 left-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
      >
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-60" />
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
        </span>
        {regionShort(preview.region)} · {preview.stops.length} stops
      </div>

      <div
        className="absolute inset-x-4 bottom-4 transition-all duration-[520ms] ease-out motion-reduce:transition-none"
        style={{
          opacity: insightVisible ? 1 : 0,
          transform: insightVisible ? "translateY(0)" : "translateY(8px)",
        }}
        aria-live="polite"
      >
        <div
          className="rounded-[2px] border px-3.5 py-2.5 text-[12.5px] leading-snug backdrop-blur-md"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)",
            background: "color-mix(in oklab, var(--ivory) 88%, transparent)",
            color: "var(--charcoal)",
            boxShadow: "0 6px 20px color-mix(in oklab, var(--charcoal) 12%, transparent)",
          }}
        >
          {insight}
        </div>
      </div>
    </div>
  );
}

function regionShort(r: string): string {
  switch (r) {
    case "arrabida":     return "Arrábida";
    case "lisbon-coast": return "Atlantic edge";
    case "alentejo":     return "Alentejo";
    case "centro":       return "Centro";
    default:             return r;
  }
}




// ─── primitives ───────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10.5px] uppercase tracking-[0.32em]"
      style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
    >
      {children}
    </p>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="mt-3 text-[26px] leading-[1.15] sm:text-[34px]"
      style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
    >
      {children}
    </h1>
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-2 text-[14px] leading-relaxed"
      style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
    >
      {children}
    </p>
  );
}

function OptionCard({
  active, label, sub, onClick,
}: { active: boolean; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[92px] flex-col items-start gap-1.5 px-5 py-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2"
      style={{
        background: active
          ? "color-mix(in oklab, var(--sand) 70%, transparent)"
          : "color-mix(in oklab, var(--ivory) 60%, transparent)",
        borderLeft: active
          ? "2px solid var(--gold)"
          : "2px solid color-mix(in oklab, var(--charcoal) 8%, transparent)",
        boxShadow: active
          ? "0 1px 0 color-mix(in oklab, var(--charcoal) 6%, transparent)"
          : "none",
      }}
    >
      <span
        className="text-[16px] leading-snug transition-colors duration-300"
        style={{
          fontFamily: "var(--font-display, Montserrat), sans-serif",
          fontWeight: active ? 700 : 600,
          color: "var(--charcoal)",
        }}
      >
        {label}
      </span>
      <span
        className="text-[12.5px] leading-snug"
        style={{
          color: "color-mix(in oklab, var(--charcoal) 62%, transparent)",
          fontFamily: "var(--font-sans, Inter), sans-serif",
        }}
      >
        {sub}
      </span>
    </button>
  );
}

function PhotoOptionCard({
  active, label, sub, image, alt, onClick,
}: {
  active: boolean;
  label: string;
  sub: string;
  image: string;
  alt: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group relative block w-full overflow-hidden text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2"
      style={{
        aspectRatio: "16 / 10",
        outline: active
          ? "2px solid var(--gold)"
          : "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
        outlineOffset: 0,
      }}
    >
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        style={{ filter: active ? "saturate(1)" : "saturate(0.88)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, color-mix(in oklab, var(--charcoal) 78%, transparent) 0%, color-mix(in oklab, var(--charcoal) 18%, transparent) 55%, transparent 100%)",
        }}
      />
      <div className="absolute inset-x-4 bottom-3">
        <span
          className="block text-[15px] leading-tight"
          style={{
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: active ? 700 : 600,
            color: "var(--ivory)",
            letterSpacing: "-0.005em",
          }}
        >
          {label}
        </span>
        <span
          className="mt-1 block text-[11.5px] leading-snug"
          style={{
            color: "color-mix(in oklab, var(--ivory) 82%, transparent)",
            fontFamily: "var(--font-sans, Inter), sans-serif",
          }}
        >
          {sub}
        </span>
      </div>
      {active && (
        <span
          aria-hidden
          className="absolute right-3 top-3 inline-flex h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--gold)", boxShadow: "0 0 0 4px color-mix(in oklab, var(--gold) 30%, transparent)" }}
        />
      )}
    </button>
  );
}

function PriorityChip({
  label, weight, onClick,
}: { label: string; weight: number | undefined; onClick: () => void }) {
  const state = weight === undefined ? "off" : weight >= 100 ? "must" : "on";
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border px-4 text-[13px] transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2"
      style={{
        borderColor:
          state === "must" ? "color-mix(in oklab, var(--gold) 80%, transparent)" :
          state === "on"   ? "color-mix(in oklab, var(--gold) 45%, transparent)" :
                             "color-mix(in oklab, var(--charcoal) 18%, transparent)",
        background:
          state === "must" ? "color-mix(in oklab, var(--gold) 18%, transparent)" :
          state === "on"   ? "color-mix(in oklab, var(--sand) 60%, transparent)" :
                             "transparent",
        color: "var(--charcoal)",
        fontWeight: state === "must" ? 600 : 500,
      }}
    >
      {label}{state === "must" ? " · essential" : ""}
    </button>
  );
}

function StageFooter({
  disabled, helper, ctaLabel = "Continue", onContinue,
}: { disabled?: boolean; helper?: string; ctaLabel?: string; onContinue: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-start gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onContinue}
        className="group inline-flex items-center gap-2 rounded-[2px] px-6 py-3 text-[12px] tracking-[0.24em] lowercase transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "var(--charcoal)",
          color: "var(--ivory)",
          minHeight: 48,
          minWidth: 184,
        }}
      >
        {ctaLabel}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[3px]"
          aria-hidden
        />
      </button>
      {helper && (
        <span
          className="text-[12.5px] italic"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          {helper}
        </span>
      )}
    </div>
  );
}

// ─── group form ───────────────────────────────────────────────────────────

function GroupForm({
  value, onChange,
}: { value: GroupProfile | undefined; onChange: (g: GroupProfile) => void }) {
  const g: GroupProfile = value ?? {
    adults: 2, children: 0, teens: 0, mobility: "none",
    occasion: "none", decisionStyle: "collaborative", luxuryTier: "elevated",
  };
  const set = (patch: Partial<GroupProfile>) => onChange({ ...g, ...patch });

  return (
    <div className="mt-6 space-y-6">
      <CountRow label="Adults"   value={g.adults}   onChange={(v) => set({ adults: v })} min={1} />
      <CountRow label="Teens"    value={g.teens}    onChange={(v) => set({ teens: v })} />
      <CountRow label="Children" value={g.children} onChange={(v) => set({ children: v })} />

      <SelectRow
        label="Occasion"
        value={g.occasion}
        onChange={(v) => set({ occasion: v as GroupProfile["occasion"] })}
        options={[
          ["none", "Just a great day"],
          ["anniversary", "Anniversary"],
          ["birthday", "Birthday"],
          ["honeymoon", "Honeymoon"],
          ["celebration", "Celebration"],
          ["corporate", "Corporate"],
        ]}
      />
      <SelectRow
        label="Mobility"
        value={g.mobility}
        onChange={(v) => set({ mobility: v as GroupProfile["mobility"] })}
        options={[["none", "No constraints"], ["limited", "Some limitations"], ["wheelchair", "Wheelchair"]]}
      />
    </div>
  );
}

function CountRow({
  label, value, onChange, min = 0,
}: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px]">{label}</span>
      <div className="flex items-center gap-3">
        <StepBtn onClick={() => onChange(Math.max(min, value - 1))} label="−" />
        <span className="w-6 text-center text-[15px] tabular-nums">{value}</span>
        <StepBtn onClick={() => onChange(value + 1)} label="+" />
      </div>
    </div>
  );
}

function StepBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === "+" ? "increase" : "decrease"}
      className="grid h-11 w-11 place-items-center rounded-full border text-[16px] transition focus-visible:outline-none focus-visible:ring-2"
      style={{
        borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
        background: "var(--ivory)",
      }}
    >
      {label}
    </button>
  );
}

function SelectRow({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.28em]" style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, lab]) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="rounded-full border px-3 py-1.5 text-[12.5px] transition min-h-[36px]"
              style={{
                borderColor: active
                  ? "color-mix(in oklab, var(--gold) 70%, transparent)"
                  : "color-mix(in oklab, var(--charcoal) 18%, transparent)",
                background: active
                  ? "color-mix(in oklab, var(--sand) 60%, transparent)"
                  : "transparent",
                fontWeight: active ? 600 : 500,
              }}
            >
              {lab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ops form ─────────────────────────────────────────────────────────────

function OpsForm({
  value, onChange,
}: { value: TravelerProfile["ops"]; onChange: (v: TravelerProfile["ops"]) => void }) {
  const set = (patch: Partial<TravelerProfile["ops"]>) => onChange({ ...value, ...patch });
  return (
    <div className="mt-6 space-y-5">
      <TextRow
        label="Pickup location"
        placeholder="Hotel name, area, or address"
        value={value.pickup ?? ""}
        onChange={(v) => set({ pickup: v })}
      />
      <TextRow
        label="Accommodation area"
        placeholder="e.g. Cascais, Comporta, Lisbon"
        value={value.accommodationArea ?? ""}
        onChange={(v) => set({ accommodationArea: v })}
      />
      <TextRow
        label="Dietary notes"
        placeholder="Allergies, vegetarian, vegan…"
        value={(value.dietary ?? []).join(", ")}
        onChange={(v) => set({ dietary: v.split(",").map((s) => s.trim()).filter(Boolean) })}
      />
      <TextRow
        label="Hard time constraints"
        placeholder="e.g. cruise back by 18:00"
        value={(value.hardConstraints ?? []).join(", ")}
        onChange={(v) => set({ hardConstraints: v.split(",").map((s) => s.trim()).filter(Boolean) })}
      />
    </div>
  );
}

function TextRow({
  label, placeholder, value, onChange,
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[11px] uppercase tracking-[0.28em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[2px] border bg-transparent px-3 py-3 text-[14px] focus-visible:outline-none focus-visible:ring-2"
        style={{
          borderColor: "color-mix(in oklab, var(--charcoal) 20%, transparent)",
          color: "var(--charcoal)",
        }}
      />
    </label>
  );
}

// ─── reveal ───────────────────────────────────────────────────────────────

type VariantKey = "lighter" | "signature" | "richer";

function Reveal({ result }: { result: DesignResult }) {
  const { score, archetype, region } = result;
  const [variant, setVariant] = useState<VariantKey>("signature");

  const day =
    variant === "lighter" ? result.variants.lighter :
    variant === "richer"  ? result.variants.richer  :
    result.day;

  const [reasoningOpen, setReasoningOpen] = useState(false);

  return (
    <div>
      <Eyebrow>Your experience</Eyebrow>
      <Headline>A {paceLabel(result.profile.pace)} day in {regionLabel(region)}.</Headline>
      <p
        className="mt-4 text-[14.5px] leading-relaxed"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          color: "color-mix(in oklab, var(--charcoal) 72%, transparent)",
        }}
      >
        {revealFraming(result.profile.intent, region)}
      </p>
      <Helper>
        {day.stops.length} stops · about {fmtMinutes(day.totals.dayMin)} total.
      </Helper>

      <ol className="mt-8 space-y-4">
        {day.stops.map(({ stop, driveFromPrev }, i) => (
          <li key={stop.id} className="flex gap-4">
            <span
              className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px]"
              style={{
                background: "var(--charcoal)",
                color: "var(--ivory)",
                fontWeight: 600,
              }}
            >
              {i + 1}
            </span>
            <div className="flex-1">
              <p
                className="text-[15px]"
                style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
              >
                {stop.name}
              </p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}>
                {stop.blurb}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em]" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
                {driveFromPrev > 0 ? `${driveFromPrev} min drive · ` : ""}{fmtMinutes(stop.dwellMin)} on site
              </p>
            </div>
          </li>
        ))}
      </ol>

      {day.warnings.length > 0 && (
        <div
          className="mt-6 rounded-[2px] border-l-2 px-4 py-3 text-[12.5px]"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 70%, transparent)",
            background: "color-mix(in oklab, var(--sand) 50%, transparent)",
            color: "color-mix(in oklab, var(--charcoal) 75%, transparent)",
          }}
        >
          {day.warnings.join(" · ")}
        </div>
      )}

      <button
        type="button"
        onClick={() => setReasoningOpen((o) => !o)}
        className="mt-8 flex items-center gap-2 text-[11.5px] uppercase tracking-[0.28em] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 rounded-[2px]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
        aria-expanded={reasoningOpen}
      >
        {reasoningOpen ? "Hide" : "See"} the reasoning
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{ transform: reasoningOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        />
      </button>

      {reasoningOpen && (
        <div className="mt-4 space-y-6">
          <div
            className="rounded-[2px] border p-5"
            style={{
              borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
              background: "color-mix(in oklab, var(--sand) 35%, transparent)",
            }}
          >
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.28em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              Designed for the {archetypeLabel(archetype)}
            </p>
            <ScoreRow label="Overall match" value={score.total} primary />
            <ScoreRow label="Fit"        value={score.fit} />
            <ScoreRow label="Pacing"     value={score.pacing} />
            <ScoreRow label="Logistics"  value={score.logistics} />
          </div>

          <div>
            <p
              className="mb-2 text-[10.5px] uppercase tracking-[0.28em]"
              style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
            >
              Day intensity
            </p>
            <div
              className="inline-flex rounded-full border p-1"
              style={{ borderColor: "color-mix(in oklab, var(--charcoal) 14%, transparent)" }}
              role="tablist"
              aria-label="Day intensity"
            >
              {(["lighter", "signature", "richer"] as VariantKey[]).map((v) => {
                const active = variant === v;
                return (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setVariant(v)}
                    className="rounded-full px-4 py-1.5 text-[12px] tracking-[0.18em] lowercase transition min-h-[36px]"
                    style={{
                      background: active ? "var(--charcoal)" : "transparent",
                      color: active ? "var(--ivory)" : "color-mix(in oklab, var(--charcoal) 70%, transparent)",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {result.upsells.length > 0 && (
            <div>
              <p
                className="text-[10.5px] uppercase tracking-[0.32em]"
                style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))" }}
              >
                Worth considering
              </p>
              <ul className="mt-3 space-y-3">
                {result.upsells.map((u) => (
                  <li
                    key={u.stop.id}
                    className="rounded-[2px] border p-4"
                    style={{
                      borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
                      background: "color-mix(in oklab, var(--sand) 30%, transparent)",
                    }}
                  >
                    <p
                      className="text-[14px]"
                      style={{ fontFamily: "var(--font-display, Montserrat), sans-serif", fontWeight: 600 }}
                    >
                      {u.stop.name}
                    </p>
                    <p
                      className="mt-1 text-[12.5px] italic"
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
                      }}
                    >
                      {u.reason}
                    </p>
                    <p
                      className="mt-1.5 text-[11px] uppercase tracking-[0.22em]"
                      style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                    >
                      {fmtMinutes(u.stop.dwellMin)} on site
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}



      <RevealActions
        name={result.profile.name}
        profile={result.profile}
        region={result.region}
        archetype={result.archetype}
      />



      {import.meta.env.DEV && (
        <details className="mt-10 text-[12px]" style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}>
          <summary className="cursor-pointer">Operational data (dev)</summary>
          <pre className="mt-2 overflow-x-auto rounded-[2px] border p-3 text-[11px]" style={{ borderColor: "color-mix(in oklab, var(--charcoal) 15%, transparent)" }}>
{JSON.stringify(
  {
    archetype,
    pace: result.profile.pace,
    region,
    priorityWeights: result.profile.priorityWeights,
    score,
    totals: day.totals,
    stops: day.stops.map(({ stop, driveFromPrev }) => ({
      id: stop.id, name: stop.name, kind: stop.kind,
      driveFromPrev, dwell: stop.dwellMin,
    })),
  },
  null,
  2,
)}
          </pre>
        </details>
      )}
    </div>
  );
}

function ScoreRow({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${primary ? "" : "mt-2"}`}>
      <span
        className="text-[12px] uppercase tracking-[0.24em]"
        style={{
          color: primary
            ? "var(--charcoal)"
            : "color-mix(in oklab, var(--charcoal) 65%, transparent)",
          fontWeight: primary ? 600 : 500,
        }}
      >
        {label}
      </span>
      <span
        className="text-[14px] tabular-nums"
        style={{
          fontFamily: "var(--font-display, Montserrat), sans-serif",
          fontWeight: primary ? 700 : 500,
          color: primary
            ? "color-mix(in oklab, var(--gold) 80%, var(--charcoal))"
            : "var(--charcoal)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function paceLabel(p?: PaceV2): string {
  switch (p) {
    case "light":    return "spacious";
    case "balanced": return "balanced";
    case "rich":     return "full but elegant";
    case "full":     return "rich";
    default:         return "considered";
  }
}

function regionLabel(r: string): string {
  switch (r) {
    case "arrabida":      return "Arrábida";
    case "lisbon-coast":  return "Sintra & the Atlantic edge";
    case "alentejo":      return "Alentejo";
    case "centro":        return "Centro";
    default:              return r;
  }
}

function archetypeLabel(a: string): string {
  return a.replace(/_/g, " ");
}
