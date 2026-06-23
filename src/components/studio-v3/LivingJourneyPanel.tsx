// Studio V3 — Living Journey Panel (compact pill + expandable Journey Draft drawer).
//
// Replaces the older static card. The persistent artifact is now:
//   1. A small inline pill ("Your journey · forming — Wine & food · Solo")
//      that sits above the PhaseShell in normal document flow. Never fixed,
//      never overlaps the active question, choices, footer help, Continue
//      CTA, or browser chrome.
//   2. A near-fullscreen Journey Draft drawer opened on tap, showing the
//      working title, Experience DNA pills (max 4), route line, up to 3
//      moments, investment tier (only once selected), and a stylised
//      editorial route preview rendered as inline SVG (no real map lib,
//      no images, no invented stops — geometry only).
//
// Data rules (locked):
//   - Reads state ONLY through existing curation helpers.
//   - Route + moments come solely from resolveStudioV3Route — never invented.
//   - Hidden on "feeling" / "map" / "storyboard" phases and while a
//     reaction beat plays (via `hidden` prop from StudioV3).
//   - No pill until at least one meaningful DNA choice exists.
//   - No route placeholder paragraphs, no investment placeholder.

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
  INVESTMENT_TIERS,
  PICKUPS,
  RHYTHMS,
  type StudioV3State,
} from "./types";
import { composeLiveStory } from "@/lib/studio-v3/compose-live-story.functions";
import { StudioV3SignatureMap } from "./StudioV3SignatureMap";
import { useRouteLegMinutes, type RouteLegStop } from "@/hooks/use-route-leg-minutes";
import { TimelineView } from "./TimelineView";
import { AffinityBars } from "./AffinityBars";
import { SmartRecommendation } from "./SmartRecommendation";
import { QualityScore } from "./QualityScore";
import { signatureTours } from "@/data/signatureTours";
import { REGION_ORIGIN, type RegionKey } from "@/data/regionStops";
import { regionalVoiceFor } from "./regionalVoice";

/** Local copy of the Signature-region → RegionKey mapping. Keeps this
 *  panel decoupled from StudioV3.tsx while preserving the same logic. */
function tourRegionToRegionKey(region: string | undefined | null): RegionKey {
  const r = (region ?? "").toLowerCase();
  if (r.includes("alentejo") || r.includes("comporta") || r.includes("évora") || r.includes("evora"))
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
}

export function LivingJourneyPanel({ state, hidden = false }: LivingJourneyPanelProps) {
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

  // DNA pills (max 4) — feeling · companions · rhythm · top interest.
  const dna = useMemo(() => {
    const pills: string[] = [];
    if (state.feeling) pills.push(getOptionLabel(FEELINGS, state.feeling));
    if (state.companions) pills.push(getOptionLabel(COMPANIONS, state.companions));
    if (state.rhythm) pills.push(getOptionLabel(RHYTHMS, state.rhythm));
    if (state.interests && state.interests.length > 0) {
      pills.push(getOptionLabel(INTERESTS, state.interests[0]));
    }
    return pills.slice(0, 4);
  }, [state.feeling, state.companions, state.rhythm, state.interests]);

  const meaningfulRoute =
    !!(state.feeling && state.companions && state.rhythm) &&
    !!(state.pickup || (state.interests && state.interests.length > 0));

  const resolved = useMemo(() => {
    if (!meaningfulRoute) return null;
    return resolveStudioV3Route({
      feeling: state.feeling!,
      companions: state.companions!,
      rhythm: state.rhythm!,
      interests: state.interests,
      pickup: state.pickup,
      occasion: state.occasion,
      investment: state.investment,
      destinationIntent: state.destinationIntent,
      dateExact: state.dateExact,
    });
  }, [
    meaningfulRoute,
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

  const routeLine = resolved?.suggestedRouteLabel ?? null;
  const routePoints = (resolved?.routePoints ?? []).slice(0, 4);
  const moments = routePoints.map((p) => p.label);
  const timelineMoments = routePoints.map((p, i) => {
    const kind = inferKind(p.label);
    const prev = i > 0 ? routePoints[i - 1] : null;
    const driveMinBefore =
      prev && prev.lat != null && prev.lng != null && p.lat != null && p.lng != null
        ? haversineDriveMinutes(
            { lat: prev.lat, lng: prev.lng },
            { lat: p.lat, lng: p.lng },
          )
        : null;
    return {
      label: p.label,
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
  const investmentLabel = state.investment
    ? getOptionLabel(INVESTMENT_TIERS, state.investment)
    : null;
  const originLabel = state.pickup ? getOptionLabel(PICKUPS, state.pickup) : null;

  // -------- Scope strip (reference-builder DNA) --------
  // Pull the real Signature behind the resolved route so we can show
  // region · stops · duration · "from €N / guest" — never invented.

  const scopeRegion = resolvedTour?.region ?? null;
  const scopeDuration = resolvedTour?.durationHours ?? null;
  const scopeStops = routePoints.length;
  const scopePriceFromEur =
    resolvedTour?.priceFrom && resolvedTour.priceFrom > 0 ? resolvedTour.priceFrom : null;
  const partyCount = state.guests && state.guests >= 2 ? state.guests : null;
  const scopePartyTotalEur =
    scopePriceFromEur && partyCount ? scopePriceFromEur * partyCount : null;

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
      state.investment ?? "",
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
    state.investment,
  ]);

  useEffect(() => {
    if (hidden) return;
    if (!state.feeling || !state.companions) {
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
          investment: state.investment,
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
  }, [storyKey, hidden]);

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
  if (dna.length === 0) return null; // No meaningful pick yet → no pill.

  // Collapsed copy: prefer scope (region · from €N) when a Signature has
  // resolved — that's the reference-builder clarity. Otherwise fall back
  // to the storytelling cue.
  const dnaSummary = dna.slice(0, 2).join(" · ");
  const scopeTrailing = scopePriceFromEur
    ? `${scopeRegion ?? "Your day"} · from €${scopePriceFromEur} / guest`
    : null;
  const collapsedTrailing = storyLoading
    ? "Composing…"
    : scopeTrailing
      ? scopeTrailing
      : aiStory?.text
        ? "Tap to read"
        : routeLine
          ? "Route forming"
          : dnaSummary || "forming";

  return (
    <>
      <div className="w-full flex justify-center px-3 pt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-label="Open your journey draft"
          className="group inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 transition-[transform,box-shadow,background-color] duration-[220ms] ease-out motion-reduce:transition-none hover:-translate-y-[1px]"
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
            Your journey · forming
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
      </div>

      {open
        ? createPortal(
            <JourneyDraftDrawer
              onClose={() => setOpen(false)}
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
              investmentLabel={investmentLabel}
              storyText={aiStory?.text ?? null}
              storyLoading={storyLoading}
              storySource={aiStory?.source ?? null}
              scopeRegion={scopeRegion}
              scopeDuration={scopeDuration}
              scopeStops={scopeStops}
              scopePriceFromEur={scopePriceFromEur}
              scopePartyCount={partyCount}
              scopePartyTotalEur={scopePartyTotalEur}
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
  investmentLabel: string | null;
  storyText: string | null;
  storyLoading: boolean;
  storySource: "ai" | "fallback" | null;
  /** Scope strip — fuses Bible storytelling with the reference builder's clarity. */
  scopeRegion: string | null;
  scopeDuration: string | null;
  scopeStops: number;
  scopePriceFromEur: number | null;
  scopePartyCount: number | null;
  scopePartyTotalEur: number | null;
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
  investmentLabel,
  storyText,
  storyLoading,
  storySource,
  scopeRegion,
  scopeDuration,
  scopeStops,
  scopePriceFromEur,
  scopePartyCount,
  scopePartyTotalEur,
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
  const totalPins = Math.max(0, Math.min(4, moments.length));
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
                Your journey draft
              </p>
              <h2
                className="mt-1 text-[18px] leading-tight font-semibold"
                style={{ color: "var(--charcoal)", fontFamily: "var(--font-display)" }}
              >
                {title}
              </h2>
              {memoryLine ? <MemoryRewriteLine line={memoryLine} /> : null}
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
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: "italic",
                  }}
                >
                  {storyText}
                </p>
              )}
            </div>
          ) : null}

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

          {/* Scope strip — reference-builder DNA: region · stops · hours ·
              Experience Investment from. Real data only; nothing invented.
              Renders the moment a Signature resolves; before that, the
              dnaSummary above is the only "what you're building" cue. */}
          {scopeRegion || scopeDuration || scopeStops > 0 || scopePriceFromEur ? (
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
              {scopePriceFromEur ? (
                <p className="mt-2 text-[12px] tabular-nums" style={{ color: "var(--charcoal)" }}>
                  <span
                    className="mr-1.5 text-[9px] uppercase tracking-[0.24em] font-bold"
                    style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
                  >
                    Experience Investment
                  </span>
                  <span className="font-semibold">from €{scopePriceFromEur}</span>{" "}
                  <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">
                    / guest
                  </span>
                  {scopePartyTotalEur && scopePartyCount ? (
                    <>
                      {" "}
                      <span style={{ color: "var(--gold)" }}>·</span>{" "}
                      <span>
                        party of {scopePartyCount}{" "}
                        <span className="font-semibold">~€{scopePartyTotalEur}</span>
                      </span>
                    </>
                  ) : null}
                </p>
              ) : (
                <p
                  className="mt-2 text-[11px] italic"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
                  }}
                >
                  Experience Investment — shaped with you.
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
                    {moments.slice(0, 3).map((m, i) => (
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
              <div className="-mx-5 mt-1">
                <QualityScore state={fullState} />
              </div>
              <SmartRecommendation
                tourId={tourId}
                stopCount={stopCount}
                durationLabel={durationLabel}
              />
              <AffinityBars
                feeling={feeling}
                interests={interests}
                rhythm={rhythm}
                companions={companions}
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

          {/* Investment — label only, only after selection */}
          {investmentLabel ? (
            <p
              className="mt-3 text-[12px] leading-snug"
              style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
            >
              <span
                className="mr-1.5 text-[9.5px] uppercase tracking-[0.22em] font-bold"
                style={{ color: "color-mix(in oklab, var(--teal) 85%, transparent)" }}
              >
                Investment
              </span>
              {investmentLabel}
            </p>
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
