import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Eye, Loader2, Plus, RefreshCw, Share2, Sparkles, Trash2, Wand2, X } from "lucide-react";
import {
  buildDayRoute,
  computeAddStopEligibility,
  listRegionStops,
} from "@/lib/builderEngine.functions";
import { suggestFromIntent } from "@/lib/builderIntent.functions";
import { narrateBuilderRoute } from "@/lib/builderEngine.functions";
import { fmtMinutes, type Pace, type RouteUI, type RoutedStopUI, type Mood, type Who, type Intention } from "@/components/builder/types";
import { AddStopSheet, type RegionStop, type StopEligibility } from "@/components/builder/AddStopSheet";
import { CtaButton } from "@/components/ui/CtaButton";
import { StickyBar } from "@/components/builder/StickyBar";
import type { DayState, MultiDayState } from "@/hooks/useMultiDayBuilder";

const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);

interface Props {
  state: MultiDayState;
  activeDay: DayState;
  onSetActiveDay: (id: string) => void;
  onAddDay: () => void;
  onRemoveDay: (id: string) => void;
  onMoveStop: (idx: number, dir: -1 | 1) => void;
  onRemoveStop: (key: string) => void;
  onAddStop: (key: string) => void;
  onSetGuests: (n: number) => void;
  onSetPace: (p: Pace) => void;
  onSetIntent: (intent: string) => void;
  onShare: () => Promise<string>;
  onRotateLink?: () => Promise<string | null>;
  onRevokeLink?: () => Promise<boolean>;
  sessionId?: string | null;
  readOnly?: boolean;
  syncing?: boolean;
  shareToken?: string | null;
  mood?: Mood;
  who?: Who;
  intention?: Intention;
  onConfirm: () => void;
  onReset: () => void;
}

export function MultiDayBuilder({
  state,
  activeDay,
  onSetActiveDay,
  onAddDay,
  onRemoveDay,
  onMoveStop,
  onRemoveStop,
  onAddStop,
  onSetGuests,
  onSetPace,
  onSetIntent,
  onShare,
  onRotateLink,
  onRevokeLink,
  sessionId = null,
  readOnly = false,
  syncing = false,
  shareToken = null,
  mood,
  who,
  intention,
  onConfirm,
  onReset,
}: Props) {
  // Per-day route + eligibility — recomputed live on every change.
  const [dayRoutes, setDayRoutes] = useState<Record<string, RouteUI | null>>({});
  const [routeLoadingId, setRouteLoadingId] = useState<string | null>(null);
  const [regionStops, setRegionStops] = useState<RegionStop[]>([]);
  const [regionCenter, setRegionCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, StopEligibility>>({});
  const [eligLoading, setEligLoading] = useState(false);
  const [rules, setRules] = useState<{ max_km_between_stops: number; max_total_km_per_day: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Mobile no longer toggles between map/build — they share one scroll.
  const [liveToast, setLiveToast] = useState<string | null>(null);

  const flashLive = useCallback((t: string) => {
    setLiveToast(t);
    window.setTimeout(() => setLiveToast(null), 1300);
  }, []);

  // Load region stops + center whenever active region changes.
  const lastRegionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeDay) return;
    if (lastRegionRef.current === activeDay.regionKey) return;
    lastRegionRef.current = activeDay.regionKey;
    let cancelled = false;
    void listRegionStops({ data: { regionKey: activeDay.regionKey } }).then((r) => {
      if (cancelled) return;
      setRegionStops(r.stops);
      setRegionCenter(
        r.region ? { lat: Number(r.region.lat), lng: Number(r.region.lng) } : null,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [activeDay?.regionKey]);

  // Recompute route + eligibility for the active day whenever its stops/pace change.
  // Debounced minimally with the request id pattern to avoid stale overwrites.
  const reqIdRef = useRef(0);
  useEffect(() => {
    if (!activeDay) return;
    const id = ++reqIdRef.current;
    setRouteLoadingId(activeDay.id);
    setEligLoading(true);

    const payload = {
      data: {
        regionKey: activeDay.regionKey,
        pace: state.pace,
        stopKeys: activeDay.stopKeys,
      },
    };

    Promise.all([buildDayRoute(payload), computeAddStopEligibility(payload)])
      .then(([routeRes, eligRes]) => {
        if (reqIdRef.current !== id) return;
        setDayRoutes((prev) => ({ ...prev, [activeDay.id]: routeRes.route as RouteUI }));
        const map: Record<string, StopEligibility> = {};
        for (const e of eligRes.eligibility) map[e.key] = e;
        setEligibility(map);
        if (eligRes.rules) setRules(eligRes.rules);
      })
      .catch((e) => {
        console.error("[multi-day-builder] recalc failed", e);
      })
      .finally(() => {
        if (reqIdRef.current !== id) return;
        setRouteLoadingId(null);
        setEligLoading(false);
      });
  }, [activeDay?.id, activeDay?.stopKeys, activeDay?.regionKey, state.pace]);

  // Live recompute every OTHER day's route for accurate trip totals + tabs.
  useEffect(() => {
    let cancelled = false;
    for (const d of state.days) {
      if (activeDay?.id === d.id) continue;
      void buildDayRoute({
        data: { regionKey: d.regionKey, pace: state.pace, stopKeys: d.stopKeys },
      })
        .then((r) => {
          if (cancelled) return;
          setDayRoutes((prev) => ({ ...prev, [d.id]: r.route as RouteUI }));
        })
        .catch(() => { /* ignore */ });
    }
    return () => { cancelled = true; };
  }, [state.days, state.pace, activeDay?.id]);

  const activeRoute = activeDay ? dayRoutes[activeDay.id] ?? null : null;

  // ─── Live storytelling ─────────────────────────────────────────
  // Per-active-day narrative from narrateBuilderRoute. Debounced so
  // users editing rapidly don't trigger a flood. Soft cross-fade via
  // narrativeLoading flag (kept truthy until the new text replaces).
  const [narrative, setNarrative] = useState<string>("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeNonce, setNarrativeNonce] = useState(0);
  const [narrativeCopied, setNarrativeCopied] = useState(false);
  const narrativeReqRef = useRef(0);
  const effMood: Mood = mood ?? "slow";
  const effWho: Who = who ?? "couple";
  const effIntention: Intention = intention ?? "hidden";

  useEffect(() => {
    if (!activeDay || activeDay.stopKeys.length === 0) {
      setNarrative("");
      setNarrativeLoading(false);
      return;
    }
    setNarrativeLoading(true);
    const id = ++narrativeReqRef.current;
    const t = window.setTimeout(() => {
      void narrateBuilderRoute({
        data: {
          routeStopKeys: activeDay.stopKeys,
          mood: effMood,
          who: effWho,
          intention: effIntention,
          pace: state.pace,
          regionKey: activeDay.regionKey,
        },
      })
        .then((res) => {
          if (narrativeReqRef.current !== id) return;
          setNarrative(res.narrative);
        })
        .catch(() => { /* keep previous narrative */ })
        .finally(() => {
          if (narrativeReqRef.current !== id) return;
          setNarrativeLoading(false);
        });
    }, 550);
    return () => window.clearTimeout(t);
  }, [
    activeDay?.id,
    activeDay?.stopKeys,
    activeDay?.regionKey,
    state.pace,
    effMood,
    effWho,
    effIntention,
    narrativeNonce,
  ]);


  // ─── AI user intent ─────────────────────────────────────────────
  const [intentDraft, setIntentDraft] = useState(state.intent ?? "");
  useEffect(() => { setIntentDraft(state.intent ?? ""); }, [state.intent]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggested, setAiSuggested] = useState<string[]>([]);
  const [aiRanked, setAiRanked] = useState<string[]>([]);

  const runIntent = useCallback(async () => {
    if (!activeDay) return;
    const text = intentDraft.trim();
    if (text.length < 2) return;
    if (!sessionId) return;
    onSetIntent(text);
    setAiLoading(true);
    try {
      const res = await suggestFromIntent({
        data: {
          intent: text,
          regionKey: activeDay.regionKey,
          excludedKeys: activeDay.stopKeys,
          sessionId,
        },
      });
      setAiSuggested(res.suggestedStopKeys);
      setAiRanked(res.rankedKeys);
      if (res.source === "rate_limited") {
        flashLive("Easy now — try again in a moment");
      } else {
        flashLive("AI shaped this day · review suggestions");
        setSheetOpen(true);
      }
    } catch (e) {
      console.error("[builder] suggestFromIntent", e);
    } finally {
      setAiLoading(false);
    }
  }, [activeDay, intentDraft, onSetIntent, flashLive, sessionId]);

  /** Apply the AI's top-suggested stops to the current day, in order,
   *  filtered by live eligibility (radius/timing/already-added). */
  const applySuggested = useCallback(() => {
    if (!activeDay || readOnly) return;
    let added = 0;
    for (const key of aiSuggested) {
      if (activeDay.stopKeys.includes(key)) continue;
      const e = eligibility[key];
      if (e && !e.eligible) continue;
      onAddStop(key);
      added += 1;
    }
    if (added > 0) {
      flashLive(`Added ${added} suggested stop${added === 1 ? "" : "s"}`);
      setSheetOpen(false);
    } else {
      flashLive("No suggestions fit the current day's rules");
    }
  }, [activeDay, aiSuggested, eligibility, onAddStop, readOnly, flashLive]);

  const eligibleSuggestedCount = useMemo(() => {
    if (!activeDay) return 0;
    return aiSuggested.filter(
      (k) => !activeDay.stopKeys.includes(k) && (eligibility[k]?.eligible ?? false),
    ).length;
  }, [aiSuggested, activeDay, eligibility]);

  // Aggregate trip totals across all days
  const tripTotals = useMemo(() => {
    let mins = 0;
    let perPerson = 0;
    let stops = 0;
    for (const d of state.days) {
      const r = dayRoutes[d.id];
      if (r) {
        mins += r.totals.experienceMinutes;
        perPerson += r.pricePerPersonEur;
        stops += r.stops.length;
      }
    }
    return { mins, perPerson, stops };
  }, [state.days, dayRoutes]);

  // Trip-level connecting summary (deterministic, no extra AI call).
  const tripSummary = useMemo(() => {
    if (state.days.length <= 1) return "";
    const labels = state.days
      .map((d) => dayRoutes[d.id]?.region.label)
      .filter((l): l is string => Boolean(l));
    if (labels.length === 0) return "";
    const unique = Array.from(new Set(labels));
    const arc =
      unique.length === 1
        ? `${unique[0]} unfolds across ${state.days.length} days`
        : `${unique.slice(0, -1).join(", ")} into ${unique[unique.length - 1]}`;
    return `${state.days.length} days · ${tripTotals.stops} stops · ${arc}.`;
  }, [state.days, dayRoutes, tripTotals.stops]);

  const handleCopyNarrative = useCallback(async () => {
    const text = [narrative, tripSummary].filter(Boolean).join("\n\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setNarrativeCopied(true);
      window.setTimeout(() => setNarrativeCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [narrative, tripSummary]);

  const candidatesForMap = useMemo(() => {
    return regionStops.map((s) => {
      const e = eligibility[s.key];
      if (activeDay?.stopKeys.includes(s.key)) return null;
      return {
        key: s.key,
        label: s.label,
        lat: s.lat,
        lng: s.lng,
        eligible: e?.eligible ?? false,
        reason: e?.reason,
      };
    }).filter(Boolean) as { key: string; label: string; lat: number; lng: number; eligible: boolean; reason?: string }[];
  }, [regionStops, eligibility, activeDay?.stopKeys]);

  // Re-order region stops by AI ranking when present.
  const orderedRegionStops = useMemo(() => {
    if (aiRanked.length === 0) return regionStops;
    const idx = new Map(aiRanked.map((k, i) => [k, i]));
    return [...regionStops].sort((a, b) => {
      const ia = idx.has(a.key) ? (idx.get(a.key) as number) : 9999;
      const ib = idx.has(b.key) ? (idx.get(b.key) as number) : 9999;
      return ia - ib;
    });
  }, [regionStops, aiRanked]);

  const handleAdd = (k: string) => {
    onAddStop(k);
    flashLive("Adding stop · reshaping the day");
    setSheetOpen(false);
  };

  // ─── Share link ─────────────────────────────────────────────────
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const url = await onShare();
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        flashLive("Share link copied");
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        window.prompt("Copy this link to share your journey:", url);
      }
    } catch (e) {
      console.error("[builder] share failed", e);
    } finally {
      setSharing(false);
    }
  }, [onShare, flashLive]);

  const [rotating, setRotating] = useState(false);
  const [rotatedUrl, setRotatedUrl] = useState<string | null>(null);
  const [rotatedCopied, setRotatedCopied] = useState(false);
  const handleRotate = useCallback(async () => {
    if (!onRotateLink) return;
    if (!window.confirm("Generate a new share link? The old link will stop working.")) return;
    setRotating(true);
    try {
      const url = await onRotateLink();
      if (url) {
        try { await navigator.clipboard.writeText(url); setRotatedCopied(true); } catch { /* ignore */ }
        setRotatedUrl(url);
        flashLive("New link generated · old link disabled");
      }
    } finally {
      setRotating(false);
    }
  }, [onRotateLink, flashLive]);

  const copyRotatedUrl = useCallback(async () => {
    if (!rotatedUrl) return;
    try {
      await navigator.clipboard.writeText(rotatedUrl);
      setRotatedCopied(true);
      flashLive("New link copied");
      window.setTimeout(() => setRotatedCopied(false), 1800);
    } catch {
      window.prompt("Copy this link to share your journey:", rotatedUrl);
    }
  }, [rotatedUrl, flashLive]);

  const handleRevoke = useCallback(async () => {
    if (!onRevokeLink) return;
    if (!window.confirm("Disable the public link? Anyone with the old link will lose access.")) return;
    const ok = await onRevokeLink();
    if (ok) {
      setRotatedUrl(null);
      flashLive("Share link revoked");
    }
  }, [onRevokeLink, flashLive]);

  const dayIndex = activeDay ? state.days.findIndex((d) => d.id === activeDay.id) : 0;

  return (
    <>
      {liveToast && (
        <div
          aria-live="polite"
          className="fixed top-20 left-1/2 z-[60] -translate-x-1/2"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--ivory)]/95 px-3.5 py-1.5 text-[11.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)] shadow-[0_8px_22px_-10px_rgba(46,46,46,0.35)] backdrop-blur">
            <Sparkles size={11} className="text-[color:var(--gold)]" />
            {liveToast}
          </span>
        </div>
      )}

      {/* Editorial header */}
      <header className="container-x pt-5 md:pt-8 pb-1 md:pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
            <Sparkles size={12} aria-hidden="true" />
            {readOnly ? "Shared journey" : "Now shaping"}
            {syncing && !readOnly && (
              <Loader2 size={11} className="animate-spin text-[color:var(--charcoal)]/50" aria-label="Saving" />
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {!readOnly && (
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing}
                className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--teal)] hover:bg-[color:var(--teal)]/8 disabled:opacity-50"
              >
                {copied ? <Check size={12} /> : sharing ? <Loader2 size={12} className="animate-spin" /> : shareToken ? <Copy size={12} /> : <Share2 size={12} />}
                {copied ? "Copied" : shareToken ? "Copy link" : "Share"}
              </button>
            )}
            {!readOnly && shareToken && onRotateLink && (
              <button
                type="button"
                onClick={handleRotate}
                disabled={rotating}
                title="Disable old link, generate a new one"
                className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--teal)] hover:bg-[color:var(--teal)]/8 disabled:opacity-50"
              >
                {rotating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Regenerate
              </button>
            )}
            {!readOnly && shareToken && onRevokeLink && (
              <button
                type="button"
                onClick={handleRevoke}
                className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)]/60 hover:text-red-700 hover:bg-red-50"
              >
                <X size={12} />
                Revoke
              </button>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)]/55 hover:text-[color:var(--teal)] rounded-sm px-1 py-0.5 transition-colors"
              >
                <X size={12} aria-hidden="true" />
                Start over
              </button>
            )}
          </div>
        </div>
        {readOnly && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)]/50 px-3 py-1.5 text-[11px] text-[color:var(--charcoal)]/75">
            <Eye size={12} aria-hidden="true" /> View only — only the original device can edit this journey.
          </p>
        )}
        {!readOnly && rotatedUrl && (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 rounded-[3px] border border-[color:var(--gold)]/40 bg-[color:var(--ivory)] px-3 py-2.5 shadow-[0_8px_22px_-14px_rgba(46,46,46,0.25)]"
          >
            <div className="flex items-start gap-2">
              <Sparkles size={13} className="mt-0.5 text-[color:var(--gold)] shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)]">
                  New share link ready
                </p>
                <p className="mt-0.5 text-[11px] text-[color:var(--charcoal)]/65">
                  The old link is disabled. Send this one instead.
                </p>
                <div className="mt-2 flex items-stretch gap-1.5">
                  <input
                    readOnly
                    value={rotatedUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="New share link"
                    className="min-w-0 flex-1 rounded-[2px] border border-[color:var(--charcoal)]/15 bg-white px-2 py-1.5 font-mono text-[11px] text-[color:var(--charcoal)] focus:outline-none focus:ring-1 focus:ring-[color:var(--teal)]"
                  />
                  <button
                    type="button"
                    onClick={copyRotatedUrl}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-[2px] bg-[color:var(--teal)] px-2.5 text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--ivory)] hover:bg-[color:var(--teal-2)]"
                  >
                    {rotatedCopied ? <Check size={12} /> : <Copy size={12} />}
                    {rotatedCopied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotatedUrl(null)}
                    aria-label="Dismiss"
                    className="inline-flex min-h-[36px] items-center justify-center rounded-[2px] px-2 text-[color:var(--charcoal)]/55 hover:text-[color:var(--charcoal)] hover:bg-[color:var(--sand)]/60"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <h2 className="serif mt-2 text-[1.7rem] sm:text-[2rem] md:text-[2.4rem] leading-[1.05] tracking-[-0.01em] font-semibold text-[color:var(--charcoal)]">
          Your journey
          {state.days.length > 1 && (
            <span className="serif italic font-normal text-[color:var(--charcoal)]/70">
              {" "}— {state.days.length} days · {tripTotals.stops} stops
            </span>
          )}
        </h2>

        {/* AI user intent */}
        {!readOnly && (
          <div className="mt-4 flex items-stretch gap-2">
            <input
              type="text"
              value={intentDraft}
              onChange={(e) => setIntentDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void runIntent(); }}
              placeholder="Tell us the feeling — e.g. romantic slow weekend, wine + sea"
              maxLength={500}
              className="flex-1 min-w-0 rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-3 py-2 text-[13px] text-[color:var(--charcoal)] placeholder:text-[color:var(--charcoal)]/40 focus:border-[color:var(--gold)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void runIntent()}
              disabled={aiLoading || intentDraft.trim().length < 2}
              className="inline-flex items-center gap-1.5 rounded-[2px] border border-[color:var(--gold)] bg-[color:var(--gold)]/10 px-3 py-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)] hover:bg-[color:var(--gold)]/20 disabled:opacity-40"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              Suggest
            </button>
          </div>
        )}
        {!readOnly && aiSuggested.length > 0 && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-[2px] border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 px-3 py-2">
            <p className="text-[11.5px] text-[color:var(--charcoal)]/80">
              <span className="font-semibold">{aiSuggested.length}</span> AI suggestion{aiSuggested.length === 1 ? "" : "s"} ·{" "}
              <span className="text-[color:var(--charcoal)]/60">{eligibleSuggestedCount} fit this day's rules</span>
            </p>
            <button
              type="button"
              onClick={applySuggested}
              disabled={eligibleSuggestedCount === 0}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-[2px] bg-[color:var(--teal)] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.22em] font-bold text-[color:var(--ivory)] hover:bg-[color:var(--teal-2)] disabled:opacity-40"
            >
              <Sparkles size={11} />
              Apply suggested
            </button>
          </div>
        )}
      </header>

      {/* Day tabs */}
      <div className="container-x mt-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
          {state.days.map((d, idx) => {
            const r = dayRoutes[d.id];
            const active = d.id === activeDay?.id;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSetActiveDay(d.id)}
                className={[
                  "shrink-0 flex flex-col items-start rounded-[2px] border px-3 py-2 text-left transition-colors min-w-[88px]",
                  active
                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/8"
                    : "border-[color:var(--charcoal)]/12 hover:border-[color:var(--charcoal)]/30 bg-[color:var(--ivory)]",
                ].join(" ")}
              >
                <span className="text-[9.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--gold)]">
                  Day {idx + 1}
                </span>
                <span className="mt-0.5 text-[12px] font-semibold text-[color:var(--charcoal)] tabular-nums">
                  {r ? `${r.stops.length} stop${r.stops.length === 1 ? "" : "s"}` : "—"}
                </span>
                <span className="text-[10.5px] text-[color:var(--charcoal)]/60 tabular-nums">
                  {r ? fmtMinutes(r.totals.experienceMinutes) : "·"}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onAddDay}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-[2px] border border-dashed border-[color:var(--charcoal)]/25 px-3 py-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]/70 hover:text-[color:var(--charcoal)] hover:border-[color:var(--charcoal)]/50 min-h-[58px]"
          >
            <Plus size={13} />
            Add day
          </button>
        </div>
      </div>

      {/* Mobile tab bar removed — map and build now share one scroll */}

      {/* Main split — mobile: map stacked above build (one scroll, no tabs) */}
      <section className="container-x py-6 md:py-10">
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* MAP */}
          <div className="relative overflow-hidden rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)] shadow-[0_18px_40px_-24px_rgba(46,46,46,0.35)] h-[42svh] sm:h-[52svh] lg:h-[74svh] lg:sticky lg:top-20">
            <Suspense fallback={<div className="h-full w-full bg-[color:var(--sand)]" aria-hidden="true" />}>
              <BuilderMap
                stops={activeRoute?.stops ?? []}
                regionCenter={regionCenter}
                regionKey={activeDay?.regionKey}
                candidates={candidatesForMap}
                onCandidateClick={(k) => handleAdd(k)}
              />
            </Suspense>
            {/* Map legend */}
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[2px] bg-[color:var(--ivory)]/95 px-3 py-2 text-[9.5px] sm:text-[10px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)]/75 backdrop-blur shadow-sm">
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--teal)]" /> In your day</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--gold)]" /> Reachable</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#9a8f80] opacity-60" /> Out of range</span>
            </div>
          </div>

          {/* BUILD PANEL */}
          <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] min-h-[40svh] flex flex-col">

            <div className="p-5 md:p-6 flex flex-col gap-5 flex-1">
              {/* Day header w/ remove */}
              <header className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
                    Day {dayIndex + 1}
                  </span>
                  <h3 className="serif mt-1 text-[1.4rem] leading-[1.1] font-semibold text-[color:var(--charcoal)]">
                    {activeRoute?.region.label ?? "Loading…"}
                  </h3>
                  {activeRoute && (
                    <p className="mt-1 text-[12px] text-[color:var(--charcoal)]/60">
                      {fmtMinutes(activeRoute.totals.experienceMinutes)} total ·{" "}
                      {fmtMinutes(activeRoute.totals.drivingMinutes)} drive ·{" "}
                      €{activeRoute.pricePerPersonEur} pp
                    </p>
                  )}
                </div>
                {state.days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => activeDay && onRemoveDay(activeDay.id)}
                    aria-label="Remove this day"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--charcoal)]/45 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </header>

              {routeLoadingId === activeDay?.id && (
                <div className="inline-flex items-center gap-2 text-[12px] text-[color:var(--charcoal)]/70">
                  <Loader2 size={13} className="animate-spin text-[color:var(--gold)]" />
                  Recalculating distance, time and price…
                </div>
              )}

              {activeRoute?.warnings && activeRoute.warnings.length > 0 && (
                <ul className="rounded-[2px] border border-amber-300/50 bg-amber-50/60 p-3 text-[12px] text-amber-900">
                  {activeRoute.warnings.map((w, i) => (
                    <li key={i}>· {w}</li>
                  ))}
                </ul>
              )}

              {/* Story — live narrative for this day, soft cross-fade on edits */}
              {activeDay && activeDay.stopKeys.length > 0 && (
                <section
                  aria-live="polite"
                  className="rounded-[2px] border border-[color:var(--gold)]/30 bg-[color:var(--sand)]/40 px-3.5 py-3.5 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.28em] font-bold text-[color:var(--gold)]">
                      <Sparkles size={11} aria-hidden="true" />
                      Day {dayIndex + 1} story
                    </span>
                    {narrativeLoading && (
                      <Loader2
                        size={11}
                        className="animate-spin text-[color:var(--charcoal)]/40 shrink-0"
                        aria-label="Rewriting"
                      />
                    )}
                  </div>
                  {narrative ? (
                    <p
                      className={[
                        "mt-2.5 serif italic text-[15px] sm:text-[14.5px] leading-[1.62] sm:leading-[1.55] text-[color:var(--charcoal)]/85 transition-opacity duration-300 [text-wrap:pretty] hyphens-auto",
                        narrativeLoading ? "opacity-50" : "opacity-100",
                      ].join(" ")}
                    >
                      {narrative}
                    </p>
                  ) : (
                    <div className="mt-2.5 space-y-2" aria-hidden="true">
                      <div className="h-3 w-[92%] animate-pulse rounded-sm bg-[color:var(--charcoal)]/8" />
                      <div className="h-3 w-[78%] animate-pulse rounded-sm bg-[color:var(--charcoal)]/8" />
                      <div className="h-3 w-[60%] animate-pulse rounded-sm bg-[color:var(--charcoal)]/8" />
                    </div>
                  )}
                  {tripSummary && (
                    <p className="mt-3 border-t border-[color:var(--charcoal)]/10 pt-2.5 text-[10.5px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] font-semibold text-[color:var(--charcoal)]/55 leading-[1.5] [text-wrap:balance]">
                      {tripSummary}
                    </p>
                  )}
                  {/* Controls — 44×44 tap targets, comfortable spacing on mobile */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color:var(--charcoal)]/10 pt-3">
                    <button
                      type="button"
                      onClick={() => setNarrativeNonce((n) => n + 1)}
                      disabled={narrativeLoading || !narrative}
                      aria-label="Rewrite this day's story"
                      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-3.5 text-[11.5px] uppercase tracking-[0.18em] font-bold text-[color:var(--charcoal)] transition-colors hover:border-[color:var(--gold)]/60 hover:text-[color:var(--gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={13} className={narrativeLoading ? "animate-spin" : ""} aria-hidden="true" />
                      Rewrite
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyNarrative}
                      disabled={!narrative}
                      aria-label="Copy this day's story"
                      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-3.5 text-[11.5px] uppercase tracking-[0.18em] font-bold text-[color:var(--charcoal)] transition-colors hover:border-[color:var(--gold)]/60 hover:text-[color:var(--gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {narrativeCopied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                      {narrativeCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </section>
              )}

              {/* Stops list */}
              <section>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
                    Selected moments
                  </span>
                  <span className="text-[11px] text-[color:var(--charcoal)]/50 tabular-nums">
                    {activeDay?.stopKeys.length ?? 0} stop{(activeDay?.stopKeys.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
                {(!activeDay || activeDay.stopKeys.length === 0) ? (
                  <p className="mt-3 rounded-[2px] border border-dashed border-[color:var(--charcoal)]/15 p-4 text-[12.5px] text-[color:var(--charcoal)]/65">
                    Empty day. Tap a gold pin on the map, or use Add stop below to pick from what's reachable here.
                  </p>
                ) : (
                  <ol className="mt-3 flex flex-col gap-2">
                    {(activeRoute?.stops ?? []).map((s: RoutedStopUI, i) => (
                      <li
                        key={s.key}
                        className="flex items-start gap-3 rounded-[2px] border border-[color:var(--charcoal)]/10 bg-[color:var(--ivory)] p-3"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--teal)] text-[11px] font-bold text-[color:var(--ivory)] tabular-nums">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold leading-tight text-[color:var(--charcoal)]">
                            {s.label}
                          </p>
                          {s.tag && (
                            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[color:var(--gold)]">
                              {s.tag}
                            </p>
                          )}
                          <p className="mt-1 text-[12px] text-[color:var(--charcoal)]/60 tabular-nums">
                            {fmtMinutes(s.duration_minutes)} on stop
                            {i > 0 && s.driveMinutesFromPrev > 0
                              ? ` · ${fmtMinutes(s.driveMinutesFromPrev)} drive`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onMoveStop(i, -1)}
                            disabled={i === 0}
                            aria-label="Move earlier"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/45 hover:text-[color:var(--charcoal)] hover:bg-[color:var(--charcoal)]/5 disabled:opacity-25"
                          >↑</button>
                          <button
                            type="button"
                            onClick={() => onMoveStop(i, 1)}
                            disabled={i === (activeRoute?.stops.length ?? 0) - 1}
                            aria-label="Move later"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/45 hover:text-[color:var(--charcoal)] hover:bg-[color:var(--charcoal)]/5 disabled:opacity-25"
                          >↓</button>
                          <button
                            type="button"
                            onClick={() => onRemoveStop(s.key)}
                            aria-label={`Remove ${s.label}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--charcoal)]/45 hover:text-red-700 hover:bg-red-50"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[2px] border border-[color:var(--gold)]/60 bg-[color:var(--gold)]/8 px-3 py-2.5 text-[12px] uppercase tracking-[0.22em] font-bold text-[color:var(--charcoal)] hover:bg-[color:var(--gold)]/15"
                >
                  <Plus size={14} />
                  Add stop to Day {dayIndex + 1}
                </button>
              </section>

              {/* Pace + guests */}
              <section className="mt-auto grid grid-cols-2 gap-3 border-t border-[color:var(--charcoal)]/10 pt-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
                    Rhythm (all days)
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(["relaxed", "balanced", "full"] as Pace[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onSetPace(p)}
                        aria-pressed={state.pace === p}
                        className={[
                          "rounded-[2px] border py-1.5 text-[10.5px] uppercase tracking-[0.18em] font-bold capitalize",
                          state.pace === p
                            ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10 text-[color:var(--charcoal)]"
                            : "border-[color:var(--charcoal)]/15 text-[color:var(--charcoal)]/65",
                        ].join(" ")}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
                    Guests
                  </span>
                  <div className="mt-2 inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSetGuests(state.guests - 1)}
                      disabled={state.guests <= 1}
                      className="h-9 w-9 rounded-full border border-[color:var(--charcoal)]/15 text-[14px] disabled:opacity-30"
                    >
                      –
                    </button>
                    <span className="serif text-[1.1rem] font-semibold tabular-nums w-7 text-center">
                      {state.guests}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSetGuests(state.guests + 1)}
                      disabled={state.guests >= 12}
                      className="h-9 w-9 rounded-full border border-[color:var(--charcoal)]/15 text-[14px] disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Trip totals row */}
        {state.days.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3 rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)]/40 p-4">
            <div>
              <p className="text-[9.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)]/55">Days</p>
              <p className="serif mt-1 text-[1.25rem] font-semibold tabular-nums">{state.days.length}</p>
            </div>
            <div>
              <p className="text-[9.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)]/55">Total time</p>
              <p className="serif mt-1 text-[1.25rem] font-semibold tabular-nums">{fmtMinutes(tripTotals.mins)}</p>
            </div>
            <div>
              <p className="text-[9.5px] uppercase tracking-[0.24em] font-bold text-[color:var(--charcoal)]/55">Per person</p>
              <p className="serif mt-1 text-[1.25rem] font-semibold tabular-nums">€{tripTotals.perPerson}</p>
            </div>
          </div>
        )}

        {/* Confirm */}
        <div className="mt-6 flex justify-end">
          <CtaButton
            type="button"
            onClick={onConfirm}
            disabled={tripTotals.stops === 0}
            variant="primary"
            size="sm"
          >
            Review &amp; confirm
          </CtaButton>
        </div>
      </section>

      <StickyBar
        totalMinutes={tripTotals.mins}
        pricePerPersonEur={tripTotals.perPerson}
        guests={state.guests}
        setGuests={onSetGuests}
        onConfirm={onConfirm}
        disabled={tripTotals.stops === 0}
        ctaLabel="Review & confirm"
      />



      <AddStopSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        loading={eligLoading || aiLoading}
        stops={orderedRegionStops}
        eligibility={eligibility}
        onAdd={handleAdd}
        rules={rules}
        suggestedKeys={aiSuggested}
      />
    </>
  );
}
