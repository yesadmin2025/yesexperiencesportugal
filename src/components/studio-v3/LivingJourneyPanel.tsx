// Studio V3 — Living Journey Panel (compact pill + expandable Journey Draft drawer).
//
// Replaces the older static card. The persistent artifact is now:
//   1. A small inline pill ("Your journey · forming — Wine & food · Solo")
//      that sits above the PhaseShell in normal document flow. Never fixed,
//      never overlaps the active question, choices, footer help, Continue
//      CTA, or browser chrome.
//   2. A near-fullscreen Journey Draft drawer opened on tap, showing the
//      working title, Experience DNA pills (max 4), route line, up to 3
//      moments, and a stylised
//      editorial route preview rendered as inline SVG (no real map lib,
//      no images, no invented stops — geometry only).
//
// Data rules (locked):
//   - Reads state ONLY through existing curation helpers.
//   - Route + moments come solely from resolveStudioV3Route — never invented.
//   - Hidden on "feeling" / "map" / "storyboard" phases and while a
//     reaction beat plays (via `hidden` prop from StudioV3).
//   - No pill until at least one meaningful DNA choice exists.
//   - No route placeholder paragraphs.
//   - P9: no money and no investment framing anywhere in this pre-value
//     surface — including the AI story input. Investment may still feed the
//     internal curation call, but never the narrative shown to the traveller.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { composeJourneyTitle, getOptionLabel, resolveStudioV3Route } from "./curation";
import {
  haversineDriveMinutes,
  inferKind,
  kindLabel,
  stopDurationMinutes,
  summarizeDay,
} from "@/lib/studio/timing";
import {
  COMPANIONS,
  FEELINGS,
  INTERESTS,
  PICKUPS,
  RHYTHMS,
  type StudioV3State,
} from "./types";
import { composeLiveStory } from "@/lib/studio-v3/compose-live-story.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import { StudioV3SignatureMap } from "./StudioV3SignatureMap";
import { useRouteLegMinutes, type RouteLegStop } from "@/hooks/use-route-leg-minutes";
import { TimelineView } from "./TimelineView";
import { SmartRecommendation } from "./SmartRecommendation";
import { signatureTours } from "@/data/signatureTours";
import { REGION_ORIGIN, type RegionKey } from "@/data/regionStops";
import { regionalVoiceFor } from "./regionalVoice";
import {
  buildLivingDaySnapshot,
  genericiseRouteLine,
  livingDayFeedback,
  livingDaySnapshotKey,
  type LivingDaySnapshot,
} from "./livingDaySpine";
import { buildWineryDisplayLabels, studioDisplayLabel } from "./studioWineryPresentation";
import { trackStudio } from "@/lib/studio-analytics";

/** Local copy of the Signature-region → RegionKey mapping. Keeps this
 *  panel decoupled from StudioV3.tsx while preserving the same logic. */
function tourRegionToRegionKey(region: string | undefined | null): RegionKey {
  const r = (region ?? "").toLowerCase();
  if (
    r.includes("alentejo") ||
    r.includes("comporta") ||
    r.includes("évora") ||
    r.includes("evora")
  )
    return "alentejo";
  if (
    r.includes("centro") ||
    r.includes("coimbra") ||
    r.includes("fátima") ||
    r.includes("nazaré") ||
    r.includes("óbidos")
  )
    return "centro";
  if (
    r.includes("sintra") ||
    r.includes("cascais") ||
    r.includes("cabo da roca") ||
    r.includes("lisbon coast")
  )
    return "lisbon-coast";
  return "arrabida";
}

interface LivingJourneyPanelProps {
  state: StudioV3State;
  hidden?: boolean;
  /**
   * Pass 2C — transient whisper handed down by StudioV3 when a beat is
   * demoted from a blocking overlay. Presentation only: it shares the
   * existing derived-feedback slot, fades on its own, and is never stored,
   * never persisted and never replayed on back/edit. `id` changes so the
   * same sentence can whisper again after a genuinely new choice.
   */
  whisper?: { text: string; id: number } | null;
}

export function LivingJourneyPanel({
  state,
  hidden = false,
  whisper = null,
}: LivingJourneyPanelProps) {

  const [open, setOpen] = useState(false);

  const title = useMemo(
    () =>
      composeJourneyTitle({
        feeling: state.feeling,
        companions: state.companions,
        occasion: state.occasion,
        pickup: state.pickup,
        interests: state.interests,
        rhythm: state.rhythm,
        region: null,
      }),
    [state.feeling, state.companions, state.occasion, state.pickup, state.interests, state.rhythm],
  );

  // ---- Pass 2A: Living Day spine -------------------------------------
  // One deterministic snapshot drives the pill, the drawer and the causal
  // feedback line. `direction` is DNA-only (no stops, no counts), `draft`
  // previews a real route with a PRESENTATION-ONLY balanced rhythm, and
  // `shaped` resolves from the traveller's actual rhythm.
  const snapshot = useMemo(
    () => buildLivingDaySnapshot(state, { reactionActive: hidden }),
    [state, hidden],
  );
  const stage = snapshot.stage;
  const dna = snapshot.dna;
  const hasRoute = snapshot.momentCount > 0;

  // Raw resolver output — needed for geo/timeline/map. Same inputs as the
  // snapshot (tentative balanced rhythm in draft), so labels stay in sync.
  const resolved = useMemo(() => {
    if (stage !== "draft" && stage !== "shaped") return null;
    return resolveStudioV3Route({
      feeling: state.feeling!,
      companions: state.companions!,
      rhythm: state.rhythm ?? "balanced",
      interests: state.interests,
      pickup: state.pickup,
      occasion: state.occasion,
      investment: state.investment,
      destinationIntent: state.destinationIntent,
      dateExact: state.dateExact,
    });
  }, [
    stage,
    state.feeling,
    state.companions,
    state.rhythm,
    state.interests,
    state.pickup,
    state.occasion,
    state.investment,
    state.destinationIntent,
    state.dateExact,
  ]);

  // The FULL composed route is the itinerary authority. `routePoints` is the
  // compact 4-slot card projection — never cap the Living Day to it.
  const routePoints = resolved
    ? resolved.composedRoutePoints.length > 0
      ? resolved.composedRoutePoints
      : resolved.routePoints
    : [];
  // Customer-safe labels — winery supplier names never leak to any surface.
  const displayLabels = useMemo(
    () => buildWineryDisplayLabels(routePoints.map((p) => ({ label: p.label }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routePoints.map((p) => p.label).join("|")],
  );
  const safeLabel = (label: string) => studioDisplayLabel(label, displayLabels);

  const routeLine = genericiseRouteLine(resolved?.suggestedRouteLabel ?? null, displayLabels);
  const moments = routePoints.map((p) => safeLabel(p.label));
  const timelineMoments = routePoints.map((p, i) => {
    const kind = inferKind(p.label);
    const prev = i > 0 ? routePoints[i - 1] : null;
    const driveMinBefore =
      prev && prev.lat != null && prev.lng != null && p.lat != null && p.lng != null
        ? haversineDriveMinutes({ lat: prev.lat, lng: prev.lng }, { lat: p.lat, lng: p.lng })
        : null;
    return {
      label: safeLabel(p.label),
      story: p.story,
      durationMin: stopDurationMinutes({ label: p.label, kind }),
      kindLabel: kind ? kindLabel(kind) : null,
      driveMinBefore,
    };
  });

  const resolvedTour = useMemo(() => {
    if (!resolved?.skeletonTourKey) return null;
    return signatureTours.find((t) => t.id === resolved.skeletonTourKey) ?? null;
  }, [resolved?.skeletonTourKey]);

  // Day summary against the regional rhythm — feeds the soft over-budget note.
  const daySummary = useMemo(
    () =>
      summarizeDay({
        stops: routePoints.map((p) => ({
          label: p.label,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          kind: inferKind(p.label),
        })),
        region: resolvedTour?.region ?? null,
      }),
    [routePoints, resolvedTour?.region],
  );
  const overBudgetNote = daySummary.overBudget
    ? "This day is shaping into a long one. Consider easing the pace before checkout."
    : null;
  const originLabel = state.pickup ? getOptionLabel(PICKUPS, state.pickup) : null;

  // -------- Scope strip (value only, P9) --------
  // Region · moments · duration. No money, ever: the Journey Draft sits
  // before the traveller has felt the composed day, and the canonical
  // SignaturePriceCard inside Your Day is the first numeric price surface.

  const scopeRegion = resolvedTour?.region ?? null;
  const scopeDuration = resolvedTour?.durationHours ?? null;
  const scopeStops = routePoints.length;

  // Memory of the day — narrates the choices already made in past tense,
  // so returning to the drawer feels like reading the day's diary back.
  // Pure state read; never invents stops, partners, or prices.
  const memoryLine = useMemo(() => {
    const parts: string[] = [];
    if (state.feeling) {
      parts.push(`started with ${getOptionLabel(FEELINGS, state.feeling).toLowerCase()}`);
    }
    if (state.companions) {
      const c = getOptionLabel(COMPANIONS, state.companions).toLowerCase();
      parts.push(`travelling ${c}`);
    }
    if (state.interests && state.interests.length > 0) {
      const labels = state.interests
        .slice(0, 2)
        .map((id) => getOptionLabel(INTERESTS, id).toLowerCase());
      parts.push(`added ${labels.join(" & ")}`);
    }
    if (state.rhythm) {
      const r = getOptionLabel(RHYTHMS, state.rhythm).toLowerCase();
      parts.push(`chose a ${r} rhythm`);
    }
    if (parts.length < 2) return null;
    const name = state.firstName?.trim();
    const lead = name ? `${name}, you` : "You";
    // Title-case only the first word, comma-join the rest, period at end.
    return `${lead} ${parts.join(", ")}.`;
  }, [state.feeling, state.companions, state.interests, state.rhythm, state.firstName]);

  // --- AI live story (Lovable AI) ---
  // Fires when at least feeling+companions exist. Debounced 700ms.
  // Re-fires on any meaningful state change. Graceful fallback if it errors.
  const fetchStory = useServerFn(composeLiveStory);
  const sessionId = useBuilderSessionId();
  const [aiStory, setAiStory] = useState<{ text: string; source: "ai" | "fallback" } | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const reqIdRef = useRef(0);
  const storyKey = useMemo(() => {
    return [
      state.firstName ?? "",
      state.feeling ?? "",
      state.companions ?? "",
      state.occasion ?? "",
      state.pickup ?? "",
      state.destinationIntent ?? "",
      (state.interests ?? []).join("|"),
      state.rhythm ?? "",
    ].join("·");
  }, [
    state.firstName,
    state.feeling,
    state.companions,
    state.occasion,
    state.pickup,
    state.destinationIntent,
    state.interests,
    state.rhythm,
  ]);

  useEffect(() => {
    if (hidden) return;
    // Pass 2A: the story is atmosphere on top of a real resolved route —
    // it never leads the early drawer, and never fires in DNA-only state.
    if (!hasRoute || !state.feeling || !state.companions) {
      setAiStory(null);
      return;
    }
    const id = ++reqIdRef.current;
    setStoryLoading(true);
    const t = setTimeout(() => {
      fetchStory({
        data: {
          firstName: state.firstName ?? null,
          feeling: state.feeling,
          companions: state.companions,
          occasion: state.occasion,
          pickup: state.pickup,
          destinationIntent: state.destinationIntent,
          interests: state.interests,
          rhythm: state.rhythm,
          sessionId,
        },
      })
        .then((res) => {
          if (id !== reqIdRef.current) return;
          setAiStory(res);
        })
        .catch(() => {
          if (id !== reqIdRef.current) return;
          setAiStory(null);
        })
        .finally(() => {
          if (id !== reqIdRef.current) return;
          setStoryLoading(false);
        });
    }, 700);
    return () => clearTimeout(t);
    // storyKey captures the dependency surface deterministically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyKey, hidden, hasRoute]);

  // ---- Causal feedback (derived, never invented) ----------------------
  // One quiet, short-lived line reacting to a REAL structural transition.
  const prevRef = useRef<{ state: StudioV3State; snap: LivingDaySnapshot } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const seenRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const previous = prevRef.current;
    prevRef.current = { state, snap: snapshot };
    if (stage === "hidden") return;

    // living_day_seen — once per session, when the artefact first appears.
    if (!seenRef.current) {
      seenRef.current = true;
      lastKeyRef.current = livingDaySnapshotKey(snapshot);
      trackStudio("living_day_seen", {
        phase: state.phase,
        stage,
        moment_count: snapshot.momentCount,
      });
      return;
    }

    const key = livingDaySnapshotKey(snapshot);
    const changed = key !== lastKeyRef.current;
    if (!previous) return;

    const next = livingDayFeedback(previous.state, state, previous.snap, snapshot);

    if (changed) {
      lastKeyRef.current = key;
      trackStudio("living_day_changed", {
        phase: state.phase,
        stage,
        moment_count: snapshot.momentCount,
        delta_count: next?.deltaCount ?? 0,
        trigger: next?.trigger ?? "other",
      });
    }

    if (next) setFeedback(next.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, stage]);

  // Pass 2C — a whisper from a demoted beat takes the same slot as derived
  // feedback. It is the newest thing said, so it wins while it lives.
  const whisperId = whisper?.id ?? null;
  useEffect(() => {
    if (whisperId == null || !whisper?.text) return;
    setFeedback(whisper.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whisperId]);

  // Feedback disappears on its own — never a modal, never a phase.
  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(t);
  }, [feedback]);


  // Escape closes drawer; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Auto-close drawer when the panel is hidden (e.g. entering map/storyboard
  // or a reaction beat) so it never lingers on top of a takeover phase.
  useEffect(() => {
    if (hidden && open) setOpen(false);
  }, [hidden, open]);

  if (hidden) return null;
  if (stage === "hidden" || dna.length === 0) return null; // Nothing real to say yet.

  // Collapsed copy — truthful per stage. `direction` shows DNA only: no
  // stop names, no moment count, no route.
  const dnaSummary = dna.slice(0, 2).join(" · ");
  const eyebrow =
    stage === "direction"
      ? "Your day · forming"
      : stage === "draft"
        ? "Your day · first draft"
        : "Your day";
  const collapsedTrailing =
    stage === "direction"
      ? dnaSummary
      : snapshot.region && snapshot.momentCount > 0
        ? `${snapshot.region} · ${snapshot.momentCount} ${snapshot.momentCount === 1 ? "moment" : "moments"}`
        : (snapshot.region ?? dnaSummary);

  return (
    <>
      <div className="w-full flex flex-col items-center px-3 pt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-label="Open your living day"
          data-testid="studio-v3-living-day-pill"
          data-stage={stage}
          className="group inline-flex max-w-full min-h-[44px] items-center gap-2 rounded-full border px-3 py-2 transition-[transform,box-shadow,background-color] duration-[220ms] ease-out motion-reduce:transition-none hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          style={{
            background: "color-mix(in oklab, var(--ivory) 94%, transparent)",
            borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
            boxShadow: "0 6px 18px -14px color-mix(in oklab, var(--charcoal) 40%, transparent)",
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--gold)" }}
            aria-hidden
          />
          <span
            className="text-[9px] uppercase tracking-[0.24em] font-bold leading-none whitespace-nowrap"
            style={{ color: "var(--gold)" }}
          >
            {eyebrow}
          </span>
          <span
            className="text-[10.5px] leading-none truncate max-w-[55vw]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
          >
            {collapsedTrailing}
          </span>
          <span
            className="text-[10px] leading-none ml-0.5"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
            aria-hidden
          >
            ›
          </span>
        </button>
        {feedback ? (
          <p
            data-testid="studio-v3-living-day-feedback"
            aria-live="polite"
            className="mt-1.5 text-[10.5px] leading-none animate-in fade-in duration-300 motion-reduce:animate-none"
            style={{ color: "color-mix(in oklab, var(--teal) 82%, transparent)" }}
          >
            {feedback}
          </p>
        ) : null}
      </div>


      {open
        ? createPortal(
            <JourneyDraftDrawer
              onClose={() => setOpen(false)}
              stage={stage}
              feedback={feedback}
              title={title}
              dna={dna}
              routeLine={routeLine}
              moments={moments}
              momentsDetailed={routePoints.map((p) => ({
                label: p.label,
                lat: p.lat ?? null,
                lng: p.lng ?? null,
              }))}
              originCoord={(() => {
                const rk = tourRegionToRegionKey(resolvedTour?.region ?? null);
                const o = REGION_ORIGIN[rk];
                return o ? { lat: o.lat, lng: o.lng } : null;
              })()}
              timelineMoments={timelineMoments}
              durationLabel={scopeDuration}
              originLabel={originLabel}
              paceLabel={state.rhythm ? getOptionLabel(RHYTHMS, state.rhythm) : null}
              storyText={aiStory?.text ?? null}
              storyLoading={storyLoading}
              storySource={aiStory?.source ?? null}
              scopeRegion={scopeRegion}
              scopeDuration={scopeDuration}
              scopeStops={scopeStops}
              memoryLine={memoryLine}
              tourId={resolved?.skeletonTourKey ?? null}
              stopCount={routePoints.length}
              feeling={state.feeling}
              interests={state.interests}
              rhythm={state.rhythm}
              companions={state.companions}
              fullState={state}
              overBudgetNote={overBudgetNote}
            />,

            document.body,
          )
        : null}
    </>
  );
}

interface DrawerProps {
  onClose: () => void;
  /** Living Day stage — direction (DNA only) · draft · shaped. */
  stage: LivingDaySnapshot["stage"];
  /** Short-lived causal line, mirrored inside the drawer while it shows. */
  feedback: string | null;
  title: string;
  dna: string[];
  routeLine: string | null;
  moments: string[];
  momentsDetailed: Array<{ label: string; lat?: number | null; lng?: number | null }>;
  originCoord: { lat: number; lng: number } | null;
  timelineMoments: import("./TimelineView").TimelineMoment[];

  durationLabel: string | null;
  originLabel: string | null;
  paceLabel: string | null;
  storyText: string | null;
  storyLoading: boolean;
  storySource: "ai" | "fallback" | null;
  /** Scope strip — value only (region · moments · duration). Never money. */
  scopeRegion: string | null;
  scopeDuration: string | null;
  scopeStops: number;
  memoryLine: string | null;
  tourId: string | null;
  stopCount: number;
  feeling: import("./types").Feeling | null;
  interests: import("./types").Interest[];
  rhythm: import("./types").Rhythm | null;
  companions: import("./types").Companions | null;
  fullState: StudioV3State;
  overBudgetNote: string | null;
}

function JourneyDraftDrawer({
  onClose,
  stage,
  feedback,
  title,
  dna,
  routeLine,
  moments,
  momentsDetailed,
  originCoord,
  timelineMoments,

  durationLabel,
  originLabel,
  paceLabel,
  storyText,
  storyLoading,
  storySource,
  scopeRegion,
  scopeDuration,
  scopeStops,
  memoryLine,
  tourId,
  stopCount,
  feeling,
  interests,
  rhythm,
  companions,
  fullState,
  overBudgetNote,
}: DrawerProps) {
  // The full composed route is the authority — never cap the map reveal at
  // the compact 4-slot card size; immersive days show all 5–6 pins.
  const totalPins = Math.max(0, moments.length);
  const [view, setView] = useState<"story" | "timeline" | "map">("story");

  // Real OSRM driving minutes for the drawer's "Map" view. We only fetch
  // when every moment has real lat/lng (otherwise the map already runs in
  // schematic mode and haversine would be misleading).
  const routeStops: RouteLegStop[] | null = useMemo(() => {
    if (!originCoord) return null;
    const detailed = momentsDetailed
      .map((m, i) => ({ ...m, i }))
      .filter(
        (m): m is typeof m & { lat: number; lng: number } =>
          typeof m.lat === "number" && typeof m.lng === "number",
      );
    if (detailed.length !== momentsDetailed.length) return null;
    return [
      { key: "origin", lat: originCoord.lat, lng: originCoord.lng },
      ...detailed.map((m) => ({ key: `${m.i}-${m.label}`, lat: m.lat, lng: m.lng })),
    ];
  }, [originCoord, momentsDetailed]);
  const { legMinutes: realLegMinutes } = useRouteLegMinutes(
    routeStops,
    view === "map" && !!routeStops,
  );

  // Cinematic pin reveal — pins draw in sequence when the drawer opens,
  // giving the "journey being drawn in real time" sensation. Respects
  // prefers-reduced-motion: shows all pins immediately.
  const [activePins, setActivePins] = useState(() => {
    if (typeof window === "undefined") return totalPins;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? totalPins : 0;
  });
  useEffect(() => {
    if (totalPins === 0) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setActivePins(totalPins);
      return;
    }
    setActivePins(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= totalPins; i += 1) {
      timers.push(setTimeout(() => setActivePins(i), 280 + i * 360));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPins, moments.join("|")]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Journey draft"
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close journey draft"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-200"
      />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[6px] sm:rounded-[6px] border animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
        style={{
          background: "var(--ivory)",
          borderColor: "color-mix(in oklab, var(--charcoal) 14%, transparent)",
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.45)",
        }}
      >
        <div className="px-5 pt-5 pb-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[9.5px] uppercase tracking-[0.28em] font-bold"
                style={{ color: "var(--gold)" }}
              >
                {stage === "direction"
                  ? "Your day · forming"
                  : stage === "draft"
                    ? "A first draft · before rhythm"
                    : "Your day"}
              </p>
              <h2
                className="mt-1 text-[18px] leading-tight font-semibold"
                style={{ color: "var(--charcoal)", fontFamily: "var(--font-display)" }}
              >
                {title}
              </h2>
              {memoryLine ? <MemoryRewriteLine line={memoryLine} /> : null}
              {feedback ? (
                <p
                  data-testid="studio-v3-living-day-drawer-feedback"
                  aria-live="polite"
                  className="mt-1.5 text-[11px] leading-snug"
                  style={{ color: "color-mix(in oklab, var(--teal) 82%, transparent)" }}
                >
                  {feedback}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border transition-colors duration-150"
              style={{
                borderColor: "color-mix(in oklab, var(--charcoal) 15%, transparent)",
                color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
              }}
            >
              <X size={16} />
            </button>
          </div>


          {/* DNA pills */}
          {dna.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {dna.map((label) => (
                <li
                  key={label}
                  className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-semibold leading-none"
                  style={{
                    background: "color-mix(in oklab, var(--sand) 75%, transparent)",
                    color: "color-mix(in oklab, var(--charcoal) 82%, transparent)",
                  }}
                >
                  {label}
                </li>
              ))}
            </ul>
          ) : null}

          {/* Scope strip — region · moments · hours. Value only: no money
              appears before the traveller has felt the composed day. */}
          {scopeRegion || scopeDuration || scopeStops > 0 ? (
            <div
              data-testid="studio-v3-journey-scope"
              className="mt-3 rounded-[4px] border px-3 py-2.5"
              style={{
                background: "color-mix(in oklab, var(--sand) 40%, var(--ivory))",
                borderColor: "color-mix(in oklab, var(--gold) 28%, transparent)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="text-[9.5px] uppercase tracking-[0.26em] font-bold"
                  style={{ color: "var(--gold)" }}
                >
                  <span aria-hidden>—</span> Scope so far
                </p>
                {scopeRegion ? (
                  <p
                    className="text-[9px] uppercase tracking-[0.26em] font-bold"
                    style={{ color: "color-mix(in oklab, var(--teal) 88%, transparent)" }}
                    data-testid="studio-v3-region-voice"
                  >
                    {regionalVoiceFor(scopeRegion).eyebrow}
                  </p>
                ) : null}
              </div>
              {scopeRegion ? (
                <p
                  className="mt-1 text-[11px] italic leading-snug"
                  style={{
                    fontFamily: "var(--font-serif)",
                    color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
                  }}
                >
                  {regionalVoiceFor(scopeRegion).whisper}
                </p>
              ) : null}
              <ul
                className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] leading-snug"
                style={{ color: "color-mix(in oklab, var(--charcoal) 82%, transparent)" }}
              >
                {scopeRegion ? (
                  <li className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="block h-1 w-1 rounded-full"
                      style={{ background: "var(--gold)" }}
                    />
                    {scopeRegion}
                  </li>
                ) : null}
                {scopeStops > 0 ? (
                  <li className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="block h-1 w-1 rounded-full"
                      style={{ background: "var(--gold)" }}
                    />
                    {scopeStops} {scopeStops === 1 ? "moment" : "moments"}
                  </li>
                ) : null}
                {scopeDuration ? (
                  <li className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="block h-1 w-1 rounded-full"
                      style={{ background: "var(--gold)" }}
                    />
                    {scopeDuration}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {/* AI live story — generated by Lovable AI from the current profile.
              Tone & atmosphere only, never invents facts. Falls back to a
              deterministic whisper on any error so the UI stays cinematic. */}
          {storyText || storyLoading ? (
            <div className="mt-4">
              <p
                className="text-[9px] uppercase tracking-[0.26em] font-bold"
                style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
              >
                {storySource === "ai" ? "Composed for you" : "A quiet read"}
              </p>
              {storyLoading && !storyText ? (
                <div
                  className="mt-2 space-y-1.5"
                  aria-busy="true"
                  aria-label="Composing your whisper"
                >
                  <div
                    className="h-3 rounded-sm animate-pulse"
                    style={{
                      background: "color-mix(in oklab, var(--charcoal) 8%, transparent)",
                      width: "92%",
                    }}
                  />
                  <div
                    className="h-3 rounded-sm animate-pulse"
                    style={{
                      background: "color-mix(in oklab, var(--charcoal) 8%, transparent)",
                      width: "76%",
                    }}
                  />
                </div>
              ) : (
                <p
                  className="mt-2 text-[13.5px] leading-[1.55] animate-in fade-in duration-[400ms] motion-reduce:animate-none"
                  style={{
                    color: "color-mix(in oklab, var(--charcoal) 88%, transparent)",
                    fontFamily: "var(--font-editorial)",
                    fontStyle: "italic",
                  }}
                >
                  {storyText}
                </p>
              )}
            </div>
          ) : null}

          {/* Tabbed view — Story · Timeline · Map. Keeps the drawer focused
              while letting the traveller feel the day from three angles.
              All three views are powered by the same resolved Signature. */}
          {totalPins > 0 ? (
            <div
              role="tablist"
              aria-label="Journey view"
              data-testid="studio-v3-journey-tabs"
              className="mt-4 flex items-center gap-1 rounded-full p-1"
              style={{
                background: "color-mix(in oklab, var(--sand) 60%, transparent)",
                border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
              }}
            >
              {(["story", "timeline", "map"] as const).map((v) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-view={v}
                    data-state={active ? "active" : "inactive"}
                    onClick={() => setView(v)}
                    className="flex-1 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                    style={{
                      background: active ? "var(--ivory)" : "transparent",
                      color: active
                        ? "var(--charcoal)"
                        : "color-mix(in oklab, var(--charcoal) 55%, transparent)",
                      boxShadow: active
                        ? "0 4px 12px -8px color-mix(in oklab, var(--charcoal) 40%, transparent)"
                        : "none",
                    }}
                  >
                    {v === "story" ? "Story" : v === "timeline" ? "Timeline" : "Map"}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Story view — the AI whisper + route + moments-so-far list */}
          {view === "story" && totalPins > 0 ? (
            <>
              {routeLine ? (
                <p
                  className="mt-3 text-[12px] leading-snug"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
                >
                  <span
                    className="mr-1.5 text-[9.5px] uppercase tracking-[0.22em] font-bold"
                    style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
                  >
                    Route
                  </span>
                  {routeLine}
                </p>
              ) : null}
              {moments.length > 0 ? (
                <div className="mt-3">
                  <p
                    className="text-[9.5px] uppercase tracking-[0.22em] font-bold"
                    style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
                  >
                    Moments so far
                  </p>
                  <ol
                    className="mt-1.5 space-y-1 text-[12px] leading-snug"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
                  >
                    {moments.map((m, i) => (
                      <li key={`${m}-${i}`} className="flex gap-2">
                        <span
                          className="mt-[7px] inline-block h-1 w-1 rounded-full shrink-0"
                          style={{ background: "var(--gold)" }}
                          aria-hidden
                        />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {/* Reveal simplified — QualityScore + AffinityBars removed for
                  clarity. They lived here as debug/telemetry decoration and
                  competed with the timeline + map for attention. */}
              <SmartRecommendation
                tourId={tourId}
                stopCount={stopCount}
                durationLabel={durationLabel}
              />
            </>
          ) : null}

          {/* Timeline view — ordered chapters from the real Signature */}
          {view === "timeline" && totalPins > 0 ? (
            <TimelineView
              moments={timelineMoments}
              durationLabel={durationLabel}
              originLabel={originLabel}
              overBudgetNote={overBudgetNote}
            />
          ) : null}

          {/* Map view — same map artefact, drawn live */}
          {view === "map" && totalPins > 0 ? (
            <div className="relative mt-3">
              <StudioV3SignatureMap
                stops={moments}
                stopsDetailed={momentsDetailed}
                originCoord={originCoord}
                activeCount={activePins}
                originLabel={originLabel}
                paceLabel={paceLabel}
                legMinutes={realLegMinutes}
                ariaLabel="Your journey, drawing live"
                className="rounded-[4px] border"
              />

              <p
                className="absolute left-3 top-2 text-[9px] uppercase tracking-[0.26em] font-bold pointer-events-none"
                style={{ color: "color-mix(in oklab, var(--gold) 90%, white)" }}
              >
                {activePins < totalPins ? "Drawing your route…" : "Your route"}
              </p>
            </div>
          ) : null}


          {/* CTA */}
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[11px] uppercase tracking-[0.22em] font-semibold transition-colors duration-150"
            style={{
              background: "var(--teal)",
              color: "var(--ivory)",
            }}
          >
            Continue designing
            <span aria-hidden style={{ color: "var(--gold)" }}>
              ›
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * MemoryRewriteLine — narrates the day's choices in past tense and, when
 * the user goes back and changes a decision, briefly highlights itself in
 * gold + crossfades the new sentence in. Respects prefers-reduced-motion.
 */
function MemoryRewriteLine({ line }: { line: string }) {
  const [shown, setShown] = useState(line);
  const [rewriting, setRewriting] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setShown(line);
      return;
    }
    if (line === shown) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(line);
      return;
    }
    setRewriting(true);
    const t1 = window.setTimeout(() => setShown(line), 180);
    const t2 = window.setTimeout(() => setRewriting(false), 760);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [line, shown]);

  return (
    <p
      className="mt-2 text-[12.5px] italic leading-snug transition-colors duration-[320ms] motion-reduce:transition-none rounded-[3px] px-1 -mx-1"
      style={{
        fontFamily: "var(--font-serif)",
        color: rewriting
          ? "var(--charcoal)"
          : "color-mix(in oklab, var(--charcoal) 62%, transparent)",
        background: rewriting ? "color-mix(in oklab, var(--gold) 14%, transparent)" : "transparent",
        opacity: rewriting ? 0.92 : 1,
      }}
      data-testid="studio-v3-memory-line"
      data-rewriting={rewriting ? "1" : "0"}
      aria-live="polite"
    >
      {shown}
    </p>
  );
}
