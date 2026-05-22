import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BookmarkPlus, ChevronDown, ChevronUp, Compass } from "lucide-react";

import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import {
  regionLabel,
  resolveRegionFromHint,
  useStudioState,
  type StudioStop,
} from "@/hooks/useStudioState";
import { useStudioLocale } from "@/hooks/useStudioLocale";
import { parseNarrative } from "@/server/builderNarrative.functions";
import { suggestFromIntent } from "@/server/builderIntent.functions";
import { listRegionStops } from "@/server/builderEngine.functions";
import { suggestPacing } from "@/server/builderPacing.functions";
import { generateChapter } from "@/server/builderChapter.functions";

import { AmbientStage } from "./AmbientStage";
import { AmbientPrologue } from "./AmbientPrologue";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NarrativeComposer } from "./NarrativeComposer";
import { ChapterLine } from "./ChapterLine";
import { EmergingChips } from "./EmergingChips";
import { LivingMap } from "./LivingMap";
import { ItineraryRibbon } from "./ItineraryRibbon";
import { WhisperLayer } from "./WhisperLayer";
import { MemoryCard } from "./MemoryCard";

/**
 * StudioStageV3 — Living Atmosphere.
 *
 * A single fullscreen cinematic scene. No steps. No cards. The user narrates,
 * the world reacts: ambient mood shifts, chapter line writes itself, real
 * stops emerge as floating chips, map awakens with the first acceptance,
 * itinerary ribbon assembles itself, pacing whispers appear when needed,
 * and the journey closes into a shareable memory card.
 */

interface CatalogEntry {
  key: string;
  label: string;
  blurb: string | null;
  tag: string | null;
  lat: number;
  lng: number;
  duration_minutes: number;
}

export function StudioStageV3({ onExit }: { onExit?: () => void }) {
  const sessionId = useBuilderSessionId();
  const { locale, setLocale, t } = useStudioLocale();
  const {
    state,
    patch,
    acceptStop,
    removeStop,
    setWhisper,
    routedStops,
    regionCenter,
    totalMinutes,
  } = useStudioState();

  const parseFn = useServerFn(parseNarrative);
  const suggestFn = useServerFn(suggestFromIntent);
  const listFn = useServerFn(listRegionStops);
  const pacingFn = useServerFn(suggestPacing);
  const chapterFn = useServerFn(generateChapter);

  const [composerCollapsed, setComposerCollapsed] = useState(true);
  const [composerBusy, setComposerBusy] = useState(false);
  const [catalog, setCatalog] = useState<Map<string, CatalogEntry>>(new Map());
  const [suggestionKeys, setSuggestionKeys] = useState<string[]>([]);
  const [ribbonOpen, setRibbonOpen] = useState(false);
  const [composerSeed, setComposerSeed] = useState<string | undefined>(undefined);
  const lastChapterReqRef = useRef<string>("");

  /* ── Load region catalog whenever the region changes ── */
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
      .catch(() => {
        /* silent — chips simply won't appear; world is still navigable */
      });
  }, [state.regionKey, listFn]);

  /* ── Resolve suggestion keys to full StudioStop objects ── */
  const suggestionStops = useMemo<StudioStop[]>(() => {
    const acceptedSet = new Set(state.acceptedStops.map((s) => s.key));
    const out: StudioStop[] = [];
    for (const k of suggestionKeys) {
      if (acceptedSet.has(k)) continue;
      const c = catalog.get(k);
      if (c) out.push(c);
      if (out.length >= 4) break;
    }
    // If suggestions are empty/exhausted, surface a few from catalog directly.
    if (out.length < 3) {
      for (const c of catalog.values()) {
        if (acceptedSet.has(c.key) || out.some((x) => x.key === c.key)) continue;
        out.push(c);
        if (out.length >= 4) break;
      }
    }
    return out;
  }, [suggestionKeys, catalog, state.acceptedStops]);

  /* ── Generate chapter line when context shifts (debounced) ── */
  useEffect(() => {
    if (!sessionId) return;
    if (!state.awakened) return;
    const key = `${state.mood}|${state.who}|${state.intention}|${state.regionKey}|${state.acceptedStops.map((s) => s.key).join(",")}`;
    if (key === lastChapterReqRef.current) return;
    lastChapterReqRef.current = key;
    const t = window.setTimeout(() => {
      chapterFn({
        data: {
          sessionId,
          mood: state.mood,
          who: state.who,
          intention: state.intention,
          pace: state.pace,
          regionLabel: regionLabel(state.regionKey),
          stopLabels: state.acceptedStops.map((s) => s.label),
          kind: "chapter",
          locale,
        },
      })
        .then((r) => patch({ chapter: r.line }))
        .catch(() => {
          /* silent */
        });
    }, 350);
    return () => window.clearTimeout(t);
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

  /* Also re-fetch chapter when locale changes (force fresh request). */
  useEffect(() => {
    lastChapterReqRef.current = "";
  }, [locale]);

  /* ── Pacing whisper when itinerary changes ── */
  useEffect(() => {
    if (!sessionId) return;
    if (state.acceptedStops.length < 2) return;
    const t = window.setTimeout(() => {
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
        .catch(() => {
          /* silent */
        });
    }, 900);
    return () => window.clearTimeout(t);
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

  /* ── Composer submit: parse → set context → fetch suggestions ── */
  const handleSubmit = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      setComposerBusy(true);
      const fullNarrative = state.narrative
        ? `${state.narrative}\n${text}`
        : text;
      try {
        const parsed = await parseFn({
          data: { sessionId, narrative: fullNarrative },
        });
        const regionKey = resolveRegionFromHint(parsed.regionHint ?? null);
        patch({
          narrative: fullNarrative,
          mood: parsed.mood ?? state.mood,
          who: parsed.who ?? state.who,
          intention: parsed.intention ?? state.intention,
          pace: parsed.pace ?? state.pace,
          regionKey,
          awakened: true,
        });
        setComposerCollapsed(true);

        // Fetch ranked suggestions for this region+intent.
        const intentString = [
          parsed.mood ?? state.mood,
          parsed.intention ?? state.intention,
          parsed.who ?? state.who,
          text,
        ]
          .filter(Boolean)
          .join(" · ");
        const sug = await suggestFn({
          data: {
            sessionId,
            intent: intentString || text,
            regionKey,
            excludedKeys: state.acceptedStops.map((s) => s.key),
          },
        });
        setSuggestionKeys(sug.suggestedStopKeys.length > 0 ? sug.suggestedStopKeys : sug.rankedKeys.slice(0, 4));
      } catch {
        // On error, still awaken & let catalog seed suggestions.
        patch({ narrative: fullNarrative, awakened: true, regionKey: state.regionKey ?? "arrabida-setubal" });
        setComposerCollapsed(true);
      } finally {
        setComposerBusy(false);
      }
    },
    [
      sessionId,
      parseFn,
      suggestFn,
      patch,
      state.narrative,
      state.mood,
      state.who,
      state.intention,
      state.pace,
      state.regionKey,
      state.acceptedStops,
    ],
  );

  const handleAccept = useCallback(
    (stop: StudioStop) => {
      acceptStop(stop);
      // Remove from active suggestions
      setSuggestionKeys((keys) => keys.filter((k) => k !== stop.key));
      setRibbonOpen(true);
      // Auto-collapse ribbon after a beat so the world stays open
      window.setTimeout(() => setRibbonOpen(false), 2200);
    },
    [acceptStop],
  );

  const openMemory = () => patch({ closing: true });
  const closeMemory = () => patch({ closing: false });

  /* ── OPENING SCENE — passive cinematic prologue ── */
  if (!state.awakened) {
    return (
      <AmbientPrologue
        locale={locale}
        onLocaleChange={setLocale}
        t={t}
        onExit={onExit}
        onAwaken={(seed) => {
          if (seed) setComposerSeed(seed);
          setComposerCollapsed(false);
          // Mark awakened so the living scene mounts; if no seed, composer waits open.
          patch({ awakened: true });
        }}
      />
    );
  }

  /* ── LIVING SCENE — post-awakened ── */
  const hasStops = state.acceptedStops.length > 0;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[color:var(--charcoal)]">
      <AmbientStage
        mood={state.mood}
        regionLabel={regionLabel(state.regionKey)}
        veil={hasStops ? "medium" : "deep"}
      />

      {/* Top bar — minimal */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
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
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
            <Compass size={11} />
            {regionLabel(state.regionKey)}
          </span>
          <ChapterLine text={state.chapter} />
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher locale={locale} onChange={setLocale} tone="light" />
          {hasStops && (
            <button
              type="button"
              onClick={() => setRibbonOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/92 backdrop-blur px-3.5 py-2 min-h-[44px] border border-[color:var(--gold)]/40 text-[11.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:border-[color:var(--gold)] transition-colors"
              aria-expanded={ribbonOpen}
              aria-controls="itinerary-ribbon"
            >
              {t.yourDay} · {state.acceptedStops.length}
              {ribbonOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </header>

      {/* Whisper layer */}
      <div className="absolute top-[120px] inset-x-0 z-30 flex justify-center px-4">
        <WhisperLayer text={state.whisper} onDismiss={() => setWhisper(null)} />
      </div>

      {/* Living map — fades in when first stop accepted */}
      <div
        className={`absolute z-10 transition-all duration-[700ms] ${
          hasStops
            ? "left-3 right-3 top-[170px] bottom-[260px] sm:left-6 sm:right-6 sm:top-[180px] sm:bottom-[280px]"
            : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[1px] opacity-0 pointer-events-none"
        }`}
      >
        <LivingMap
          stops={routedStops}
          regionCenter={regionCenter}
          regionKey={state.regionKey ?? undefined}
          revealed={hasStops}
        />
      </div>

      {/* Itinerary ribbon — drops down from the toggle */}
      {ribbonOpen && hasStops && (
        <div
          id="itinerary-ribbon"
          className="absolute z-30 top-[100px] right-3 sm:right-6 w-[min(92vw,360px)]"
        >
          <ItineraryRibbon
            stops={state.acceptedStops}
            totalMinutes={totalMinutes}
            onRemove={removeStop}
          />
        </div>
      )}

      {/* Emerging chips + composer at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 flex flex-col gap-3">
        {/* "Save journey" pill — appears when 2+ stops */}
        {state.acceptedStops.length >= 2 && (
          <div className="flex justify-center">
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
          onAccept={handleAccept}
        />

        <div className="flex justify-center">
          {composerCollapsed ? (
            <NarrativeComposer
              busy={composerBusy}
              collapsed
              t={t}
              seed={composerSeed}
              onExpand={() => setComposerCollapsed(false)}
              onSubmit={handleSubmit}
            />
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

      {/* Closing memory card */}
      {state.closing && state.regionKey && (
        <MemoryCard
          stops={state.acceptedStops}
          regionKey={state.regionKey}
          pace={state.pace}
          totalMinutes={totalMinutes}
          chapter={state.chapter}
          farewell={state.chapter}
          onClose={closeMemory}
        />
      )}
    </div>
  );
}
