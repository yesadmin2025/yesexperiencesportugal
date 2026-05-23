import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Map as MapIcon, Sparkles, X } from "lucide-react";

import { generateBuilderRoute, narrateBuilderRoute } from "@/server/builderEngine.functions";
import { supabase } from "@/integrations/supabase/client";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { CtaButton } from "@/components/ui/CtaButton";

import { TripTypeEntry, type TripPreset } from "@/components/builder/TripTypeEntry";
import { PredictiveMoment } from "@/components/builder/PredictiveMoment";
import { ElementsShelf } from "@/components/builder/ElementsShelf";
import { elementLabel, type ElementKey } from "@/components/builder/elements";
import { useBuilderPersistence } from "@/hooks/useBuilderPersistence";
import { trackBuilderEvent } from "@/lib/builder-analytics";
// Leaflet touches `window` at module load — lazy-load to keep it out of SSR.
const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);
import { JourneyPanel } from "@/components/builder/JourneyPanel";
import { StickyBar } from "@/components/builder/StickyBar";
import { ReviewScreen } from "@/components/builder/ReviewScreen";
import { MultiDayBuilder } from "@/components/builder/MultiDayBuilder";
import { useMultiDayBuilder } from "@/hooks/useMultiDayBuilder";
import {
  ChoiceTile,
  MoodCard,
  StepHead,
} from "@/components/builder/Choices";
import {
  RegionStep,
  BUILDER_REGIONS,
  type BuilderRegionKey,
} from "@/components/builder/RegionStep";
import { BuilderStepper } from "@/components/builder/BuilderStepper";
import { BuilderMobileStepSummary } from "@/components/builder/BuilderMobileStepSummary";
import { BuilderDebugPanel } from "@/components/builder/BuilderDebugPanel";
import { BuilderProgressMeter } from "@/components/builder/BuilderProgressMeter";
import { MoodGridSkeleton } from "@/components/builder/Skeletons";
import {
  INTENTIONS,
  MOODS,
  PACES,
  TRANSITION_MICROCOPY,
  WHOS,
} from "@/components/builder/catalogue";
import { NarrativeIntro } from "@/components/builder/NarrativeIntro";
import { NarrativeCompanion } from "@/components/builder/NarrativeCompanion";
import { StudioStageV3 } from "@/components/builder/v3/StudioStageV3";
import { StudioDrift } from "@/components/builder/v3/StudioDrift";


/** Resolve a human label for current selections, used by the live header. */
function labelFor<T extends { id: string; label: string }>(
  list: readonly T[],
  id: string | undefined,
): string | null {
  if (!id) return null;
  return list.find((x) => x.id === id)?.label ?? null;
}
import type {
  Intention,
  Mood,
  Pace,
  RouteUI,
  RoutedStopUI,
  Who,
} from "@/components/builder/types";
import { useBuilderRouteImages, useBuilderMoodImages } from "@/hooks/useBuilderImages";
import {
  parseBuilderSearch,
  type BuilderSearch,
} from "@/components/builder/searchParams";

/* ────────────────────────────────────────────────────────────────
   Builder v6 — Fluid Experience Studio
   Steps: 0 entry · 1 mood · 2 who · 3 intention · 4 pace ·
          5 predictive moment · 6 live builder · 7 review · checkout
   Logic = Postgres + server fns. Narrative = AI over real route.
   Booking = Stripe (TEST MODE). WhatsApp = "Chat with a local".
──────────────────────────────────────────────────────────────── */

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type MobileTab = "build" | "map" | "story";

export const Route = createFileRoute("/builder")({
  validateSearch: parseBuilderSearch,
  head: () => ({
    meta: [
      { title: "Create your Portugal experience — YES" },
      {
        name: "description",
        content:
          "Choose what feels right. We'll shape a real, achievable Portugal experience in real time — adjust everything, confirm instantly.",
      },
      { property: "og:title", content: "Create your Portugal experience — YES" },
      {
        property: "og:description",
        content:
          "Not a form. A live experience taking shape as you choose. Real route, real stops, instant confirmation.",
      },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/builder" });

  // Experience Studio v3 (Living Atmosphere) — fullscreen conversational stage.
  // Escape hatch: append `?legacy=1` to fall back to the v1/v2 stepper flow.
  // (Standalone drift prototype lives at /studio-drift — kept separate on purpose.)
  const isLegacy =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("legacy") === "1";
  if (!isLegacy) {
    return (
      <StudioStageV3
        onExit={() => {
          void navigate({ to: "/" });
        }}
      />
    );
  }





  const step = search.step ?? 0;
  const region = search.region;
  const mood = search.mood;
  const who = search.who;
  const intention = search.intention;
  const pace: Pace = search.pace ?? "balanced";

  const setSearch = useCallback(
    (patch: Partial<BuilderSearch>) => {
      void navigate({
        search: (prev: BuilderSearch) => ({ ...prev, ...patch }),
        replace: false,
      });
    },
    [navigate],
  );

  const setStep = useCallback((s: Step) => setSearch({ step: s }), [setSearch]);
  const setRegion = useCallback(
    (r: BuilderRegionKey) => setSearch({ region: r }),
    [setSearch],
  );
  const setMood = useCallback((m: Mood) => setSearch({ mood: m }), [setSearch]);
  const setWho = useCallback((w: Who) => setSearch({ who: w }), [setSearch]);
  const setIntention = useCallback((i: Intention) => setSearch({ intention: i }), [setSearch]);
  const setPace = useCallback((p: Pace) => setSearch({ pace: p }), [setSearch]);

  // Step 3 supports multi-select. URL keeps the primary intention (first chosen)
  // so the engine + share-links stay backwards compatible; the full set lives
  // in component state and biases the picker / narrative tone.
  // Hydrated from persistence below so it survives refresh / return visits.
  const [intentions, setIntentions] = useState<Intention[]>(() =>
    search.intention ? [search.intention] : [],
  );
  useEffect(() => {
    if (search.intention && !intentions.includes(search.intention)) {
      setIntentions((prev) => (prev.length === 0 ? [search.intention as Intention] : prev));
    }
    if (!search.intention && intentions.length > 0) {
      setIntentions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.intention]);
  const toggleIntention = useCallback(
    (id: Intention) => {
      setIntentions((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        const primary = next[0];
        if (primary !== search.intention) setSearch({ intention: primary });
        return next;
      });
    },
    [search.intention, setSearch],
  );

  const [microcopy, setMicrocopy] = useState<string | null>(null);
  const [narrativeApplied, setNarrativeApplied] = useState(false);


  const [route, setRoute] = useState<RouteUI | null>(null);
  const [pinned] = useState<string[]>([]);

  // Persisted slice (localStorage): excluded stops, manual order, guests, elements,
  // intentions (multi-select), and furthest step reached.
  // URL keeps step/mood/who/intention/pace; this hook keeps everything else
  // across refresh / return-visits.
  const { state: persisted, setState: setPersisted, hydrated, reset: resetPersisted } = useBuilderPersistence();
  const excluded = persisted.excluded;
  const orderOverride = persisted.orderOverride;
  const selectedElements = persisted.selectedElements;

  // Hydrate intentions from persistence once (only if URL didn't already supply one).
  const hydratedIntentionsRef = useRef(false);
  useEffect(() => {
    if (!hydrated || hydratedIntentionsRef.current) return;
    hydratedIntentionsRef.current = true;
    if (!search.intention && persisted.intentions.length > 0) {
      setIntentions(persisted.intentions);
      setSearch({ intention: persisted.intentions[0] });
    }
  }, [hydrated, persisted.intentions, search.intention, setSearch]);

  // Persist intentions on change (after hydration to avoid clobbering on first paint).
  useEffect(() => {
    if (!hydrated) return;
    setPersisted((p) =>
      p.intentions.length === intentions.length &&
      p.intentions.every((v, i) => v === intentions[i])
        ? p
        : { ...p, intentions },
    );
  }, [intentions, hydrated, setPersisted]);

  // Track furthest step reached (for stepper "completed" visuals after refresh).
  useEffect(() => {
    if (!hydrated) return;
    setPersisted((p) => (step > p.furthestStep ? { ...p, furthestStep: step } : p));
  }, [step, hydrated, setPersisted]);
  const furthestCompleted = Math.max(0, persisted.furthestStep - 1);

  // Multi-day state (replaces single-day in step 6+)
  const md = useMultiDayBuilder();
  const guests = md.state.guests;

  const setExcluded = useCallback(
    (next: string[]) => setPersisted((p) => ({ ...p, excluded: next })),
    [setPersisted],
  );
  const setOrderOverride = useCallback(
    (next: string[] | null) => setPersisted((p) => ({ ...p, orderOverride: next })),
    [setPersisted],
  );
  const setGuests = useCallback(
    (n: number) => md.setGuests(n),
    [md],
  );

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [narrative, setNarrative] = useState<string>("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const [mobileTab, setMobileTab] = useState<MobileTab>("build");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const toggleElement = useCallback(
    (key: ElementKey) => {
      setPersisted((p) => ({
        ...p,
        selectedElements: p.selectedElements.includes(key)
          ? p.selectedElements.filter((k) => k !== key)
          : [...p.selectedElements, key],
      }));
    },
    [setPersisted],
  );

  /** Wipe persisted slice + URL state and return to entry. */
  const resetBuilder = useCallback(
    (source: "header" | "review" = "header") => {
      if (typeof window !== "undefined") {
        const ok = window.confirm(
          "Start over? This clears your selected stops, pace, elements, and guests.",
        );
        if (!ok) return;
      }
      void trackBuilderEvent(source === "review" ? "review_reset" : "reset", {
        source,
      });
      resetPersisted();
      setRoute(null);
      setNarrative("");
      setRouteError(null);
      setMobileTab("build");
      setCheckoutOpen(false);
      void navigate({
        search: () => ({ step: 0 }) as BuilderSearch,
        replace: true,
      });
    },
    [resetPersisted, navigate],
  );

  const fetchRoute = useCallback(
    async (opts?: { nextExcluded?: string[]; nextPace?: Pace }) => {
      if (!mood || !who || !intention) return;
      setRouteLoading(true);
      setRouteError(null);
      try {
        const result = await generateBuilderRoute({
          data: {
            mood,
            who,
            intention,
            regionKey: region,
            pace: opts?.nextPace ?? pace,
            excludedStopKeys: opts?.nextExcluded ?? excluded,
            pinnedStopKeys: pinned,
          },
        });
        setRoute(result.route as RouteUI);
        setOrderOverride(null);
      } catch (e) {
        console.error("[builder] generateRoute failed", e);
        setRouteError("Couldn't shape your day right now. Try again.");
      } finally {
        setRouteLoading(false);
      }
    },
    [mood, who, intention, region, pace, excluded, pinned],
  );

  // Trigger initial generation when entering predictive moment / live builder.
  // Wait for persistence to hydrate so a refreshed user keeps their excluded
  // stops on the very first route fetch.
  useEffect(() => {
    if (!hydrated) return;
    if ((step === 5 || step === 6 || step === 7) && mood && who && intention && !route && !routeLoading) {
      void fetchRoute();
    }
  }, [hydrated, step, mood, who, intention, route, routeLoading, fetchRoute]);

  // Seed Day 1 from the engine route once we land in the multi-day builder
  // (only when the user hasn't already shaped a day themselves).
  useEffect(() => {
    if (step !== 6 || !route || !md.hydrated || !md.activeDay) return;
    if (md.state.days.length === 1 && md.activeDay.stopKeys.length === 0) {
      md.updateDay(md.activeDay.id, {
        regionKey: route.region.key,
        stopKeys: route.stops.map((s) => s.key),
      });
    }
  }, [step, route, md.hydrated, md.activeDay, md.state.days.length, md.updateDay]);

  // Apply user-driven reordering on top of engine stops
  const stops: RoutedStopUI[] = useMemo(() => {
    if (!route) return [];
    if (!orderOverride) return route.stops;
    const map = new Map(route.stops.map((s) => [s.key, s]));
    const reordered: RoutedStopUI[] = [];
    for (const k of orderOverride) {
      const s = map.get(k);
      if (s) reordered.push(s);
    }
    for (const s of route.stops) if (!orderOverride.includes(s.key)) reordered.push(s);
    return reordered;
  }, [route, orderOverride]);

  // Narrative — fetched from AI based on the real route
  useEffect(() => {
    if (!route || !mood || !who || !intention || stops.length === 0) {
      setNarrative("");
      return;
    }
    let cancelled = false;
    setNarrativeLoading(true);
    const keys = stops.map((s) => s.key);
    narrateBuilderRoute({
      data: {
        routeStopKeys: keys,
        mood,
        who,
        intention,
        pace: route.pace,
        regionKey: route.region.key,
      },
    })
      .then((r) => {
        if (!cancelled) setNarrative(r.narrative ?? "");
      })
      .catch((e) => {
        console.error("[builder] narrate failed", e);
        if (!cancelled) setNarrative("");
      })
      .finally(() => {
        if (!cancelled) setNarrativeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route, mood, who, intention, stops]);

  /** Show transient microcopy for ~380ms then advance to nextStep.
   *  Guardrail: in dev, asserts the URL step search-param actually moved. */
  const lastAdvanceTargetRef = useRef<Step | null>(null);
  const flashAndAdvance = useCallback(
    (text: string, nextStep: Step) => {
      setMicrocopy(text);
      lastAdvanceTargetRef.current = nextStep;
      window.setTimeout(() => {
        setStep(nextStep);
        setMicrocopy(null);
      }, 380);
    },
    [setStep],
  );

  // Dev-only guardrail: warn if a flashAndAdvance target wasn't reached.
  useEffect(() => {
    if (import.meta.env.DEV && lastAdvanceTargetRef.current === step) {
      lastAdvanceTargetRef.current = null;
    }
  }, [step]);


  // Live-feedback toast (transient, fades after each interaction)
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const flashLive = useCallback((text: string) => {
    setLiveToast(text);
    window.setTimeout(() => setLiveToast(null), 1400);
  }, []);

  const pickPraise = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)];

  const onPaceChange = (p: Pace) => {
    if (p === pace) return;
    setPace(p);
    flashLive(pickPraise(["Shaping your route", "Adjusting the rhythm", "Reshaping the day"]));
    if (route) void fetchRoute({ nextPace: p });
  };

  const onRemoveStop = (key: string) => {
    const nextExcluded = [...excluded, key];
    setExcluded(nextExcluded);
    flashLive(pickPraise(["Updating your day", "Got it — reshaping", "Refining the route"]));
    void fetchRoute({ nextExcluded });
  };

  const onAddBackStop = (key: string) => {
    const nextExcluded = excluded.filter((k) => k !== key);
    setExcluded(nextExcluded);
    flashLive(pickPraise(["Nice choice", "That works well", "Adding it back in"]));
    void fetchRoute({ nextExcluded });
  };

  const onMove = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= stops.length) return;
    const next = stops.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrderOverride(next.map((s) => s.key));
    flashLive("Reordering");
  };

  // Pool for "removed — add back" surface in the journey panel
  const removablePool = useMemo(() => {
    if (!route) return [];
    return route.stops.map((s) => ({ key: s.key, label: s.label }));
  }, [route]);

  const moodIds = useMemo(() => MOODS.map((m) => m.id), []);
  const { moodImages, loading: moodImagesLoading } = useBuilderMoodImages(moodIds);
  const routeImages = useBuilderRouteImages({
    regionKey: route?.region.key,
    stopKeys: stops.map((s) => s.key),
    mood,
    occasion: intention,
  });

  return (
    <div className="builder-stage min-h-[100dvh] bg-[color:var(--ivory)] text-[color:var(--charcoal)]">
      <article className="bg-[color:var(--ivory)] text-[color:var(--charcoal)]">
        <BuilderDebugPanel
          state={{
            urlStep: step,
            urlMood: mood,
            urlWho: who,
            urlIntention: intention,
            urlPace: pace,
            intentions,
            furthestStep: persisted.furthestStep,
            excluded: persisted.excluded,
            orderOverride: persisted.orderOverride,
            guests: persisted.guests,
            selectedElements: persisted.selectedElements,
            hydrated,
          }}
        />
        {/* Live-feedback toast — visible during step 6 interactions */}
        {liveToast && step === 6 && (
          <div
            aria-live="polite"
            className="fixed top-20 left-1/2 z-[60] -translate-x-1/2 builder-toast-in"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--ivory)]/95 px-3.5 py-1.5 text-[11.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)] shadow-[0_8px_22px_-10px_rgba(46,46,46,0.35)] backdrop-blur">
              <Sparkles size={11} className="text-[color:var(--gold)]" />
              {liveToast}
            </span>
          </div>
        )}

        {/* STEP 0 — Trip type entry (8 cards · concierge gating · always book instantly) */}
        {step === 0 && (
          <TripTypeEntry
            onChoose={(preset: TripPreset) => {
              // Apply preset selections, then jump to the first unset step.
              const next: Partial<BuilderSearch> = { ...preset };
              const nextMood = preset.mood ?? mood;
              const nextWho = preset.who ?? who;
              const nextIntention = preset.intention ?? intention;
              if (!nextMood) next.step = 1;
              else if (!nextWho) next.step = 2;
              else if (!nextIntention) next.step = 3;
              else next.step = 4;
              setSearch(next);
            }}
          />
        )}

        {/* STEPS 1–4 — selection flow */}
        {step >= 1 && step <= 4 && (
          <section className="container-x pt-6 pb-10 md:pt-10 md:pb-16">
            <div className="mb-3 sm:mb-5 builder-reveal space-y-3">
              <BuilderMobileStepSummary
                step={step}
                furthestCompleted={furthestCompleted}
                onJump={(n: 1 | 2 | 3 | 4) => setStep(n as Step)}
              />
              <BuilderStepper
                step={step}
                furthestCompleted={furthestCompleted}
                onStepClick={(n) => setStep(n as Step)}
              />
            </div>

            {/* Microcopy ribbon */}
            {microcopy && (
              <p
                className="mb-6 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] font-semibold text-[color:var(--gold)] builder-microcopy"
                aria-live="polite"
              >
                <Sparkles size={12} />
                {microcopy}
              </p>
            )}

            {step === 1 && !region && (
              <div key="step-1-region" className="builder-step-in">
                <RegionStep
                  selected={region}
                  onChoose={(r) => {
                    setRegion(r);
                  }}
                />
              </div>
            )}

            {step === 1 && region && (
              <div key="step-1" className="builder-step-in">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <StepHead num={1} totalChapters={6} eyebrow="Capítulo 01 — Mood" title="What are you in the mood for?" italicSub="Begin with feeling. The map will follow." />
                </div>
                <button
                  type="button"
                  onClick={() => setSearch({ region: undefined })}
                  className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/70 hover:text-[color:var(--gold)] transition-colors"
                  aria-label="Change region"
                >
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
                  {BUILDER_REGIONS.find((r) => r.key === region)?.label ?? region}
                  <span className="text-[color:var(--charcoal)]/40">· change</span>
                </button>
                <NarrativeIntro
                  applied={narrativeApplied}
                  onReset={() => {
                    setNarrativeApplied(false);
                    setSearch({ mood: undefined, who: undefined, intention: undefined, pace: "balanced" });
                    setIntentions([]);
                  }}
                  onApply={(parsed) => {
                    const patch: Partial<BuilderSearch> = {};
                    if (parsed.mood) patch.mood = parsed.mood;
                    if (parsed.who) patch.who = parsed.who;
                    if (parsed.intention) {
                      patch.intention = parsed.intention;
                      setIntentions([parsed.intention]);
                    }
                    if (parsed.pace) patch.pace = parsed.pace;
                    if (Object.keys(patch).length > 0) {
                      setSearch(patch);
                      setNarrativeApplied(true);
                    }
                  }}
                />
                {moodImagesLoading && Object.keys(moodImages).length === 0 ? (
                  <MoodGridSkeleton count={MOODS.length} />
                ) : (
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {MOODS.map((m) => (
                      <MoodCard
                        key={m.id}
                        selected={mood === m.id}
                        onClick={() => {
                          setMood(m.id);
                          flashAndAdvance(TRANSITION_MICROCOPY.mood, 2);
                        }}
                        label={m.label}
                        sub={m.sub}
                        cover={m.cover}
                        realCover={moodImages[m.id] ?? null}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div key="step-2" className="builder-step-in">
                <StepHead num={2} totalChapters={6} eyebrow="Capítulo 02 — Company" title="Who is this for?" italicSub="Who you travel with quietly shapes the day." onBack={() => setStep(1)} />
                <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {WHOS.map((w) => (
                    <ChoiceTile
                      key={w.id}
                      selected={who === w.id}
                      onClick={() => {
                        setWho(w.id);
                        flashAndAdvance(TRANSITION_MICROCOPY.who, 3);
                      }}
                      label={w.label}
                      sub={w.sub}
                      Icon={w.icon}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div key="step-3" className="builder-step-in pb-28 sm:pb-0">
                <StepHead
                  num={3}
                  eyebrow="Intention"
                  title="What matters most?"
                  onBack={() => setStep(2)}
                />
                <p
                  id="intentions-help"
                  className="mt-3 text-[13.5px] sm:text-[13px] text-[color:var(--charcoal)]/70 leading-relaxed [text-wrap:pretty]"
                >
                  {intentions.length === 0 ? (
                    <>
                      Pick <span className="font-semibold text-[color:var(--charcoal)]">one or more</span>{" "}
                      threads. Each one shapes the day's rhythm and the story we write —{" "}
                      combine a few and we'll weave them together into a single, layered narrative.
                    </>
                  ) : intentions.length === 1 ? (
                    <>
                      Good — your day will lean into{" "}
                      <span className="font-semibold text-[color:var(--charcoal)]">{
                        INTENTIONS.find((it) => it.id === intentions[0])?.label.toLowerCase()
                      }</span>. Add a second thread to layer the story.
                    </>
                  ) : (
                    <>
                      We'll braid{" "}
                      <span className="font-semibold text-[color:var(--charcoal)]">
                        {intentions
                          .map((id) => INTENTIONS.find((it) => it.id === id)?.label.toLowerCase())
                          .filter(Boolean)
                          .join(" · ")}
                      </span>{" "}
                      into one layered day. The first you picked sets the lead voice of the story.
                    </>
                  )}
                </p>
                <div
                  className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold"
                  aria-live="polite"
                >
                  <span
                    className={[
                      "inline-flex items-center gap-1.5",
                      intentions.length > 0 ? "text-[color:var(--gold)]" : "text-[color:var(--charcoal)]/45",
                    ].join(" ")}
                  >
                    <Sparkles size={11} aria-hidden="true" />
                    {intentions.length === 0
                      ? "Nothing selected yet"
                      : `${intentions.length} thread${intentions.length === 1 ? "" : "s"} selected`}
                  </span>
                </div>

                {/* Builder progress — overall step + live interest fill within step 3 */}
                <BuilderProgressMeter
                  step={step}
                  selectedCount={intentions.length}
                  hint={
                    intentions.length === 0
                      ? "Pick an interest to move forward — two more steps after this."
                      : intentions.length === 1
                        ? "Add another thread for a richer story, or continue."
                        : intentions.length === 2
                          ? "Nicely layered. One more step after rhythm."
                          : "Beautifully layered. Continue when ready."
                  }
                />

                <div
                  role="group"
                  aria-label="Interests — choose one or more"
                  aria-describedby="intentions-help"
                  className="mt-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                >
                  {INTENTIONS.map((it) => (
                    <ChoiceTile
                      key={it.id}
                      selected={intentions.includes(it.id)}
                      onClick={() => toggleIntention(it.id)}
                      label={it.label}
                      sub={it.sub}
                      Icon={it.icon}
                    />
                  ))}
                </div>
                {/* Inline desktop actions */}
                <div className="mt-8 hidden sm:flex flex-wrap items-center gap-3">
                  <CtaButton
                    variant="primary"
                    onClick={() => {
                      if (intentions.length === 0) return;
                      flashAndAdvance(TRANSITION_MICROCOPY.intention, 4);
                    }}
                    disabled={intentions.length === 0}
                    aria-disabled={intentions.length === 0}
                    className="min-h-11"
                  >
                    Continue
                  </CtaButton>
                  {intentions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIntentions([]);
                        setSearch({ intention: undefined });
                      }}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[2px] px-3 text-[12px] uppercase tracking-[0.2em] font-bold text-[color:var(--charcoal)]/60 transition-colors hover:text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/50"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Mobile sticky bottom action bar — always reachable */}
                <div
                  className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)]/95 backdrop-blur-sm shadow-[0_-8px_22px_-12px_rgba(46,46,46,0.18)]"
                  style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
                  role="region"
                  aria-label="Interests step actions"
                >
                  <div className="container-x flex items-center gap-3 py-3">
                    <span className="flex-1 text-[11px] uppercase tracking-[0.18em] font-bold text-[color:var(--charcoal)]/55 truncate">
                      {intentions.length === 0
                        ? "Pick at least one"
                        : `${intentions.length} selected`}
                    </span>
                    {intentions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIntentions([]);
                          setSearch({ intention: undefined });
                        }}
                        aria-label="Clear all selected interests"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[2px] px-3 text-[11.5px] uppercase tracking-[0.2em] font-bold text-[color:var(--charcoal)]/65 transition-colors hover:text-[color:var(--charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/50"
                      >
                        Clear
                      </button>
                    )}
                    <CtaButton
                      variant="primary"
                      onClick={() => {
                        if (intentions.length === 0) return;
                        flashAndAdvance(TRANSITION_MICROCOPY.intention, 4);
                      }}
                      disabled={intentions.length === 0}
                      aria-disabled={intentions.length === 0}
                      className="min-h-11"
                    >
                      Continue
                    </CtaButton>
                  </div>
                </div>
              </div>
            )}


            {step === 4 && (
              <div key="step-4" className="builder-step-in">
                <StepHead
                  num={4}
                  eyebrow="Rhythm"
                  title="What rhythm feels right?"
                  onBack={() => setStep(3)}
                />
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PACES.map((p) => (
                    <ChoiceTile
                      key={p.id}
                      selected={pace === p.id}
                      onClick={() => {
                        setPace(p.id);
                        flashAndAdvance(TRANSITION_MICROCOPY.pace, 5);
                      }}
                      label={p.label}
                      sub={p.sub}
                      Icon={p.icon}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* STEP 5 — Predictive moment */}
        {step === 5 && (
          <PredictiveMoment
            loading={routeLoading}
            ready={!!route && !routeLoading}
            onDone={() => setStep(6)}
          />
        )}

        {/* STEP 6 — Multi-day live builder */}
        {step === 6 && route && md.activeDay && (
          <MultiDayBuilder
            state={md.state}
            activeDay={md.activeDay}
            onSetActiveDay={md.setActiveDay}
            onAddDay={() => md.addDay(route.region.key)}
            onRemoveDay={md.removeDay}
            onMoveStop={md.moveStopInActive}
            onRemoveStop={md.removeStopFromActive}
            onAddStop={md.addStopToActive}
            onSetGuests={md.setGuests}
            onSetPace={(p) => { md.setPace(p); setPace(p); }}
            onSetIntent={md.setIntent}
            onShare={md.share}
            onRotateLink={md.rotateLink}
            onRevokeLink={md.revokeLink}
            sessionId={md.sessionId}
            readOnly={md.readOnly}
            syncing={md.syncing}
            shareToken={md.shareToken}
            mood={mood}
            who={who}
            intention={intention}
            onConfirm={() => setStep(7)}
            onReset={() => { md.reset(); resetBuilder("header"); }}
          />
        )}

        {/* STEP 7 — Review */}
        {step === 7 && route && (
          <>
            <ReviewScreen
              route={route}
              stops={stops}
              guests={guests}
              narrative={narrative}
              reviewThumbs={routeImages.reviewThumbs}
              selectedElementLabels={selectedElements.map(elementLabel)}
              who={who as Who | undefined}
              onConfirm={() => setCheckoutOpen(true)}
              onBack={() => setStep(6)}
              onReset={() => resetBuilder("review")}
            />
            <StickyBar
              totalMinutes={route.totals.experienceMinutes}
              pricePerPersonEur={route.pricePerPersonEur}
              guests={guests}
              setGuests={setGuests}
              onConfirm={() => setCheckoutOpen(true)}
              ctaLabel="Confirm experience"
            />
          </>
        )}

        {/* Checkout overlay */}
        {checkoutOpen && route && (
          <CheckoutModal
            route={route}
            stops={stops}
            guests={guests}
            selectedElements={selectedElements}
            onClose={() => setCheckoutOpen(false)}
          />
        )}

        {/* Persistent narrative companion — continuous conversational layer */}
        {!checkoutOpen && (
          <NarrativeCompanion
            step={step}
            mood={mood}
            who={who}
            intention={intention}
            pace={pace}
            narrative={narrative || null}
            onApply={(parsed) => {
              const patch: Partial<BuilderSearch> = {};
              if (parsed.mood) patch.mood = parsed.mood;
              if (parsed.who) patch.who = parsed.who;
              if (parsed.intention) {
                patch.intention = parsed.intention;
                setIntentions([parsed.intention]);
              }
              if (parsed.pace) patch.pace = parsed.pace;

              // Auto-advance to the first still-unset step (≤ live builder).
              const nextMood = patch.mood ?? mood;
              const nextWho = patch.who ?? who;
              const nextIntention = patch.intention ?? intention;
              let target: Step = step as Step;
              if (!nextMood) target = 1;
              else if (!nextWho) target = 2;
              else if (!nextIntention) target = 3;
              else if (step < 5) target = 5;
              if (target !== step) patch.step = target;

              if (Object.keys(patch).length > 0) {
                setSearch(patch);
                setNarrativeApplied(true);
              }
            }}
          />
        )}
      </article>
    </div>
  );
}

/* ─── Live builder layout (split desktop · tabs mobile) ───────── */

interface LiveBuilderProps {
  route: RouteUI;
  stops: RoutedStopUI[];
  pace: Pace;
  excluded: string[];
  narrative: string;
  narrativeLoading: boolean;
  mobileTab: MobileTab;
  setMobileTab: (t: MobileTab) => void;
  onPaceChange: (p: Pace) => void;
  onRemoveStop: (key: string) => void;
  onAddBackStop: (key: string) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  removablePool: { key: string; label: string }[];
  guests: number;
  setGuests: (n: number) => void;
  routeLoading: boolean;
  routeError: string | null;
  onRetry: () => void;
  onReview: () => void;
  stopImages: Record<string, { url: string; alt: string } | null>;
  storyImage: { url: string; alt: string } | null;
  imagesLoading: boolean;
  moodLabel: string | null;
  whoLabel: string | null;
  intentionLabel: string | null;
  selectedElements: ElementKey[];
  onToggleElement: (key: ElementKey) => void;
  onReset: () => void;
}

function LiveBuilder({
  route,
  stops,
  pace,
  excluded,
  narrative,
  narrativeLoading,
  mobileTab,
  setMobileTab,
  onPaceChange,
  onRemoveStop,
  onAddBackStop,
  onMove,
  removablePool,
  guests,
  setGuests,
  routeLoading,
  routeError,
  onRetry,
  onReview,
  stopImages,
  storyImage,
  imagesLoading,
  moodLabel,
  whoLabel,
  intentionLabel,
  selectedElements,
  onToggleElement,
  onReset,
}: LiveBuilderProps) {
  const regionCenter = { lat: Number(route.region.lat), lng: Number(route.region.lng) };

  // Eyebrow facets shown above the live split.
  const facets = [moodLabel, whoLabel, intentionLabel].filter(Boolean) as string[];

  return (
    <>
      {/* Editorial header — adaptive eyebrow + region title */}
      <header className="container-x pt-5 md:pt-8 pb-1 md:pb-2 builder-step-in">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
            <Sparkles size={12} aria-hidden="true" />
            Now shaping
          </span>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)]/55 hover:text-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] rounded-sm px-1 py-0.5 transition-colors"
            aria-label="Start over — clears your selections"
          >
            <X size={12} aria-hidden="true" />
            Start over
          </button>
        </div>
        <h2 className="serif mt-2 text-[1.7rem] sm:text-[2rem] md:text-[2.4rem] leading-[1.05] tracking-[-0.01em] font-semibold text-[color:var(--charcoal)]">
          {route.region.label}
          {facets.length > 0 && (
            <span className="serif italic font-normal text-[color:var(--charcoal)]/70">
              {" "}— {facets.join(" · ").toLowerCase()}
            </span>
          )}
        </h2>
      </header>

      {/* Mobile tab bar */}
      <div className="lg:hidden sticky top-0 z-30 border-b border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)]/95 backdrop-blur">
        <div className="container-x flex items-center gap-1 py-2" role="tablist">
          {(["build", "map", "story"] as MobileTab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={mobileTab === t}
              onClick={() => setMobileTab(t)}
              className={[
                "flex-1 px-3 py-2 text-[11px] uppercase tracking-[0.22em] font-bold transition-colors capitalize",
                mobileTab === t
                  ? "text-[color:var(--charcoal)] border-b-2 border-[color:var(--gold)]"
                  : "text-[color:var(--charcoal)]/50 border-b-2 border-transparent",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Loading ribbon */}
      {(routeLoading || routeError) && (
        <div className="container-x mt-3">
          <div
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--sand)]/60 px-3 py-1.5 text-[12px] text-[color:var(--charcoal)]/75"
            aria-live="polite"
          >
            {routeLoading && (
              <>
                <Loader2 size={13} className="animate-spin text-[color:var(--gold)]" />
                Reshaping your route…
              </>
            )}
            {routeError && (
              <>
                <span className="text-red-700">{routeError}</span>
                <button
                  type="button"
                  onClick={onRetry}
                  className="ml-2 underline underline-offset-4"
                >
                  Try again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desktop split / mobile tab content */}
      <section className="container-x py-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* MAP */}
          <div
            className={[
              "group relative overflow-hidden rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)] shadow-[0_18px_40px_-24px_rgba(46,46,46,0.35)]",
              "h-[58svh] sm:h-[62svh] lg:h-[74svh] lg:sticky lg:top-20",
              "builder-pane-fade",
              mobileTab === "map" ? "block" : "hidden lg:block",
            ].join(" ")}
          >
            <Suspense fallback={<div className="h-full w-full bg-[color:var(--sand)]" aria-hidden="true" />}>
              <BuilderMap
                stops={stops}
                regionCenter={regionCenter}
                regionKey={route.region.key}
              />
            </Suspense>

            {/* Gold corner accents — micro-detail only */}
            <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-5 w-5 border-t border-l border-[color:var(--gold)]" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b border-r border-[color:var(--gold)]" />

            {/* Live route label */}
            <span className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--ivory)]/90 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)] shadow-[0_4px_14px_-6px_rgba(46,46,46,0.4)] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
              Live route
            </span>
          </div>

          {/* PANEL — Build (controls) */}
          <div
            className={[
              "rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] min-h-[60svh] builder-pane-fade",
              mobileTab === "build" ? "block" : "hidden lg:block",
            ].join(" ")}
          >
            <JourneyPanel
              route={route}
              stops={stops}
              pace={pace}
              excluded={excluded}
              narrative={narrative}
              narrativeLoading={narrativeLoading}
              onPaceChange={onPaceChange}
              onRemoveStop={onRemoveStop}
              onAddBackStop={onAddBackStop}
              onMove={onMove}
              removablePool={removablePool}
              stopImages={stopImages}
              storyImage={storyImage}
              routeLoading={routeLoading}
              imagesLoading={imagesLoading}
              selectedElements={selectedElements}
              onToggleElement={onToggleElement}
            />
          </div>

          {/* PANEL — Story (mobile-only focused narrative view) */}
          <div
            className={[
              "lg:hidden rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)]/40 min-h-[60svh] p-6 builder-pane-fade",
              mobileTab === "story" ? "block" : "hidden",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
              <Sparkles size={12} aria-hidden="true" />
              The story so far
            </span>

            <h3 className="serif mt-4 text-[1.7rem] leading-[1.08] tracking-[-0.01em] font-semibold text-[color:var(--charcoal)]">
              {route.region.label}
            </h3>
            {stops.length >= 2 && (
              <p className="mt-1.5 text-[12.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]/70">
                {stops[0].label}
                <span className="mx-2 text-[color:var(--gold)]">→</span>
                {stops[stops.length - 1].label}
              </p>
            )}

            {/* Gold rule — micro-detail editorial separator */}
            <span aria-hidden="true" className="mt-5 block h-px w-10 bg-[color:var(--gold)]" />

            <p
              className={[
                "mt-5 serif italic leading-[1.5] text-[1.08rem] text-[color:var(--charcoal)]/90 transition-opacity duration-300",
                narrativeLoading ? "opacity-50" : "opacity-100",
              ].join(" ")}
            >
              {narrative ||
                "A real, achievable day in Portugal — shaped from your choices, ready to adjust."}
            </p>

            <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-[color:var(--charcoal)]/10 pt-5">
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)]/55">
                  Stops
                </dt>
                <dd className="mt-1.5 serif text-[1.25rem] font-semibold tabular-nums text-[color:var(--charcoal)]">
                  {stops.length}
                </dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)]/55">
                  Duration
                </dt>
                <dd className="mt-1.5 serif text-[1.25rem] font-semibold tabular-nums text-[color:var(--charcoal)]">
                  {Math.floor(route.totals.experienceMinutes / 60)}h
                  {route.totals.experienceMinutes % 60
                    ? String(route.totals.experienceMinutes % 60).padStart(2, "0")
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)]/55">
                  Pace
                </dt>
                <dd className="mt-1.5 serif text-[1.25rem] font-semibold capitalize text-[color:var(--charcoal)]">
                  {route.pace}
                </dd>
              </div>
            </dl>

            {/* Concierge selections — surface what they added in story view */}
            {selectedElements.length > 0 && (
              <div className="mt-6 rounded-[2px] border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.26em] font-bold text-[color:var(--gold)]">
                    Added to your day
                  </p>
                  <p className="text-[9.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]/55">
                    Concierge confirms
                  </p>
                </div>
                <p className="mt-2 text-[13px] leading-snug text-[color:var(--charcoal)]/85">
                  {selectedElements.map(elementLabel).join(" · ")}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileTab("build")}
              className="mt-7 inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
            >
              Adjust the journey
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Review CTA — full-width above sticky bar */}
        <div className="mt-8 flex justify-end">
          <CtaButton
            type="button"
            onClick={onReview}
            disabled={!route.feasible || stops.length === 0}
            variant="primary"
            size="sm"
          >
            Review experience
          </CtaButton>
        </div>
      </section>

      <StickyBar
        totalMinutes={route.totals.experienceMinutes}
        pricePerPersonEur={route.pricePerPersonEur}
        guests={guests}
        setGuests={setGuests}
        onConfirm={onReview}
        disabled={!route.feasible || stops.length === 0}
        ctaLabel="Review & confirm"
      />

      {/* Floating mobile-only map shortcut while on Build tab */}
      <button
        type="button"
        onClick={() => setMobileTab("map")}
        aria-label="Show map"
        className={[
          "lg:hidden fixed bottom-20 right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--charcoal)] text-[color:var(--ivory)] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.4)]",
          mobileTab === "map" ? "hidden" : "flex",
        ].join(" ")}
      >
        <MapIcon size={18} strokeWidth={1.75} />
      </button>
    </>
  );
}

/* ─── Stripe checkout modal (TEST MODE) ───────────────────────── */

// Lazy: only call getStripe() when the checkout modal actually mounts.
// Calling it at module scope crashes the entire builder route in any
// build where VITE_PAYMENTS_CLIENT_TOKEN is missing (e.g. published).
let _stripePromise: ReturnType<typeof getStripe> | null = null;
function stripePromiseLazy() {
  if (!_stripePromise) {
    try {
      _stripePromise = getStripe();
    } catch {
      _stripePromise = Promise.resolve(null);
    }
  }
  return _stripePromise;
}

function CheckoutModal({
  route,
  stops,
  guests,
  selectedElements,
  onClose,
}: {
  route: RouteUI;
  stops: RoutedStopUI[];
  guests: number;
  selectedElements: ElementKey[];
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("create-builder-checkout", {
        body: {
          guests,
          regionLabel: route.region.label,
          stopLabels: stops.map((s) => s.label),
          pace: route.pace,
          elements: selectedElements,
          returnUrl: `${window.location.origin}/builder?status=success`,
          environment: getStripeEnvironment(),
        },
      })
      .then(({ data, error: fnError }) => {
        if (cancelled) return;
        if (fnError) {
          setError(fnError.message);
          return;
        }
        const cs = (data as { clientSecret?: string } | null)?.clientSecret;
        if (cs) setClientSecret(cs);
        else setError("Could not start checkout.");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Checkout failed");
      });
    return () => {
      cancelled = true;
    };
  }, [route, stops, guests, selectedElements]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-auto rounded-[2px] bg-[color:var(--ivory)] shadow-[0_28px_60px_-24px_rgba(46,46,46,0.55)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-9 w-9 inline-flex items-center justify-center rounded-full bg-[color:var(--charcoal)]/5 hover:bg-[color:var(--charcoal)]/10"
        >
          <X size={16} />
        </button>
        <div className="p-5 md:p-7">
          <p className="text-[10.5px] uppercase tracking-[0.26em] font-bold text-[color:var(--gold)]">
            Checkout
          </p>
          <h3 className="serif mt-2 text-[1.4rem] md:text-[1.7rem] leading-tight font-semibold text-[color:var(--charcoal)]">
            {route.region.label} · {guests} guest{guests > 1 ? "s" : ""}
          </h3>
          <p className="mt-1 text-[12.5px] text-[color:var(--charcoal)]/70">
            {stops.length} stops · {route.pace} pace · €{route.pricePerPersonEur * guests}
          </p>
          {selectedElements.length > 0 && (
            <p className="mt-2 text-[11.5px] text-[color:var(--charcoal)]/70">
              <span className="text-[color:var(--gold)] font-bold uppercase tracking-[0.22em] text-[10px] mr-1.5">
                Concierge confirms
              </span>
              {selectedElements.map(elementLabel).join(" · ")}
            </p>
          )}
          <div className="mt-5">
            {error && <p className="text-[13px] text-red-700">{error}</p>}
            {!error && !clientSecret && (
              <p className="inline-flex items-center gap-2 text-[13px] text-[color:var(--charcoal)]/70">
                <Loader2 size={14} className="animate-spin" /> Preparing secure checkout…
              </p>
            )}
            {clientSecret && (
              <EmbeddedCheckoutProvider stripe={stripePromiseLazy()} options={{ clientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
