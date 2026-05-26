/**
 * Studio v2 — Refine stage.
 *
 * Lets the traveller edit the bespoke day after the reveal:
 *   - Swap a stop for the next best alternate (cycles through real options).
 *   - Remove a stop.
 *   - Reorder via up/down (mobile-first, no fragile drag libraries).
 *
 * All operations work over REAL stops fetched from `builder_stops`
 * (with `source_tour_keys` preserved). The map and feasibility chip
 * recompute live client-side via haversine.
 */

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { trackBuilderEvent } from "@/lib/builder-analytics";
import { getOrCreateAnonId } from "@/lib/ab-testing";
import { recordSignal } from "@/lib/studio-v2/predictions.functions";
import type { GestureSignal } from "@/lib/studio-v2/predictions";

export interface RefineStop {
  key: string;
  region_key: string;
  label: string;
  blurb: string | null;
  tag: string | null;
  lat: number;
  lng: number;
  duration_minutes: number;
  source_tour_keys: string[];
}

export interface RefineAlternate extends RefineStop {
  score: number;
}

export interface RefineCaps {
  minStops: number;
  maxStops: number;
  maxKmBetweenStops: number;
  maxTotalKmPerDay: number;
  maxDrivingHours: number;
  maxExperienceHours: number;
}

interface Props {
  stops: RefineStop[];
  alternates: RefineAlternate[];
  onChange: (next: RefineStop[]) => void;
  caps?: RefineCaps;
}

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

export function RefineStage({ stops, alternates, onChange, caps }: Props) {
  // Tracks which alternate index we're on per slot (for cycling Swap).
  const [swapIdx, setSwapIdx] = useState<Record<string, number>>({});
  const sendSignal = useServerFn(recordSignal);

  // Fire-and-forget — predictive engine update should never block UX.
  const emitSignal = (signal: GestureSignal) => {
    if (typeof window === "undefined") return;
    const sessionId = getOrCreateAnonId();
    if (!sessionId) return;
    void trackBuilderEvent("studio_v2_predict_signal", { type: signal.type });
    sendSignal({ data: { sessionId, signal } }).catch(() => {
      void trackBuilderEvent("studio_v2_predict_signal_error", { type: signal.type });
    });
  };

  const remove = (key: string) => {
    void trackBuilderEvent("studio_v2_refine_remove", { stopKey: key });
    emitSignal({ type: "remove", stopKey: key });
    onChange(stops.filter((s) => s.key !== key));
  };

  const move = (key: string, dir: -1 | 1) => {
    const i = stops.findIndex((s) => s.key === key);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    const copy = [...stops];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    void trackBuilderEvent("studio_v2_refine_reorder", { stopKey: key, dir });
    emitSignal({ type: "reorder", stopKey: key });
    onChange(copy);
  };

  const swap = (slotKey: string) => {
    // Pool of alternates that are not currently in the itinerary.
    const inUse = new Set(stops.map((s) => s.key));
    const pool = alternates.filter((a) => !inUse.has(a.key));
    if (pool.length === 0) return;
    const cur = swapIdx[slotKey] ?? -1;
    const next = (cur + 1) % pool.length;
    const replacement = pool[next];
    const updated = stops.map((s) => (s.key === slotKey ? { ...replacement } : s));
    setSwapIdx((m) => ({ ...m, [slotKey]: next }));
    void trackBuilderEvent("studio_v2_refine_swap", { from: slotKey, to: replacement.key });
    emitSignal({ type: "swap", fromKey: slotKey, toKey: replacement.key });
    onChange(updated);
  };

  const { metrics, warnings } = useMemo(() => {
    let km = 0;
    let exp = 0;
    let maxLeg = 0;
    for (let i = 0; i < stops.length; i++) {
      exp += stops[i].duration_minutes ?? 60;
      if (i > 0) {
        const leg = haversineKm(stops[i - 1], stops[i]);
        km += leg;
        if (leg > maxLeg) maxLeg = leg;
      }
    }
    const driveMin = Math.round((km / 55) * 60);
    const m = { km: Math.round(km), driveMin, experienceMin: exp, maxLeg: Math.round(maxLeg) };
    const w: string[] = [];
    if (caps) {
      if (stops.length < caps.minStops) w.push(`At least ${caps.minStops} stops recommended.`);
      if (stops.length > caps.maxStops) w.push(`More than ${caps.maxStops} stops will feel rushed.`);
      if (m.km > caps.maxTotalKmPerDay) w.push(`Long day on the road — ${m.km} km exceeds ${caps.maxTotalKmPerDay} km.`);
      if (driveMin > caps.maxDrivingHours * 60) w.push(`Driving exceeds ${caps.maxDrivingHours} h.`);
      if (exp > caps.maxExperienceHours * 60) w.push(`Experience time over ${caps.maxExperienceHours} h.`);
      if (maxLeg > caps.maxKmBetweenStops) w.push(`A leg is ${m.maxLeg} km — over ${caps.maxKmBetweenStops} km cap.`);
    }
    return { metrics: m, warnings: w };
  }, [stops, caps]);

  const inUse = new Set(stops.map((s) => s.key));
  const hasSwapPool = alternates.some((a) => !inUse.has(a.key));

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p
          className="text-[10.5px] uppercase tracking-[0.32em]"
          style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--charcoal))", fontWeight: 700 }}
        >
          Refine your day
        </p>
        <p
          className="text-[11px] italic"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          real stops · live map
        </p>
      </div>

      <ol className="space-y-3" aria-label="Itinerary stops, editable">
        {stops.map((s, i) => (
          <li
            key={s.key}
            className="rounded-[2px] border p-4"
            style={{
              borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
              background: "color-mix(in oklab, var(--ivory) 60%, transparent)",
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums"
                style={{
                  background: "color-mix(in oklab, var(--gold) 22%, transparent)",
                  color: "var(--charcoal)",
                  border: "1px solid color-mix(in oklab, var(--gold) 50%, transparent)",
                }}
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[15px] leading-tight"
                  style={{
                    fontFamily: "var(--font-display, Montserrat), sans-serif",
                    fontWeight: 600,
                    color: "var(--charcoal)",
                  }}
                >
                  {s.label}
                </p>
                {s.blurb && (
                  <p
                    className="mt-1 text-[12.5px] leading-snug"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
                  >
                    {s.blurb}
                  </p>
                )}
                <div
                  className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] uppercase tracking-[0.22em]"
                  style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)", fontWeight: 600 }}
                >
                  <span>{Math.round((s.duration_minutes ?? 60) / 5) * 5} min on site</span>
                  {s.tag && <span>· {s.tag}</span>}
                  {s.source_tour_keys.length > 0 && (
                    <span title={s.source_tour_keys.join(", ")}>· from real tour</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-1">
              <IconBtn
                label="Move up"
                disabled={i === 0}
                onClick={() => move(s.key, -1)}
                icon={<ArrowUp className="h-3.5 w-3.5" />}
              />
              <IconBtn
                label="Move down"
                disabled={i === stops.length - 1}
                onClick={() => move(s.key, 1)}
                icon={<ArrowDown className="h-3.5 w-3.5" />}
              />
              <IconBtn
                label="Swap for alternate"
                disabled={!hasSwapPool}
                onClick={() => swap(s.key)}
                icon={<RefreshCw className="h-3.5 w-3.5" />}
              />
              <IconBtn
                label="Remove stop"
                disabled={stops.length <= 2}
                onClick={() => remove(s.key)}
                icon={<X className="h-3.5 w-3.5" />}
              />
            </div>
          </li>
        ))}
      </ol>

      {/* Live metrics chip — recomputed from edits */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        <span
          className="text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "color-mix(in oklab, var(--gold) 82%, var(--charcoal))", fontWeight: 700 }}
        >
          {stops.length} stops · {Math.round((metrics.experienceMin / 60) * 10) / 10} h experience · {metrics.driveMin} min driving · {metrics.km} km
        </span>
      </div>

      {warnings.length > 0 && (
        <ul
          className="mt-3 space-y-1.5 rounded-[2px] border px-4 py-3"
          aria-label="Feasibility warnings"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 50%, transparent)",
            background: "color-mix(in oklab, var(--gold) 8%, transparent)",
          }}
        >
          {warnings.map((w) => (
            <li
              key={w}
              className="text-[12px] leading-snug"
              style={{ color: "color-mix(in oklab, var(--charcoal) 80%, transparent)" }}
            >
              · {w}
            </li>
          ))}
        </ul>
      )}

      {!hasSwapPool && (
        <p
          className="mt-3 text-center text-[11.5px] italic"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          No more alternates in this region — every real stop is already on your day.
        </p>
      )}

      {stops.length < 2 && (
        <p
          className="mt-3 text-center text-[12px] italic"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "color-mix(in oklab, var(--charcoal) 65%, transparent)",
          }}
        >
          A day needs at least two stops. Add one back with Swap.
        </p>
      )}
    </section>
  );
}

function IconBtn({
  label, onClick, icon, disabled,
}: { label: string; onClick: () => void; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-11 w-11 place-items-center rounded-[2px] transition disabled:opacity-30 hover:bg-[color:var(--sand)] focus-visible:outline-none focus-visible:ring-2"
      style={{ color: "var(--charcoal)" }}
    >
      {icon}
    </button>
  );
}
