import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BookmarkPlus, ChevronDown, ChevronUp, Compass, RotateCcw, Sparkles } from "lucide-react";

import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import {
  regionLabel,
  resolveRegionFromHint,
  useStudioState,
  type StudioStop,
} from "@/hooks/useStudioState";
import { useStudioLocale } from "@/hooks/useStudioLocale";
import { parseNarrative } from "@/lib/builderNarrative.functions";
import { suggestFromIntent } from "@/lib/builderIntent.functions";
import { listRegionStops } from "@/lib/builderEngine.functions";
import { suggestPacing } from "@/lib/builderPacing.functions";
import { generateChapter } from "@/lib/builderChapter.functions";
import { composeStudioMoment } from "@/lib/studioNarrative.functions";

import { AmbientStage } from "./AmbientStage";
import { AmbientPrologue } from "./AmbientPrologue";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NarrativeComposer } from "./NarrativeComposer";
import { ChapterLine } from "./ChapterLine";
import { EmergingChips } from "./EmergingChips";
import { CinematicChoices, type ChoicesPick } from "./CinematicChoices";
import { JourneyReveal } from "./JourneyReveal";
import { LivingMap } from "./LivingMap";
import { ItineraryRibbon } from "./ItineraryRibbon";
import { WhisperLayer } from "./WhisperLayer";
import { MemoryCard } from "./MemoryCard";
import { MultiDayConcierge } from "./MultiDayConcierge";
import { NameWhisper } from "./NameWhisper";
import { NarrativeBeat } from "./NarrativeBeat";


interface CatalogEntry {
  key: string;
  label: string;
  blurb: string | null;
  tag: string | null;
  lat: number;
  lng: number;
  duration_minutes: number;
}

const STUDIO_CLIPS = {
  coast: "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
  table: "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
  viewpoint: "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
} as const;

function studioClipFor(intention: string | null, mood: string | null): string {
  if (intention === "gastronomy" || intention === "wine") return STUDIO_CLIPS.table;
  if (intention === "coast" || mood === "open") return STUDIO_CLIPS.coast;
  return STUDIO_CLIPS.viewpoint;
}

export function StudioStageV3({ onExit }: { onExit?: () => void }) {
  const sessionId = useBuilderSessionId();
  const { locale, setLocale, t } = useStudioLocale();
  const {
    state,
    restored,
    dismissRestored,
    reset,
    patch,
    acceptStop,
    removeStop,
    setWhisper,
    setNarrativeFragment,
    routedStops,
    regionCenter,
    totalMinutes,
    affinityProfile,
    narrativeStage,
  } = useStudioState();


  const parseFn = useServerFn(parseNarrative);
  const suggestFn = useServerFn(suggestFromIntent);
  const listFn = useServerFn(listRegionStops);
  const pacingFn = useServerFn(suggestPacing);
  const chapterFn = useServerFn(generateChapter);
  const composeFn = useServerFn(composeStudioMoment);

  const [composerCollapsed, setComposerCollapsed] = useState(true);
  const [composerBusy, setComposerBusy] = useState(false);
  const [catalog, setCatalog] = useState<Map<string, CatalogEntry>>(new Map());
  const [suggestionKeys, setSuggestionKeys] = useState<string[]>([]);
  const [ribbonOpen, setRibbonOpen] = useState(false);
  const [composerSeed, setComposerSeed] = useState<string | undefined>(undefined);
  const [revealPlayed, setRevealPlayed] = useState(false);
  const lastChapterReqRef = useRef<string>("");
  /** Session AI budget — at most 4 composeStudioMoment calls per session. */
  const aiBudgetRef = useRef<number>(0);
  /** Stages that have already fired their narrative beat — fires once each. */
  const firedStagesRef = useRef<Set<string>>(new Set());


  /* ── Load region catalog ── */
  useEffect(() => {
    if (!state.regionKey) return;
    const region = state.regionKey;
    listFn({ data: { regionKey: region } })
      .then((r) => {
        const map = new Map<string, CatalogEntry>();
        for (const s of r.stops) {
          map.set(s.key, {
            key: s.key,
            label: s.label,
            blurb: s.blurb,
            tag: s.tag,
            lat: Number(s.lat),
            lng: Number(s.lng),
            duration_minutes: s.duration_minutes,
          });
        }
        setCatalog(map);
      })
      .catch(() => {});
  }, [state.regionKey, listFn]);

  const suggestionStops = useMemo<StudioStop[]>(() => {
    const acceptedSet = new Set(state.acceptedStops.map((s) => s.key));
    const acceptedTags = new Set(
      state.acceptedStops.map((s) => s.tag?.toLowerCase()).filter(Boolean) as string[],
    );

    // Trailing-tag diversity: if the last two accepted stops share a tag,
    // any further candidate with that tag is multiplicatively dampened (×0.4)
    // so the journey opens into a new sensory register instead of looping.
    const last = state.acceptedStops.slice(-2).map((s) => s.tag?.toLowerCase() ?? "");
    const dampenedTag =
      last.length === 2 && last[0] && last[0] === last[1] ? last[0] : null;

    // Affinity-weighted scoring — picks the "next best" complementary moment
    // rather than echoing whatever was just accepted. Higher = better fit.
    const score = (c: CatalogEntry): number => {
      const tag = c.tag?.toLowerCase() ?? "";
      const warmTags = new Set(["wine", "gastronomy", "wellness", "romantic"]);
      const deepTags = new Set(["heritage", "nature", "hidden", "wellness"]);
      const energyTags = new Set(["coast", "wonder", "nature"]);
      let s = 0;
      if (warmTags.has(tag)) s += affinityProfile.warmth * 1.0;
      if (deepTags.has(tag)) s += affinityProfile.depth * 0.9;
      if (energyTags.has(tag)) s += affinityProfile.energy * 0.7;
      if (state.intention && tag === state.intention) s += 0.4;
      // Reduce echo: penalize tags already represented in the journey.
      if (acceptedTags.has(tag)) s -= 0.55;
      // Diversity penalty: same tag twice in a row → multiplicative dampen.
      if (dampenedTag && tag === dampenedTag) s *= 0.4;
      return s;
    };

    const pool: CatalogEntry[] = [];
    for (const k of suggestionKeys) {
      if (acceptedSet.has(k)) continue;
      const c = catalog.get(k);
      if (c) pool.push(c);
    }
    if (pool.length < 4) {
      for (const c of catalog.values()) {
        if (acceptedSet.has(c.key) || pool.some((x) => x.key === c.key)) continue;
        pool.push(c);
        if (pool.length >= 8) break;
      }
    }
    return pool
      .map((c) => ({ c, s: score(c) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(({ c }) => c);
  }, [suggestionKeys, catalog, state.acceptedStops, state.intention, affinityProfile]);



  /* ── Chapter line (debounced) ── */
  useEffect(() => {
    if (!sessionId) return;
    if (!state.awakened) return;
    const key = `${state.mood}|${state.who}|${state.intention}|${state.regionKey}|${state.acceptedStops.map((s) => s.key).join(",")}`;
    if (key === lastChapterReqRef.current) return;
    lastChapterReqRef.current = key;
    const tm = window.setTimeout(() => {
      chapterFn({
        data: {
          sessionId,
          mood: state.mood,
          who: state.who,
          intention: state.intention,
          pace: state.pace,
          regionLabel: "Portugal",
          stopLabels: state.acceptedStops.map((_, i) => `momento ${i + 1}`),
          kind: "chapter",
          locale,
        },
      })
        .then((r) => patch({ chapter: r.line }))
        .catch(() => {});
    }, 350);
    return () => window.clearTimeout(tm);
  }, [
    sessionId,
    state.awakened,
    state.mood,
    state.who,
    state.intention,
    state.pace,
    state.regionKey,
    state.acceptedStops,
    chapterFn,
    patch,
    locale,
  ]);

  useEffect(() => {
    lastChapterReqRef.current = "";
  }, [locale]);

  /* ── Pacing whisper ── */
  useEffect(() => {
    if (!sessionId) return;
    if (state.acceptedStops.length < 2) return;
    const tm = window.setTimeout(() => {
      pacingFn({
        data: {
          sessionId,
          stops: routedStops.map((s) => ({
            key: s.key,
            label: s.label,
            durationMinutes: s.duration_minutes,
            driveMinutesFromPrev: s.driveMinutesFromPrev,
          })),
          pace: state.pace,
          who: state.who ?? "couple",
          totalMinutes,
        },
      })
        .then((r) => {
          if (r.warning) setWhisper(r.warning);
        })
        .catch(() => {});
    }, 900);
    return () => window.clearTimeout(tm);
  }, [
    sessionId,
    state.acceptedStops,
    state.pace,
    state.who,
    routedStops,
    totalMinutes,
    pacingFn,
    setWhisper,
  ]);

  /* ── Compose editorial proposal — once, when all three choices are made ── */
  useEffect(() => {
    if (!sessionId) return;
    if (state.journeyType === "multi") return;
    const hasCore = Boolean(state.mood && state.who && state.intention);
    if (!hasCore) return;
    if (state.proposal) return;
    if (state.acceptedStops.length > 0) return;
    // Sparsity + accessibility guards. prefers-reduced-motion → fallback only.
    if (aiBudgetRef.current >= 4) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    aiBudgetRef.current += 1;
    let cancelled = false;
    composeFn({
      data: {
        sessionId,
        mode: "proposal",
        locale,
        mood: state.mood,
        who: state.who,
        intention: state.intention,
        journeyType: state.journeyType,
        travellerName: state.travellerName,
        narrativeStage: "reveal",
        confidence: 0.6,
        acceptedCount: 0,
      },
    })
      .then((r) => {
        if (cancelled) return;
        if (r.mode === "proposal") {
          patch({
            proposal: { title: r.title, subtitle: r.subtitle, generatedAt: Date.now() },
          });
          if (import.meta.env.DEV) {
            console.debug("[studio.proposal]", {
              title: r.title,
              subtitle: r.subtitle,
              source: r.source,
            });
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    sessionId,
    locale,
    state.mood,
    state.who,
    state.intention,
    state.journeyType,
    state.travellerName,
    state.proposal,
    state.acceptedStops.length,
    composeFn,
    patch,
  ]);

  /* ── Narrative beats — emotional transition firings only.
   *
   * Sparsity is the whole point: at most one beat per derived stage, gated
   * by the 4-call session budget. Each beat is a SHORT sensory line that
   * surfaces briefly via <NarrativeBeat /> and then dissolves — never a
   * persistent caption, never "AI text on screen". The traveller should
   * feel quietly recognized, not narrated at.
   *
   * Fires:
   *   • recognition → first emotional pick has landed
   *   • emergence   → core picks complete OR second stop accepted
   *   • reveal      → third stop accepted (intimate close)
   *
   * Each stage fires AT MOST ONCE per session. Reduced-motion users skip
   * beats entirely — the static stage cues + fallback chapter line carry
   * the experience without imposing motion.
   */
  useEffect(() => {
    if (!sessionId) return;
    if (state.journeyType === "multi") return;
    const stage = narrativeStage;
    if (stage === "invitation") return;
    if (firedStagesRef.current.has(stage)) return;
    if (aiBudgetRef.current >= 4) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    firedStagesRef.current.add(stage);
    aiBudgetRef.current += 1;

    const count = state.acceptedStops.length;
    const lastTag =
      count > 0 ? (state.acceptedStops[count - 1]?.tag ?? null) : null;
    // Confidence rises with the stage altitude — drives temperature server-side.
    const confidence =
      stage === "recognition" ? 0.32
      : stage === "emergence" ? Math.min(0.8, 0.55 + count * 0.08)
      : 0.92;

    let cancelled = false;
    composeFn({
      data: {
        sessionId,
        mode: "narrative",
        locale,
        mood: state.mood,
        who: state.who,
        intention: state.intention,
        journeyType: state.journeyType,
        travellerName: state.travellerName,
        narrativeStage: stage,
        confidence,
        acceptedCount: count,
        lastFragment: state.narrativeFragment,
        lastAcceptedTag: lastTag,
      },
    })
      .then((r) => {
        if (cancelled) return;
        if (r.mode === "narrative" && r.fragment) {
          setNarrativeFragment(r.fragment);
          if (import.meta.env.DEV) {
            console.debug("[studio.narrative]", {
              stage,
              fragment: r.fragment,
              sensoryAnchor: r.sensoryAnchor,
              source: r.source,
            });
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    sessionId,
    locale,
    narrativeStage,
    state.acceptedStops,
    state.mood,
    state.who,
    state.intention,
    state.journeyType,
    state.travellerName,
    state.narrativeFragment,
    composeFn,
    setNarrativeFragment,
  ]);




  /** Shared suggestion fetch — reused by composer submit + emotion taps. */
  const refreshSuggestions = useCallback(
    async (
      regionKey: string,
      mood: string | null,
      who: string | null,
      intention: string | null,
      seedText: string,
    ) => {
      if (!sessionId) return;
      const intentString = [mood, intention, who, seedText].filter(Boolean).join(" · ");
      try {
        const sug = await suggestFn({
          data: {
            sessionId,
            intent: intentString || seedText || "experiência",
            regionKey,
            excludedKeys: state.acceptedStops.map((s) => s.key),
          },
        });
        setSuggestionKeys(
          sug.suggestedStopKeys.length > 0 ? sug.suggestedStopKeys : sug.rankedKeys.slice(0, 4),
        );
      } catch {}
    },
    [sessionId, suggestFn, state.acceptedStops],
  );

  /* ── Composer submit (free narration) ── */
  const handleSubmit = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      setComposerBusy(true);
      const fullNarrative = state.narrative ? `${state.narrative}\n${text}` : text;
      try {
        const parsed = await parseFn({ data: { sessionId, narrative: fullNarrative } });
        const regionKey = resolveRegionFromHint(parsed.regionHint ?? null);
        const nextMood = parsed.mood ?? state.mood;
        const nextWho = parsed.who ?? state.who;
        const nextIntention = parsed.intention ?? state.intention;
        patch({
          narrative: fullNarrative,
          mood: nextMood,
          who: nextWho,
          intention: nextIntention,
          pace: parsed.pace ?? state.pace,
          regionKey,
          awakened: true,
        });
        setComposerCollapsed(true);
        await refreshSuggestions(regionKey, nextMood, nextWho, nextIntention, text);
      } catch {
        patch({
          narrative: fullNarrative,
          awakened: true,
          regionKey: state.regionKey ?? "arrabida-setubal",
        });
        setComposerCollapsed(true);
      } finally {
        setComposerBusy(false);
      }
    },
    [
      sessionId,
      parseFn,
      patch,
      refreshSuggestions,
      state.narrative,
      state.mood,
      state.who,
      state.intention,
      state.pace,
      state.regionKey,
    ],
  );

  /* ── Emotion tap (no typing required) ── */
  const handleEmotionPick = useCallback(
    async (pick: ChoicesPick) => {
      const nextMood = pick.mood ?? state.mood;
      const nextWho = pick.who ?? state.who;
      const nextIntention = pick.intention ?? state.intention;
      const nextPace = pick.pace ?? state.pace;
      const nextJourneyType = pick.journeyType ?? state.journeyType;
      const regionKey = state.regionKey ?? "arrabida-setubal";
      const fullNarrative = state.narrative
        ? `${state.narrative} · ${pick.seed}`
        : pick.seed;
      patch({
        narrative: fullNarrative,
        mood: nextMood,
        who: nextWho,
        intention: nextIntention,
        pace: nextPace,
        journeyType: nextJourneyType,
        regionKey,
        awakened: true,
      });
      // Skip suggestion fetch if user chose multi-day — concierge handles it.
      if (nextJourneyType !== "multi") {
        await refreshSuggestions(regionKey, nextMood, nextWho, nextIntention, pick.seed);
      }
    },
    [
      state.mood,
      state.who,
      state.intention,
      state.pace,
      state.journeyType,
      state.regionKey,
      state.narrative,
      patch,
      refreshSuggestions,
    ],
  );

  const handleAccept = useCallback(
    (stop: StudioStop) => {
      acceptStop(stop);
      setSuggestionKeys((keys) => keys.filter((k) => k !== stop.key));
      setRibbonOpen(true);
      window.setTimeout(() => setRibbonOpen(false), 2200);
    },
    [acceptStop],
  );

  const openMemory = () => patch({ closing: true });
  const closeMemory = () => patch({ closing: false });

  /* ── OPENING SCENE — passive prologue (with optional resume banner) ── */
  if (!state.awakened) {
    return (
      <div className="relative">
        <AmbientPrologue
          locale={locale}
          onLocaleChange={setLocale}
          t={t}
          onExit={onExit}
          onAwaken={(seed) => {
            if (seed) setComposerSeed(seed);
            setComposerCollapsed(false);
            patch({ awakened: true });
          }}
        />
        {restored && (
          <div className="fixed inset-x-0 top-[68px] z-40 flex justify-center px-3 pointer-events-none">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/95 backdrop-blur-md border border-[color:var(--gold)]/55 shadow-[0_10px_36px_rgba(0,0,0,0.4)] pl-3 pr-1.5 py-1.5 animate-in fade-in slide-in-from-top-2 duration-500">
              <Sparkles size={12} className="text-[color:var(--gold)]" />
              <span
                className="text-[12px] italic text-[color:var(--charcoal)] mr-1"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {t.resumeTitle}
              </span>
              <button
                type="button"
                onClick={() => {
                  dismissRestored();
                  patch({ awakened: true });
                }}
                className="inline-flex items-center min-h-[34px] rounded-full bg-[color:var(--charcoal)] hover:bg-[color:var(--teal)] text-[color:var(--ivory)] px-3 text-[10.5px] uppercase tracking-[0.22em] font-semibold transition-colors"
              >
                {t.resumeContinue}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 min-h-[34px] rounded-full px-2.5 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/60 hover:text-[color:var(--charcoal)] transition-colors"
                aria-label={t.resumeRestart}
              >
                <RotateCcw size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── LIVING SCENE — cinematic phase progression ──
   *
   * Only ONE emotional layer dominates at any moment:
   *   invitation → awakening → emergence → living → memory
   *
   * Phase is derived from state, not stored, so the world reacts
   * organically as the traveller shapes it.
   */
  const hasStops = state.acceptedStops.length > 0;
  const hasIntent = Boolean(state.mood || state.intention || state.who);
  const hasCoreIntent = Boolean(state.mood && state.who && state.intention);
  const hasSuggestions = suggestionStops.length > 0;

  type Phase = "invitation" | "awakening" | "emergence" | "living" | "memory";
  const phase: Phase = state.closing
    ? "memory"
    : hasStops
      ? "living"
      : hasSuggestions && hasCoreIntent
        ? "emergence"
        : hasIntent
          ? "awakening"
          : "invitation";

  const showChrome = phase !== "invitation";
  const showChapter = phase === "awakening" || phase === "emergence" || phase === "living";
  const showMap = phase === "living";
  const showRibbonToggle = phase === "living";
  const showSaveCta = phase === "living" && state.acceptedStops.length >= 2;
  const studioClip = studioClipFor(state.intention, state.mood);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[color:var(--charcoal)] animate-in fade-in duration-700">
      <AmbientStage
        mood={state.mood}
        regionLabel={regionLabel(state.regionKey)}
        videoUrl={studioClip}
        veil={
          narrativeStage === "reveal"
            ? "medium"
            : narrativeStage === "invitation"
              ? "deep"
              : "medium"
        }
        journeyType={state.journeyType}
        affinity={affinityProfile}
      />

      {/* Transient narrative beat — appears only at stage transitions, then
          dissolves. Slow/intimate travellers (high affinity.pacing) get a
          longer hold; reveal stage holds longest of all (intimate close). */}
      <NarrativeBeat
        fragment={state.narrativeFragment}
        at={state.narrativeFragmentAt}
        holdMs={Math.round(
          (narrativeStage === "reveal" ? 5400 : 4200) + affinityProfile.pacing * 2600,
        )}
      />





      {/* Soft header — fades in only after the world begins reacting */}
      <header
        className={`absolute top-0 inset-x-0 z-30 flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5 transition-opacity duration-[700ms] ${
          showChrome ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!showChrome}
      >
        <div className="flex flex-col gap-2 max-w-[60vw]">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="self-start inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)]/55 hover:text-[color:var(--ivory)] transition-colors"
              aria-label={t.back}
            >
              <ArrowLeft size={11} />
              {t.back}
            </button>
          )}
          {showMap && (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)] animate-in fade-in duration-700">
              <Compass size={11} />
              {t.yourDay}
            </span>
          )}
          {showChapter && <ChapterLine text={state.chapter} />}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-full bg-[color:var(--ivory)]/15 hover:bg-[color:var(--ivory)]/25 text-[color:var(--ivory)]/70 hover:text-[color:var(--ivory)] backdrop-blur transition-colors"
            aria-label={t.resumeRestart}
            title={t.resumeRestart}
          >
            <RotateCcw size={13} />
          </button>
          <LocaleSwitcher locale={locale} onChange={setLocale} tone="light" collapsed />
          {showRibbonToggle && (
            <button
              type="button"
              onClick={() => setRibbonOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/92 backdrop-blur px-3.5 py-2 min-h-[44px] border border-[color:var(--gold)]/40 text-[11.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:border-[color:var(--gold)] transition-colors animate-in fade-in zoom-in-95 duration-500"
              aria-expanded={ribbonOpen}
              aria-controls="itinerary-ribbon"
            >
              {t.yourDay} · {state.acceptedStops.length}
              {ribbonOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </header>

      {/* Whisper — only meaningful once the journey exists */}
      {phase === "living" && (
        <div className="absolute top-[120px] inset-x-0 z-30 flex justify-center px-4">
          <WhisperLayer text={state.whisper} onDismiss={() => setWhisper(null)} />
        </div>
      )}

      {/* Living map — only present once journey is real (phase=living).
          Before that the map is fully out of the visual hierarchy so
          the atmosphere dominates without competing focal points. */}
      <div
        className={`absolute z-10 transition-all duration-[900ms] ease-out ${
          showMap
            ? "left-3 right-3 top-[170px] bottom-[260px] sm:left-6 sm:right-6 sm:top-[180px] sm:bottom-[300px] opacity-100"
            : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[1px] opacity-0 pointer-events-none"
        }`}
        aria-hidden={!showMap}
      >
        <LivingMap
          stops={routedStops}
          regionCenter={regionCenter}
          regionKey={state.regionKey ?? undefined}
          revealed={showMap}
          curtainLabel={t.yourDay}
          locale={locale}
          ribbon={
            state.acceptedStops.length > 0 ? (
              <ItineraryRibbon
                stops={state.acceptedStops}
                totalMinutes={totalMinutes}
                fallbackPhrase={t.suggestionFallback}
                removeLabel={t.resumeRestart}
                titleLabel={t.yourDay}
                onRemove={removeStop}
              />
            ) : null
          }
        />
      </div>

      {ribbonOpen && showRibbonToggle && (
        <div
          id="itinerary-ribbon"
          className="absolute z-30 top-[100px] right-3 sm:right-6 w-[min(92vw,360px)] animate-in fade-in slide-in-from-top-2 duration-500"
        >
          <ItineraryRibbon
            stops={state.acceptedStops}
            totalMinutes={totalMinutes}
            fallbackPhrase={t.suggestionFallback}
            removeLabel={t.resumeRestart}
            titleLabel={t.yourDay}
            onRemove={removeStop}
          />
        </div>
      )}

      {/* ── Cinematic full-screen choices (mood → who → intention) ──
          Replaces the static invitation/awakening chip layouts. One emotional
          question per screen, with 4 video cards as protagonists. */}
      {!hasCoreIntent && state.journeyType !== "multi" && (
        <CinematicChoices
          t={t}
          active={{
            mood: state.mood,
            journeyType: state.journeyType,
            who: state.who,
            intention: state.intention,
          }}
          motionMs={Math.round(480 + affinityProfile.depth * 240)}
          onPick={handleEmotionPick}
          onComplete={() => {
            /* parent re-renders; reveal overlay handles the interlude */
          }}
        />
      )}

      {/* ── Multi-day = the deeper Portugal (NOT a fallback) ── */}
      {state.journeyType === "multi" && !hasStops && (
        <MultiDayConcierge
          t={t}
          mood={state.mood}
          who={state.who}
          intention={state.intention}
          travellerName={state.travellerName}
          onBack={() => patch({ journeyType: null })}
        />
      )}

      {/* ── Quiet name moment — once, between depth and who.
          Inserted only after mood + journey type are chosen so it does not
          interrupt the very first emotional spark. Skipping is first-class. */}
      {state.mood &&
        state.journeyType === "day" &&
        !state.who &&
        !state.nameAsked && (
          <NameWhisper
            prompt={t.nameWhisper.prompt}
            placeholder={t.nameWhisper.placeholder}
            acceptLabel={t.nameWhisper.accept}
            skipLabel={t.nameWhisper.skip}
            onSubmit={(name) => patch({ travellerName: name, nameAsked: true })}
            onSkip={() => patch({ nameAsked: true })}
          />
        )}

      {/* ── Reveal interlude — Portugal is responding ── */}
      {hasCoreIntent && !hasStops && !revealPlayed && (
        <JourneyReveal
          cue={t.awakeningCue}
          title={state.proposal?.title ?? null}
          subtitle={state.proposal?.subtitle ?? null}
          onDone={() => setRevealPlayed(true)}
        />
      )}


      {/* ── Phase: EMERGENCE ──
          Suggestions emerge softly from the atmosphere. No map yet,
          no composer — just the cinematic reveal of curated options. */}
      {phase === "emergence" && revealPlayed && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-[900ms]">
          <EmergingChips
            suggestions={suggestionStops}
            acceptedKeys={state.acceptedStops.map((s) => s.key)}
            fallbackPhrase={t.suggestionFallback}
            addLabel={t.composerSend}
            cues={t.emergingCues}
            pacing={affinityProfile.pacing}
            onAccept={handleAccept}
          />

        </div>
      )}

      {/* ── Phase: LIVING ──
          Journey exists. Map dominates as protagonist. Suggestions + composer
          live quietly at the bottom. */}
      {phase === "living" && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 flex flex-col gap-3 animate-in fade-in duration-[700ms]">
          {showSaveCta && (
            <div className="flex justify-center animate-in fade-in slide-in-from-bottom-1 duration-500">
              <button
                type="button"
                onClick={openMemory}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--charcoal)]/85 backdrop-blur px-4 py-2 text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] border border-[color:var(--gold)]/40 hover:border-[color:var(--gold)] hover:bg-[color:var(--charcoal)] transition-colors min-h-[40px]"
              >
                <BookmarkPlus size={13} className="text-[color:var(--gold)]" />
                {t.saveStory}
              </button>
            </div>
          )}

          <EmergingChips
            suggestions={suggestionStops}
            acceptedKeys={state.acceptedStops.map((s) => s.key)}
            fallbackPhrase={t.suggestionFallback}
            addLabel={t.composerSend}
            cues={t.emergingCues}
            pacing={affinityProfile.pacing}
            onAccept={handleAccept}
          />


          <div className="flex justify-center">
            <div
              key={composerCollapsed ? "pill" : "sheet"}
              className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-500 ease-out"
            >
              {composerCollapsed ? (
                <div className="flex justify-center">
                  <NarrativeComposer
                    busy={composerBusy}
                    collapsed
                    t={t}
                    seed={composerSeed}
                    onExpand={() => setComposerCollapsed(false)}
                    onSubmit={handleSubmit}
                  />
                </div>
              ) : (
                <NarrativeComposer
                  busy={composerBusy}
                  collapsed={false}
                  t={t}
                  seed={composerSeed}
                  onSubmit={handleSubmit}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {state.closing && state.regionKey && (
        <MemoryCard
          stops={state.acceptedStops}
          regionKey={state.regionKey}
          pace={state.pace}
          totalMinutes={totalMinutes}
          chapter={state.chapter}
          farewell={state.chapter}
          proposal={state.proposal}
          onClose={closeMemory}
        />

      )}
    </div>
  );
}
