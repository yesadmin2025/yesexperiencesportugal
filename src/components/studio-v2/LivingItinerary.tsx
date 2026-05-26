/**
 * Studio v2 — Living Itinerary (cinematic, gesture-first).
 *
 * Replaces the Refine "editor" surface with a full-bleed vertical scroll of
 * scenes — one per real stop. Each scene shows:
 *   - an atmospheric backdrop image derived from the stop's tag
 *   - a time-of-day strip computed from cumulative dwell + drive
 *   - 1–2 atmospheric lines (label + blurb), restrained
 *   - a thin numbered ribbon on the left
 *
 * Gestures (mobile-first):
 *   - swipe LEFT on a scene  → silently substitute next best-fit alternate
 *   - long-press on a scene  → "more like this" signal to the predictive engine
 *
 * F.9 additions — map as co-protagonist:
 *   - Ambient sticky map sits BEHIND the scroll, panning to the active scene
 *   - One-shot Reveal moment when the engine reaches confidence ≥ threshold
 *     (4 micro-signals): scene fades, map blooms full-screen for ~4s, collapses
 *
 * The classic editor (Swap / Remove / Reorder buttons) is preserved behind a
 * "Show all controls" escape hatch button for A11y / power users.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Settings2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackBuilderEvent } from "@/lib/builder-analytics";
import { getOrCreateAnonId } from "@/lib/ab-testing";
import { recordSignal } from "@/lib/studio-v2/predictions.functions";
import type { GestureSignal } from "@/lib/studio-v2/predictions";
import type { PriorityKey } from "@/lib/studio-v2/profile";
import { INTENT_IMAGE } from "@/lib/studio-v2/images";
import type { IntentAtmosphere } from "@/lib/studio-v2/profile";
import { RefineStage, type RefineStop, type RefineAlternate, type RefineCaps } from "./RefineStage";
import { MapReveal } from "./MapReveal";

const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);

interface Props {
  stops: RefineStop[];
  alternates: RefineAlternate[];
  caps?: RefineCaps;
  onChange: (next: RefineStop[]) => void;
  /** Default backdrop when a tag isn't recognised. Comes from the profile intent. */
  intent?: IntentAtmosphere;
  /** Region key for the ambient + reveal map. */
  regionKey?: string;
  /** Region centre for the ambient + reveal map. */
  regionCenter?: { lat: number; lng: number } | null;
}

// Reveal moment fires once per session when signalCount crosses this threshold.
const REVEAL_SIGNAL_THRESHOLD = 4;

// ─── tag → atmosphere + priority hints ───────────────────────────────────

function atmosphereFromTag(tag: string | null, fallback: IntentAtmosphere): IntentAtmosphere {
  switch (tag) {
    case "winery":
    case "cellar":
    case "table":
    case "market":
    case "workshop":   return "food_local";
    case "beach":      return "coastal_cinematic";
    case "viewpoint":  return "relaxed_scenic";
    case "village":    return "romantic_intimate";
    case "heritage":   return "elegant_cultural";
    default:           return fallback;
  }
}

function prioritiesFromTag(tag: string | null): PriorityKey[] {
  switch (tag) {
    case "winery":     return ["vineyard_lunch"];
    case "cellar":     return ["wine_cellar"];
    case "beach":      return ["coastal_scenery", "boat"];
    case "viewpoint":  return ["photography", "coastal_scenery"];
    case "village":    return ["hidden_villages"];
    case "heritage":   return ["heritage", "architecture"];
    case "table":
    case "market":
    case "workshop":   return ["local_gastronomy"];
    default:           return [];
  }
}

// ─── atmospheric line by tag (one line, sentence case, no poetry overreach)

function atmosphericLine(tag: string | null): string {
  switch (tag) {
    case "winery":    return "Slow light through the vines, glass in hand.";
    case "cellar":    return "Cool stone, the patience of old barrels.";
    case "beach":     return "Salt air, the Atlantic doing the talking.";
    case "viewpoint": return "A long pause where the country opens up.";
    case "village":   return "Cobblestones and a quiet that holds.";
    case "heritage":  return "Centuries layered under one roof.";
    case "table":     return "A long table, no rush, no menu to chase.";
    case "market":    return "Hands on the produce, voices overlapping.";
    case "workshop":  return "Watching something made the way it should be.";
    default:          return "A real moment, on real Portuguese ground.";
  }
}

// ─── time-of-day helper ──────────────────────────────────────────────────

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtClock(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function periodLabel(min: number): string {
  const h = min / 60;
  if (h < 11)  return "morning";
  if (h < 13)  return "late morning";
  if (h < 15)  return "lunch";
  if (h < 17)  return "afternoon";
  if (h < 19)  return "late light";
  if (h < 21)  return "early evening";
  return "evening";
}

// Computes arrival clock per stop assuming a 10:00 start, 55 km/h average drive.
function computeArrivals(stops: RefineStop[]): number[] {
  const out: number[] = [];
  let t = 10 * 60;
  for (let i = 0; i < stops.length; i++) {
    if (i > 0) {
      const km = haversineKm(stops[i - 1], stops[i]);
      const drive = (km / 55) * 60;
      t += drive;
    }
    out.push(t);
    t += stops[i].duration_minutes ?? 60;
  }
  return out;
}

// ─── component ───────────────────────────────────────────────────────────

export function LivingItinerary({
  stops, alternates, caps, onChange, intent, regionKey, regionCenter,
}: Props) {
  const fallback: IntentAtmosphere = intent ?? "relaxed_scenic";
  const [showControls, setShowControls] = useState(false);
  const [swapIdx, setSwapIdx] = useState<Record<string, number>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [revealOpen, setRevealOpen] = useState(false);
  const revealShown = useRef(false);
  const signalCount = useRef(0);
  const sendSignal = useServerFn(recordSignal);

  // Telemetry: surface mounted.
  useEffect(() => {
    void trackBuilderEvent("studio_v2_refine_click", { surface: "living_itinerary" });
  }, []);

  const arrivals = useMemo(() => computeArrivals(stops), [stops]);

  const inUse = useMemo(() => new Set(stops.map((s) => s.key)), [stops]);
  const hasSwapPool = useMemo(
    () => alternates.some((a) => !inUse.has(a.key)),
    [alternates, inUse],
  );

  // Ambient map source — RoutedStopUI-compatible shape from RefineStops.
  const mapStops = useMemo(
    () =>
      stops.map((s) => ({
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
    [stops],
  );
  const computedCenter = useMemo(() => {
    if (regionCenter) return regionCenter;
    if (stops.length === 0) return null;
    return {
      lat: stops.reduce((a, s) => a + s.lat, 0) / stops.length,
      lng: stops.reduce((a, s) => a + s.lng, 0) / stops.length,
    };
  }, [regionCenter, stops]);

  const maybeTriggerReveal = () => {
    if (revealShown.current) return;
    if (signalCount.current < REVEAL_SIGNAL_THRESHOLD) return;
    if (stops.length < 2) return;
    revealShown.current = true;
    void trackBuilderEvent("studio_v2_map_reveal", { signals: signalCount.current, stops: stops.length });
    setRevealOpen(true);
  };

  // ── fire-and-forget signals
  const emitSignal = (signal: GestureSignal) => {
    signalCount.current += 1;
    if (typeof window === "undefined") return;
    const sessionId = getOrCreateAnonId();
    if (!sessionId) return;
    void trackBuilderEvent("studio_v2_predict_signal", { type: signal.type });
    sendSignal({ data: { sessionId, signal } }).catch(() => {
      void trackBuilderEvent("studio_v2_predict_signal_error", { type: signal.type });
    });
    // Defer reveal check to allow the current gesture animation to settle.
    window.setTimeout(maybeTriggerReveal, 320);
  };

  // ── swap (silent substitution)
  const performSwap = (slotKey: string, tag: string | null) => {
    const pool = alternates.filter((a) => !inUse.has(a.key));
    if (pool.length === 0) return;
    const cur = swapIdx[slotKey] ?? -1;
    const next = (cur + 1) % pool.length;
    const replacement = pool[next];
    const updated = stops.map((s) => (s.key === slotKey ? { ...replacement } : s));
    setSwapIdx((m) => ({ ...m, [slotKey]: next }));
    void trackBuilderEvent("studio_v2_refine_swap", { from: slotKey, to: replacement.key, via: "swipe" });
    emitSignal({
      type: "swap",
      fromKey: slotKey,
      toKey: replacement.key,
      toPriorities: prioritiesFromTag(replacement.tag ?? null),
    });
    void tag;
    onChange(updated);
  };

  if (showControls) {
    return (
      <>
        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowControls(false)}
            className="flex min-h-[44px] items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.22em]"
            style={{
              color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))",
              fontWeight: 700,
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to cinematic view
          </button>
        </div>
        <RefineStage stops={stops} alternates={alternates} caps={caps} onChange={onChange} />
      </>
    );
  }

  return (
    <section className="mt-10" aria-label="Your day, scene by scene">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p
          className="text-[10.5px] uppercase tracking-[0.32em]"
          style={{
            color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))",
            fontWeight: 700,
          }}
        >
          The day, scene by scene
        </p>
        <button
          type="button"
          onClick={() => setShowControls(true)}
          className="flex min-h-[44px] items-center gap-1.5 px-2 py-1 text-[10.5px] uppercase tracking-[0.22em]"
          style={{
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
            fontWeight: 600,
          }}
          aria-label="Show all controls"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Controls
        </button>
      </div>

      {/* Ambient sticky map — co-protagonist, not chrome.
          Faint, lightly blurred, sits behind the scenes and breathes with
          the active scene index. No controls. */}
      {computedCenter && stops.length >= 2 && (
        <div
          aria-hidden
          className="sticky -mx-5 sm:-mx-8 mb-4 overflow-hidden"
          style={{
            top: "8vh",
            height: "34vh",
            minHeight: 220,
            maxHeight: 320,
            zIndex: 0,
            opacity: 0.55,
            filter: "blur(1.5px) saturate(0.85)",
            pointerEvents: "none",
          }}
        >
          <Suspense fallback={<div className="absolute inset-0" style={{ background: "var(--sand)" }} />}>
            <BuilderMap
              stops={mapStops}
              regionCenter={computedCenter}
              regionKey={regionKey}
              emotionalMode
              chrome={false}
              activeStopIndex={activeIdx}
            />
          </Suspense>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--ivory) 35%, transparent) 0%, color-mix(in oklab, var(--ivory) 80%, transparent) 100%)",
            }}
          />
        </div>
      )}

      <ol
        className="relative space-y-3"
        style={{ zIndex: 1 }}
        aria-label="Itinerary scenes — swipe a scene left to substitute, long-press to anchor its mood"
      >
        {stops.map((s, i) => {
          const atm = atmosphereFromTag(s.tag, fallback);
          const img = INTENT_IMAGE[atm];
          const arrival = arrivals[i] ?? 10 * 60;
          const priorities = prioritiesFromTag(s.tag);
          const isLast = i === stops.length - 1;

          return (
            <Scene
              key={s.key}
              index={i}
              stop={s}
              imgSrc={img.src}
              imgAlt={img.alt}
              arrivalLabel={`${periodLabel(arrival)} · ${fmtClock(arrival)}`}
              line={atmosphericLine(s.tag)}
              isLast={isLast}
              hasSwapPool={hasSwapPool && stops.length > 2}
              onSwipeLeft={() => performSwap(s.key, s.tag)}
              onLongPress={() => {
                void trackBuilderEvent("studio_v2_refine_click", { gesture: "longpress" });
                emitSignal({ type: "longpress", stopKey: s.key, priorities });
              }}
              onDwell={(ms) => {
                emitSignal({ type: "dwell", stopKey: s.key, ms, priorities });
              }}
              onActive={() => setActiveIdx(i)}
            />
          );
        })}
      </ol>

      <p
        className="mt-6 text-center text-[11.5px] italic"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "color-mix(in oklab, var(--charcoal) 55%, transparent)",
        }}
      >
        swipe a scene left to let the day substitute · long-press to anchor its mood
      </p>

      {/* Engine-triggered map reveal — one shot per session. */}
      <MapReveal
        open={revealOpen}
        stops={mapStops}
        regionCenter={computedCenter}
        regionKey={regionKey}
        onClose={() => setRevealOpen(false)}
      />
    </section>
  );
}

// ─── scene ───────────────────────────────────────────────────────────────

interface SceneProps {
  index: number;
  stop: RefineStop;
  imgSrc: string;
  imgAlt: string;
  arrivalLabel: string;
  line: string;
  isLast: boolean;
  hasSwapPool: boolean;
  onSwipeLeft: () => void;
  onLongPress: () => void;
  onDwell: (ms: number) => void;
  onActive: () => void;
}

function Scene({
  index, stop, imgSrc, imgAlt, arrivalLabel, line,
  isLast, hasSwapPool, onSwipeLeft, onLongPress, onDwell, onActive,
}: SceneProps) {
  const ref = useRef<HTMLLIElement>(null);
  const startX = useRef<number | null>(null);
  const startT = useRef<number>(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef<boolean>(false);
  const dragX = useRef<number>(0);
  const [translate, setTranslate] = useState(0);

  // Dwell tracking + active-scene reporting via IntersectionObserver.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    let enteredAt: number | null = null;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            enteredAt = performance.now();
            onActive();
          } else if (enteredAt != null) {
            const dur = performance.now() - enteredAt;
            enteredAt = null;
            if (dur >= 800) onDwell(dur);
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onDwell, onActive]);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startT.current = performance.now();
    dragX.current = 0;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
      // subtle haptic
      try { (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate?.(8); } catch { /* */ }
    }, 520);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    dragX.current = dx;
    if (Math.abs(dx) > 8 && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (dx < 0 && hasSwapPool) {
      setTranslate(Math.max(dx, -120));
    }
  };

  const finishPointer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const dx = dragX.current;
    startX.current = null;
    setTranslate(0);
    if (longPressFired.current) return;
    // swipe left threshold: ≥ 72px and primarily horizontal.
    if (dx <= -72 && hasSwapPool) {
      onSwipeLeft();
    }
  };

  return (
    <li
      ref={ref}
      className="group relative overflow-hidden rounded-[2px] border touch-pan-y select-none"
      style={{
        borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
        minHeight: 280,
        transform: `translateX(${translate}px)`,
        transition: translate === 0 ? "transform 220ms cubic-bezier(.22,.61,.36,1)" : "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onPointerLeave={finishPointer}
    >
      {/* backdrop */}
      <img
        src={imgSrc}
        alt={imgAlt}
        loading={index < 2 ? "eager" : "lazy"}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ filter: "saturate(0.92) brightness(0.78)" }}
      />
      {/* charcoal scrim for legibility */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--charcoal) 18%, transparent) 0%, color-mix(in oklab, var(--charcoal) 55%, transparent) 100%)",
        }}
      />

      {/* numbered ribbon */}
      <div
        aria-hidden
        className="absolute left-0 top-0 flex h-full w-7 flex-col items-center pt-4"
        style={{ background: "color-mix(in oklab, var(--charcoal) 30%, transparent)" }}
      >
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{
            color: "var(--ivory)",
            fontFamily: "var(--font-display, Montserrat), sans-serif",
          }}
        >
          {index + 1}
        </span>
        {!isLast && (
          <div
            className="mt-2 w-px flex-1"
            style={{ background: "color-mix(in oklab, var(--gold) 60%, transparent)" }}
          />
        )}
      </div>

      {/* content */}
      <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-end px-5 pb-5 pl-12 pt-10 text-[var(--ivory)]">
        <p
          className="text-[10.5px] uppercase tracking-[0.32em]"
          style={{
            color: "color-mix(in oklab, var(--gold) 88%, transparent)",
            fontWeight: 700,
          }}
        >
          {arrivalLabel}
        </p>
        <h3
          className="mt-2 text-[20px] leading-tight"
          style={{
            fontFamily: "var(--font-display, Montserrat), sans-serif",
            fontWeight: 600,
            letterSpacing: "-0.005em",
          }}
        >
          {stop.label}
        </h3>
        <p
          className="mt-2 text-[13px] italic leading-snug"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--ivory) 90%, transparent)",
          }}
        >
          {line}
        </p>
        {stop.source_tour_keys.length > 0 && (
          <p
            className="mt-3 text-[10px] uppercase tracking-[0.28em]"
            style={{
              color: "color-mix(in oklab, var(--ivory) 60%, transparent)",
              fontWeight: 600,
            }}
          >
            from a real YES tour
          </p>
        )}
      </div>

      {/* swipe affordance — only when there is something to substitute */}
      {hasSwapPool && translate < -16 && (
        <div
          aria-hidden
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] uppercase tracking-[0.28em]"
          style={{
            color: "var(--ivory)",
            fontWeight: 700,
          }}
        >
          letting the day substitute…
        </div>
      )}
    </li>
  );
}
