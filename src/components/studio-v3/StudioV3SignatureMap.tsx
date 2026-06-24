// Studio V3 — Signature Map.
//
// Two rendering modes:
//
//  • Geographic mode — when `stopsDetailed` carries real lat/lng for at
//    least one stop AND `originCoord` is provided, we project the actual
//    locations into the viewBox via a padded bounding-box. Drive minutes
//    between consecutive points are computed from haversine and rendered
//    as small chips at each leg's midpoint. Dwell minutes are rendered as
//    a chip below each pin. The route polyline progressively draws
//    SEGMENT BY SEGMENT as `activeCount` increases — every new chosen
//    moment visibly extends the route.
//
//  • Schematic mode — when no coords are available, we fall back to the
//    original soft-S curve so the map never breaks for partial data.
//
// We intentionally never claim geographic accuracy in schematic mode and
// never invent coordinates in geographic mode. Coordinates flow in from
// `resolveStudioV3Route → routePoints` (the curated real stops).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  haversineDriveMinutes,
  inferKind,
  stopDurationMinutes,
} from "@/lib/studio/timing";
import type { StopKind } from "@/data/regionStops";
import { PortugalSilhouette, type SilhouetteRegion } from "./PortugalSilhouette";
import { MountBadge } from "./useStudioDebug";

export interface StudioV3SignatureMapDetailedStop {
  label: string;
  lat?: number | null;
  lng?: number | null;
  dwellMin?: number | null;
  kind?: StopKind | null;
}

export interface StudioV3SignatureMapProps {
  /** Real stop labels (1..6). First pin is the route start. */
  stops: ReadonlyArray<string>;
  /** Optional geo-detailed stops (parallel to `stops`, same order). */
  stopsDetailed?: ReadonlyArray<StudioV3SignatureMapDetailedStop>;
  /** Optional pickup coords — enables geographic projection from origin. */
  originCoord?: { lat: number; lng: number } | null;
  /** Optional pickup city label rendered on the bottom strip. */
  originLabel?: string | null;
  /** How many pins/route segments to reveal. Defaults to stops.length. */
  activeCount?: number;
  /** Optional pace label rendered on the bottom-right strip. */
  paceLabel?: string | null;
  /** Optional aspect ratio. Defaults to "16 / 11" (matches homepage). */
  aspectRatio?: string;
  /** Optional className for sizing/border overrides. */
  className?: string;
  /** Accessibility label for the whole map artefact. */
  ariaLabel?: string;
  /**
   * Optional real driving minutes per leg (origin → stop[0], stop[0] →
   * stop[1], …). Length = `stops.length`. When provided, replaces the
   * haversine fallback for chips, accessibility labels and debug data.
   */
  legMinutes?: ReadonlyArray<number> | null;
  /** Optional inferred Portugal region — renders a faint silhouette anchor behind the map. */
  silhouetteRegion?: SilhouetteRegion;
}

const VB_W = 200;
const VB_H = 260;
const SCHEMATIC_ORIGIN = { x: 40, y: 44 };
// Margins for geographic projection.
const GEO_X_MIN = 28;
const GEO_X_MAX = 188;
const GEO_Y_MIN = 36;
const GEO_Y_MAX = 230;

/** Stable label → small offset in [-10, 10] so adjacent runs don't look identical. */
function labelJitter(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) h = (h * 31 + label.charCodeAt(i)) | 0;
  return (((h % 21) + 21) % 21) - 10;
}

/** Trim "Stop —" / parenthetical region suffix etc. so labels read clean. */
function cleanLabel(raw: string): string {
  return raw.split(/[—–-]/)[0].split(",")[0].trim();
}

/** Schematic S-curve waypoints — used when no real coords are available. */
const MIN_SEP = 22;
function schematicWaypoints(labels: ReadonlyArray<string>): { x: number; y: number }[] {
  const n = labels.length;
  if (n === 0) return [];
  const xMin = 70,
    xMax = 178;
  const yMin = 88,
    yMax = 232;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const sy = t + Math.sin(t * Math.PI) * 0.08;
    const baseX = xMin + (xMax - xMin) * t;
    const baseY = yMin + (yMax - yMin) * Math.max(0, Math.min(1, sy));
    const j = labelJitter(labels[i]);
    out.push({
      x: Math.max(60, Math.min(186, baseX + j * 0.4)),
      y: Math.max(80, Math.min(236, baseY + (j % 5) * 0.6)),
    });
  }
  for (let i = 1; i < out.length; i += 1) {
    const a = out[i - 1];
    const b = out[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < MIN_SEP) {
      const push = MIN_SEP - dist + 1;
      const nx = dx === 0 ? 1 : dx / dist;
      const ny = dy === 0 ? 1 : dy / dist;
      out[i] = {
        x: Math.max(60, Math.min(186, b.x + nx * push)),
        y: Math.max(80, Math.min(236, b.y + ny * push)),
      };
    }
  }
  return out;
}

/** Quadratic curve between two points, arching slightly upward. */
function segmentPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const cx = (a.x + b.x) / 2;
  const cy = Math.min(a.y, b.y) - 10;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

/** Approximate length of a quadratic arc (1.10× chord — close enough for stroke-dash). */
function approxArcLen(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y) * 1.1;
}

interface GeoProjection {
  origin: { x: number; y: number };
  points: { x: number; y: number }[];
}

/** Project lat/lng into a padded viewBox so origin + all stops fit comfortably. */
function projectGeo(
  origin: { lat: number; lng: number },
  stops: ReadonlyArray<{ lat: number; lng: number }>,
): GeoProjection {
  const all = [origin, ...stops];
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  // Pad bbox 18% so pins aren't pressed against the frame.
  const padLat = Math.max(0.02, (maxLat - minLat) * 0.18);
  const padLng = Math.max(0.02, (maxLng - minLng) * 0.18);
  minLat -= padLat;
  maxLat += padLat;
  minLng -= padLng;
  maxLng += padLng;
  // Preserve aspect — equalize lat/lng span so the route doesn't look squashed.
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  // Lng degrees are shorter near 40°N — multiply by cos(latMid).
  const latMid = (minLat + maxLat) / 2;
  const lngScale = Math.cos((latMid * Math.PI) / 180);
  const lngSpanScaled = lngSpan * lngScale;
  const xRange = GEO_X_MAX - GEO_X_MIN;
  const yRange = GEO_Y_MAX - GEO_Y_MIN;
  const xPerUnit = xRange / Math.max(0.0001, lngSpanScaled);
  const yPerUnit = yRange / Math.max(0.0001, latSpan);
  const unit = Math.min(xPerUnit, yPerUnit);
  // Center the route inside the viewBox.
  const projWidth = lngSpanScaled * unit;
  const projHeight = latSpan * unit;
  const xOffset = GEO_X_MIN + (xRange - projWidth) / 2;
  const yOffset = GEO_Y_MIN + (yRange - projHeight) / 2;
  const project = (p: { lat: number; lng: number }) => ({
    x: xOffset + (p.lng - minLng) * lngScale * unit,
    y: yOffset + (maxLat - p.lat) * unit, // flip Y so north is up
  });
  return { origin: project(origin), points: stops.map(project) };
}

function formatChipMin(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function StudioV3SignatureMap({
  stops,
  stopsDetailed,
  originCoord,
  originLabel,
  activeCount,
  paceLabel,
  aspectRatio = "16 / 11",
  className,
  ariaLabel,
  legMinutes,
  silhouetteRegion = null,
}: StudioV3SignatureMapProps) {
  const cleaned = useMemo(() => stops.map(cleanLabel).filter(Boolean), [stops]);
  const visible = Math.max(0, Math.min(cleaned.length, activeCount ?? cleaned.length));
  const shown = cleaned.slice(0, visible);

  // Geographic projection if we have coords for ALL visible stops + origin.
  const detailed = stopsDetailed ?? [];
  const allHaveCoords =
    !!originCoord &&
    shown.length > 0 &&
    shown.every((_, i) => {
      const d = detailed[i];
      return d && typeof d.lat === "number" && typeof d.lng === "number";
    });

  const geo = useMemo(() => {
    if (!allHaveCoords || !originCoord) return null;
    const pts = shown.map((_, i) => ({
      lat: detailed[i]!.lat as number,
      lng: detailed[i]!.lng as number,
    }));
    return projectGeo(originCoord, pts);
  }, [allHaveCoords, originCoord, shown, detailed]);

  // Origin-only geographic projection — used during the Pickup beat or any
  // time we have an origin coordinate but no revealed stops yet. Without this
  // the origin pulse defaults to SCHEMATIC_ORIGIN in the top-left corner and
  // the map reads as "empty" to the traveller. Center the origin instead so
  // the city is the visible anchor of the frame.
  const originOnly = useMemo(() => {
    if (geo || !originCoord || shown.length > 0) return null;
    return { x: (GEO_X_MIN + GEO_X_MAX) / 2, y: (GEO_Y_MIN + GEO_Y_MAX) / 2 };
  }, [geo, originCoord, shown.length]);

  // Resolve waypoints + origin in viewBox coords.
  const origin = geo ? geo.origin : originOnly ?? SCHEMATIC_ORIGIN;
  const waypoints = useMemo(() => {
    if (geo) return geo.points;
    return schematicWaypoints(shown);
  }, [geo, shown]);

  // Build segments: origin → p0 → p1 → ... per visible point.
  const segments = useMemo(() => {
    const segs: Array<{ d: string; len: number; mid: { x: number; y: number } }> = [];
    let prev = origin;
    for (let i = 0; i < waypoints.length; i++) {
      const p = waypoints[i];
      segs.push({
        d: segmentPath(prev, p),
        len: approxArcLen(prev, p),
        mid: { x: (prev.x + p.x) / 2, y: Math.min(prev.y, p.y) - 6 },
      });
      prev = p;
    }
    return segs;
  }, [origin, waypoints]);

  // Track which segments / pins have ALREADY been revealed (so they don't
  // re-animate on every render — only the newest one draws).
  const [revealedCount, setRevealedCount] = useState(0);
  const revealedRef = useRef(0);
  // Selection: which pin is "active" for keyboard/touch — drives the
  // pressed state on the pin button and highlights its drive-in + dwell chips.
  const [selectedPin, setSelectedPin] = useState<number | null>(null);
  useEffect(() => {
    // Clear selection when the route shape changes or the pin is no longer revealed.
    setSelectedPin((cur) => (cur != null && cur < revealedCount ? cur : null));
  }, [revealedCount]);
  useEffect(() => {
    if (waypoints.length === 0) {
      revealedRef.current = 0;
      setRevealedCount(0);
      return;
    }
    // Animate forward up to `visible`, never backwards (preserve previously drawn).
    const target = visible;
    if (target <= revealedRef.current) {
      revealedRef.current = target;
      setRevealedCount(target);
      return;
    }
    // Stagger one segment at a time so each NEW moment visibly draws in.
    let cancelled = false;
    let i = revealedRef.current;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      revealedRef.current = i;
      setRevealedCount(i);
      if (i < target) window.setTimeout(tick, 460);
    };
    const t = window.setTimeout(tick, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [visible, waypoints.length]);

  if (cleaned.length === 0) return null;

  const a11y =
    ariaLabel ??
    (originLabel
      ? `Forming route from ${originLabel} with ${shown.length} stop${shown.length === 1 ? "" : "s"}.`
      : `Forming route with ${shown.length} stop${shown.length === 1 ? "" : "s"}.`);

  // Precompute per-pin meta (drive-in minutes from previous + dwell minutes)
  // — used by the accessible button overlay, the SR-only ordered route
  // summary, and the chip pressed state. Geographic mode only for drive
  // minutes; schematic mode still surfaces dwell where known.
  const pinMeta = useMemo(() => {
    return shown.map((label, i) => {
      const d = detailed[i];
      const dwell =
        d && typeof d.dwellMin === "number" && d.dwellMin > 0
          ? d.dwellMin
          : stopDurationMinutes({
              label,
              kind: (d?.kind ?? inferKind(label)) || undefined,
            });
      let driveInMin: number | null = null;
      if (geo && originCoord) {
        // Prefer real OSRM-backed minutes when caller has supplied them.
        const real = legMinutes && typeof legMinutes[i] === "number" ? legMinutes[i] : null;
        if (real != null && real > 0) {
          driveInMin = real;
        } else {
          const from =
            i === 0
              ? originCoord
              : {
                  lat: detailed[i - 1]!.lat as number,
                  lng: detailed[i - 1]!.lng as number,
                };
          const to = { lat: detailed[i]!.lat as number, lng: detailed[i]!.lng as number };
          driveInMin = haversineDriveMinutes(from, to);
        }
      }
      return { label, dwell: dwell || null, driveInMin };
    });
  }, [shown, detailed, geo, originCoord, legMinutes]);

  // Aggregated journey totals — drive minutes + on-road km — so the legend
  // chip can quietly answer "how far is this really?" before the traveller
  // asks. Geographic mode only; quietly hidden when we have no segments
  // yet (Pickup beat) or no real coordinates.
  const journeyTotals = useMemo(() => {
    if (!geo || !originCoord || revealedCount < 1) return null;
    let km = 0;
    let min = 0;
    let prev = originCoord;
    for (let i = 0; i < revealedCount; i++) {
      const d = detailed[i];
      if (!d || typeof d.lat !== "number" || typeof d.lng !== "number") continue;
      const to = { lat: d.lat as number, lng: d.lng as number };
      // Haversine km × 1.12 = ~real road distance (matches drive-min model).
      const R = 6371;
      const toRad = (x: number) => (x * Math.PI) / 180;
      const dLat = toRad(to.lat - prev.lat);
      const dLng = toRad(to.lng - prev.lng);
      const lat1 = toRad(prev.lat);
      const lat2 = toRad(to.lat);
      const h =
        Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      const segKm = 2 * R * Math.asin(Math.sqrt(h)) * 1.12;
      km += segKm;
      const realMin = legMinutes && typeof legMinutes[i] === "number" ? legMinutes[i] : null;
      min += realMin != null && realMin > 0 ? realMin : haversineDriveMinutes(prev, to);
      prev = to;
    }
    if (min <= 0 || km <= 0) return null;
    const kmRounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
    const minLabel =
      min < 60 ? `~${min} min` : `~${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`;
    return { minLabel, kmLabel: `${kmRounded} km`, min, km: kmRounded };
  }, [geo, originCoord, revealedCount, detailed, legMinutes]);


  const handlePinKey = (e: React.KeyboardEvent, i: number) => {
    const last = waypoints.length - 1;
    if (last < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedPin(Math.min(last, Math.min(revealedCount - 1, i + 1)));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedPin(Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedPin(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedPin(Math.min(last, revealedCount - 1));
    } else if (e.key === "Escape") {
      setSelectedPin(null);
    }
  };

  return (
    <>
      <MountBadge
        name="StudioV3SignatureMap"
        detail={`mode=${geo ? "geographic" : "schematic"} · stops=${stops.length}${silhouetteRegion ? ` · silhouette=${silhouetteRegion}` : ""}`}
      />
    <div
      role="img"
      aria-label={a11y}
      className={`relative overflow-hidden ${className ?? ""}`}
      data-map-mode={geo ? "geographic" : "schematic"}
      style={{
        aspectRatio,
        background: "var(--charcoal-deep, #14181a)",
        borderRadius: "6px",
        border: "1px solid color-mix(in oklab, var(--gold) 28%, transparent)",
        boxShadow:
          "0 28px 70px -34px rgba(0,0,0,0.75), 0 0 60px -22px color-mix(in oklab, var(--gold) 18%, transparent) inset",
      }}
    >
      {/* Portugal anchor — faint silhouette behind the wash so travellers
          always know WHERE in the country the journey lives. Pointer-none,
          decorative only. */}
      {silhouetteRegion ? (
        <div className="pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-screen">
          <PortugalSilhouette fill={1} region={silhouetteRegion} />
        </div>
      ) : null}

      {/* Radial wash — gold top-left, teal bottom-right. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 28% 18%, rgba(201,169,106,0.10) 0%, transparent 55%), radial-gradient(110% 80% at 72% 82%, rgba(41,91,97,0.50) 0%, transparent 60%)",
        }}
      />


      {/* Hairline gold grid. */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-[0.16]"
        preserveAspectRatio="none"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
      >
        <defs>
          <pattern id="sv3sm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--gold)" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width={VB_W} height={VB_H} fill="url(#sv3sm-grid)" />
      </svg>

      {/* Coastal silhouette — only meaningful in schematic mode. */}
      {!geo ? (
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M 0 70 C 30 78, 60 96, 90 120 S 130 168, 160 190 S 188 220, 200 232 L 200 260 L 0 260 Z"
            fill="rgba(41,91,97,0.22)"
            stroke="rgba(201,169,106,0.18)"
            strokeWidth="0.6"
          />
          <path
            d="M 0 60 C 28 70, 56 88, 86 112 S 126 158, 156 178 S 188 208, 200 220"
            fill="none"
            stroke="rgba(201,169,106,0.20)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />
        </svg>
      ) : null}

      {/* Corner ticks (editorial signature). */}
      <span
        aria-hidden
        className="absolute left-1/2 top-3 h-px w-8 -translate-x-1/2"
        style={{ background: "color-mix(in oklab, var(--gold) 80%, transparent)" }}
      />
      {[
        "top-2 left-2 border-l border-t",
        "top-2 right-2 border-r border-t",
        "bottom-2 left-2 border-l border-b",
        "bottom-2 right-2 border-r border-b",
      ].map((cls) => (
        <span
          key={cls}
          aria-hidden
          className={`absolute ${cls} h-2.5 w-2.5`}
          style={{ borderColor: "color-mix(in oklab, var(--gold) 38%, transparent)" }}
        />
      ))}

      {/* Journey legend — total drive time + km. Honest, quiet, always
          visible once a route exists so travellers know the distance
          before the reveal. Hidden during Pickup-only beat.

          The `data-leg-legend-value` attribute is the SINGLE source of
          truth for the visible chip text — both the attribute and the
          rendered children are derived from `legendText`, so E2E can
          assert `attr === visibleText` at any viewport / segment count. */}
      {journeyTotals ? (() => {
        const legendText = `${journeyTotals.minLabel} · ${journeyTotals.kmLabel}`;
        const accessibleLabel = `Approximate total journey: ${journeyTotals.minLabel.replace("~", "").trim()} driving, ${journeyTotals.kmLabel}.`;
        return (
          <div
            className="absolute left-1/2 top-2.5 z-10 -translate-x-1/2 pointer-events-none"
            data-testid="studio-v3-map-legend"
            data-journey-min={journeyTotals.min}
            data-journey-km={journeyTotals.km}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={accessibleLabel}
            style={{ animation: "studioV3RiseIn 520ms ease-out 180ms both" }}
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap"
              data-leg-legend="journey"
              data-legend-value={legendText}
              data-leg-legend-value={legendText}
              role="group"
              aria-label={accessibleLabel}
              style={{
                background: "color-mix(in oklab, #050d0f 78%, transparent)",
                border: "1px solid color-mix(in oklab, var(--gold) 38%, transparent)",
                color: "color-mix(in oklab, var(--ivory) 92%, transparent)",
                boxShadow: "0 6px 20px -10px rgba(0,0,0,0.55)",
              }}
            >
              <span aria-hidden="true" style={{ color: "var(--gold)" }}>{journeyTotals.minLabel}</span>
              <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
              <span aria-hidden="true">{journeyTotals.kmLabel}</span>
            </span>
            <span className="sr-only">{accessibleLabel}</span>
          </div>
        );
      })() : null}




      {/* Route + pins. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="sv3sm-route" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--teal-2, var(--teal))" stopOpacity="0.95" />
            <stop offset="60%" stopColor="var(--gold)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.7" />
          </linearGradient>
          <filter id="sv3sm-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.7" />
          </filter>
        </defs>

        {/* Origin halo + dot. */}
        <g>
          <circle
            cx={origin.x}
            cy={origin.y}
            r="7"
            fill="none"
            stroke="var(--gold)"
            strokeOpacity="0.5"
            strokeWidth="0.55"
            style={{
              animation: "sv3smPulse 2200ms ease-out 200ms infinite",
              transformOrigin: `${origin.x}px ${origin.y}px`,
              transformBox: "fill-box",
            }}
          />
          <circle cx={origin.x} cy={origin.y} r="3.6" fill="var(--charcoal-deep, #14181a)" />
          <circle cx={origin.x} cy={origin.y} r="2.6" fill="var(--teal-2, var(--teal))" />
          {originLabel && originOnly ? (
            <text
              x={origin.x}
              y={origin.y - 11}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "7px",
                letterSpacing: "0.18em",
                fill: "var(--gold)",
                textTransform: "uppercase",
              }}
            >
              {cleanLabel(originLabel)}
            </text>
          ) : null}
        </g>


        {/* Per-segment progressive draw — each leg animates ONLY when it
            becomes the newest revealed segment. Earlier legs stay solid. */}
        {segments.map((seg, i) => {
          const drawn = i < revealedCount;
          return (
            <g key={`seg-${i}`}>
              <path
                d={seg.d}
                fill="none"
                stroke="url(#sv3sm-route)"
                strokeOpacity="0.45"
                strokeWidth="3.6"
                strokeLinecap="round"
                filter="url(#sv3sm-soft)"
                strokeDasharray={seg.len}
                strokeDashoffset={drawn ? 0 : seg.len}
                style={{
                  transition:
                    "stroke-dashoffset 1100ms cubic-bezier(0.22, 0.61, 0.36, 1)",
                }}
              />
              <path
                d={seg.d}
                fill="none"
                stroke="url(#sv3sm-route)"
                strokeOpacity="1"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeDasharray={seg.len}
                strokeDashoffset={drawn ? 0 : seg.len}
                style={{
                  transition:
                    "stroke-dashoffset 1100ms cubic-bezier(0.22, 0.61, 0.36, 1)",
                }}
              />
            </g>
          );
        })}

        {waypoints.map((p, i) => {
          const isLast = i === waypoints.length - 1;
          const arrived = i < revealedCount;
          return (
            <g
              key={i}
              style={{
                opacity: arrived ? 1 : 0,
                transform: arrived ? "scale(1)" : "scale(0.35)",
                transition: `opacity 420ms ease, transform 620ms cubic-bezier(0.22, 1.4, 0.36, 1)`,
                transformBox: "fill-box",
                transformOrigin: `${p.x}px ${p.y}px`,
              }}
            >
              {isLast && arrived ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill="none"
                  stroke="var(--gold)"
                  strokeOpacity="0.9"
                  strokeWidth="0.9"
                  style={{
                    animation: "sv3smArrive 1400ms ease-out 120ms both",
                    transformOrigin: `${p.x}px ${p.y}px`,
                    transformBox: "fill-box",
                  }}
                />
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r="8"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="1.1"
                strokeOpacity="0.55"
              />
              {selectedPin === i && arrived ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="10.5"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="1.3"
                  strokeOpacity="1"
                />
              ) : null}
              {isLast ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill="var(--gold)"
                  opacity="0.18"
                  style={{
                    animation: "sv3smPulse 2200ms ease-out 700ms infinite",
                    transformOrigin: `${p.x}px ${p.y}px`,
                    transformBox: "fill-box",
                  }}
                />
              ) : null}
              <circle cx={p.x} cy={p.y} r="5.2" fill="var(--charcoal-deep, #14181a)" />
              <circle cx={p.x} cy={p.y} r="4.4" fill="var(--gold)" />
              <text
                x={p.x}
                y={p.y + 1.6}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "5px",
                  fill: "var(--charcoal-deep, #14181a)",
                }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Accessible interactive overlay — invisible 44×44 buttons sit on
          each arrived pin. Keyboard arrows move selection; Escape clears.
          Pressed state mirrors `selectedPin` and is announced via
          aria-pressed. The map itself stays decorative SVG. */}
      <div
        role="toolbar"
        aria-label={
          originLabel
            ? `Route stops from ${originLabel}. Use arrow keys to step through.`
            : "Route stops. Use arrow keys to step through."
        }
        className="pointer-events-none absolute inset-0"
      >
        {waypoints.map((p, i) => {
          if (i >= revealedCount) return null;
          const xPct = (p.x / VB_W) * 100;
          const yPct = (p.y / VB_H) * 100;
          const meta = pinMeta[i];
          const isSel = selectedPin === i;
          const parts: string[] = [`Stop ${i + 1}: ${shown[i]}`];
          if (meta?.driveInMin && meta.driveInMin >= 4) {
            parts.push(`about ${formatChipMin(meta.driveInMin)} drive from previous`);
          }
          if (meta?.dwell) parts.push(`${formatChipMin(meta.dwell)} on site`);
          return (
            <button
              key={`pin-btn-${i}`}
              type="button"
              aria-label={parts.join(", ")}
              aria-pressed={isSel}
              onClick={() => setSelectedPin(isSel ? null : i)}
              onKeyDown={(e) => handlePinKey(e, i)}
              className="pointer-events-auto absolute rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--charcoal-deep,#14181a)] active:scale-95 transition-transform"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                transform: "translate(-50%, -50%)",
                width: 44,
                height: 44,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            />
          );
        })}
      </div>

      {/* SR-only ordered route summary — gives screen readers and
          keyboard users a structured, decluttered alternative to the
          visual map. Always reflects current revealed state. */}
      <ol
        className="sr-only"
        aria-label={
          originLabel
            ? `Route summary from ${originLabel}`
            : "Route summary"
        }
      >
        {pinMeta.slice(0, revealedCount).map((m, i) => {
          const parts: string[] = [];
          if (m.driveInMin && m.driveInMin >= 4) {
            parts.push(`~${formatChipMin(m.driveInMin)} drive`);
          }
          parts.push(m.label);
          if (m.dwell) parts.push(`${formatChipMin(m.dwell)} on site`);
          return (
            <li key={`sr-${i}`} aria-current={selectedPin === i ? "true" : undefined}>
              {`Stop ${i + 1}: ${parts.join(" — ")}`}
            </li>
          );
        })}
      </ol>


      {/* Drive-minute chips at each segment midpoint — geographic mode only,
          and only for segments that have already been drawn. */}
      {geo
        ? segments.map((seg, i) => {
            const drawn = i < revealedCount;
            if (!drawn) return null;
            const real = legMinutes && typeof legMinutes[i] === "number" ? legMinutes[i] : null;
            let min: number;
            if (real != null && real > 0) {
              min = real;
            } else {
              const a = i === 0 ? originCoord! : {
                lat: detailed[i - 1]!.lat as number,
                lng: detailed[i - 1]!.lng as number,
              };
              const b = {
                lat: detailed[i]!.lat as number,
                lng: detailed[i]!.lng as number,
              };
              min = haversineDriveMinutes(a, b);
            }
            if (min < 4) return null; // suppress tiny chips
            const xPct = (seg.mid.x / VB_W) * 100;
            const yPct = (seg.mid.y / VB_H) * 100;
            const isSel = selectedPin === i;
            return (
              <span
                key={`drive-${i}`}
                aria-hidden
                data-selected={isSel || undefined}
                className="pointer-events-none absolute text-[9px] font-semibold tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: "translate(-50%, -120%)",
                  background: isSel
                    ? "color-mix(in oklab, var(--gold) 92%, white)"
                    : "color-mix(in oklab, #050d0f 80%, transparent)",
                  color: isSel
                    ? "var(--charcoal)"
                    : "color-mix(in oklab, var(--ivory) 92%, transparent)",
                  border: `1px solid color-mix(in oklab, var(--gold) ${isSel ? 90 : 40}%, transparent)`,
                  whiteSpace: "nowrap",
                  opacity: isSel ? 1 : 0.95,
                  animation: "studioV3RiseIn 480ms ease-out both",
                  boxShadow: isSel ? "0 4px 14px -4px rgba(0,0,0,0.55)" : undefined,
                }}
              >
                ≈ {formatChipMin(min)} drive
              </span>
            );
          })
        : null}

      {/* Dwell-minute chips next to each arrived pin. Hidden on very small
          widths if the in-map label is shown — kept above the bottom strip. */}
      {waypoints.map((p, i) => {
        if (i >= revealedCount) return null;
        const d = detailed[i];
        const dwell =
          d && typeof d.dwellMin === "number" && d.dwellMin > 0
            ? d.dwellMin
            : stopDurationMinutes({
                label: shown[i],
                kind: (d?.kind ?? inferKind(shown[i])) || undefined,
              });
        if (!dwell) return null;
        const xPct = (p.x / VB_W) * 100;
        const yPct = (p.y / VB_H) * 100;
        const isSel = selectedPin === i;
        return (
          <span
            key={`dwell-${i}`}
            aria-hidden
            data-selected={isSel || undefined}
            className="pointer-events-none absolute text-[9px] font-semibold tracking-[0.14em] px-1.5 py-0.5 rounded-sm"
            style={{
              left: `${xPct}%`,
              top: `${yPct}%`,
              transform: "translate(-50%, 140%)",
              background: isSel
                ? "var(--gold)"
                : "color-mix(in oklab, var(--gold) 88%, white)",
              color: "var(--charcoal)",
              whiteSpace: "nowrap",
              boxShadow: isSel
                ? "0 6px 16px -4px rgba(0,0,0,0.65), 0 0 0 1.5px var(--gold)"
                : "0 4px 12px -6px rgba(0,0,0,0.55)",
              opacity: isSel ? 1 : 0.96,
              animation: "studioV3RiseIn 520ms ease-out both",
            }}
          >
            {formatChipMin(dwell)}
          </span>
        );
      })}

      {/* Newest pin's full name floats on the map (sm+ only). */}
      {waypoints.length > 0 && revealedCount > 0
        ? (() => {
            const i = Math.min(revealedCount, waypoints.length) - 1;
            const p = waypoints[i];
            const xPct = (p.x / VB_W) * 100;
            const yPct = (p.y / VB_H) * 100;
            const flipLeft = xPct > 55;
            return (
              <div
                aria-hidden
                className="pointer-events-none absolute hidden sm:block"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  maxWidth: "46%",
                  transform: flipLeft
                    ? "translate(calc(-100% - 12px), -50%)"
                    : "translate(12px, -50%)",
                  textAlign: flipLeft ? "right" : "left",
                  animation: "studioV3RiseIn 520ms ease-out both",
                }}
              >
                <span className="block text-[10px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]">
                  {shown[i]}
                </span>
              </div>
            );
          })()
        : null}

      {/* Bottom strip — From X · pace/stops. (sm+ only to avoid clutter on phones.) */}
      <div
        className="absolute left-0 right-0 bottom-0 hidden sm:flex items-end justify-between gap-3 px-3.5 py-2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklab, #050d0f 88%, transparent) 100%)",
        }}
      >
        {originLabel ? (
          <span
            className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.26em] font-semibold truncate"
            style={{ color: "color-mix(in oklab, var(--gold) 90%, var(--ivory))" }}
          >
            <span
              aria-hidden
              className="inline-block h-1 w-1 rounded-full"
              style={{ background: "var(--gold)" }}
            />
            From {originLabel}
          </span>
        ) : (
          <span />
        )}
        {paceLabel ? (
          <span
            className="text-[9.5px] uppercase tracking-[0.26em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--ivory) 82%, transparent)" }}
          >
            Pace · {paceLabel}
          </span>
        ) : shown.length > 0 ? (
          <span
            className="text-[9.5px] uppercase tracking-[0.26em] font-semibold"
            style={{ color: "color-mix(in oklab, var(--ivory) 75%, transparent)" }}
          >
            {shown.length} stop{shown.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <MapDebugOverlay
        mode={geo ? "geographic" : "schematic"}
        originCoord={originCoord ?? null}
        originLabel={originLabel ?? null}
        shown={shown}
        detailed={detailed}
        waypoints={waypoints}
        segments={segments.map((s, i) => {
          if (!geo || !originCoord) {
            return { index: i, driveMin: null, from: null, to: null };
          }
          const a = i === 0
            ? originCoord
            : { lat: detailed[i - 1]!.lat as number, lng: detailed[i - 1]!.lng as number };
          const b = { lat: detailed[i]!.lat as number, lng: detailed[i]!.lng as number };
          const real = legMinutes && typeof legMinutes[i] === "number" ? legMinutes[i] : null;
          const driveMin = real != null && real > 0 ? real : haversineDriveMinutes(a, b);
          return { index: i, driveMin, from: a, to: b };
        })}
        revealedCount={revealedCount}
        visible={visible}
      />

      <style>{`
        @keyframes sv3smPulse {
          0% { opacity: 0; transform: scale(0.6); }
          40% { opacity: 0.7; }
          100% { opacity: 0; transform: scale(1.8); }
        }
        @keyframes sv3smArrive {
          0% { opacity: 0; transform: scale(0.3); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: scale(3.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="sv3smPulse"], [style*="sv3smArrive"] { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Debug overlay — opt-in via ?debug=studio / Shift+D / localStorage.
// Surfaces pin coordinates, segment order, and drive/dwell source data so
// the geographic map can be validated against curated stop data on the
// live preview without opening devtools.
// ---------------------------------------------------------------------------

const DEBUG_STORAGE_KEY = "studio-v3-debug";

function useStudioDebugEnabled(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        if (typeof window === "undefined") return false;
        const q = new URL(window.location.href).searchParams.get("debug");
        if (q === "studio" || q === "1" || q === "on") return true;
        if (q === "off" || q === "0") return false;
        if (window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1") return true;
      } catch {
        /* noop */
      }
      return false;
    };
    setOn(read());
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        setTimeout(() => setOn(read()), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return on;
}

interface MapDebugOverlayProps {
  mode: "geographic" | "schematic";
  originCoord: { lat: number; lng: number } | null;
  originLabel: string | null;
  shown: ReadonlyArray<string>;
  detailed: ReadonlyArray<StudioV3SignatureMapDetailedStop>;
  waypoints: ReadonlyArray<{ x: number; y: number }>;
  segments: ReadonlyArray<{
    index: number;
    driveMin: number | null;
    from: { lat: number; lng: number } | null;
    to: { lat: number; lng: number } | null;
  }>;
  revealedCount: number;
  visible: number;
}

function fmtCoord(n: number | null | undefined): string {
  return typeof n === "number" ? n.toFixed(4) : "—";
}

function MapDebugOverlay({
  mode,
  originCoord,
  originLabel,
  shown,
  detailed,
  waypoints,
  segments,
  revealedCount,
  visible,
}: MapDebugOverlayProps) {
  const enabled = useStudioDebugEnabled();
  const [collapsed, setCollapsed] = useState(false);
  if (!enabled) return null;

  return (
    <div
      role="status"
      aria-label="Studio V3 map debug"
      className="absolute left-2 top-2 z-30 pointer-events-auto select-text"
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 10,
        lineHeight: 1.35,
        color: "var(--ivory)",
        background: "rgba(10,12,14,0.92)",
        border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
        borderRadius: 6,
        padding: collapsed ? "4px 8px" : "8px 10px",
        maxWidth: "min(360px, calc(100% - 16px))",
        maxHeight: "calc(100% - 16px)",
        overflow: "auto",
        backdropFilter: "blur(4px)",
        boxShadow: "0 6px 22px rgba(0,0,0,0.45)",
      }}
    >
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: collapsed ? 0 : 6 }}>
        <strong
          style={{
            color: "var(--gold)",
            letterSpacing: 1,
            textTransform: "uppercase",
            fontSize: 9,
          }}
        >
          Map · {mode} · {revealedCount}/{visible}
        </strong>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand map debug" : "Collapse map debug"}
          aria-pressed={!collapsed}
          aria-expanded={!collapsed}
          style={{
            background: "transparent",
            color: "var(--ivory)",
            border: "1px solid rgba(250,248,243,0.25)",
            borderRadius: 3,
            padding: "0 5px",
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          {collapsed ? "▢" : "—"}
        </button>
      </div>

      {!collapsed && (
        <>
          <div style={{ color: "rgba(250,248,243,0.6)", marginBottom: 4 }}>
            origin: <span style={{ color: "var(--ivory)" }}>{originLabel ?? "—"}</span>{" "}
            <span style={{ color: "color-mix(in oklab, var(--gold) 80%, var(--ivory))" }}>
              [{fmtCoord(originCoord?.lat ?? null)}, {fmtCoord(originCoord?.lng ?? null)}]
            </span>
          </div>

          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ color: "rgba(250,248,243,0.45)", textAlign: "left" }}>
                <th style={{ padding: "2px 4px 2px 0" }}>#</th>
                <th style={{ padding: "2px 4px" }}>stop</th>
                <th style={{ padding: "2px 4px" }}>lat,lng</th>
                <th style={{ padding: "2px 4px" }}>dwell</th>
                <th style={{ padding: "2px 0 2px 4px" }}>kind</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((label, i) => {
                const d = detailed[i];
                const arrived = i < revealedCount;
                return (
                  <tr
                    key={`pin-${i}`}
                    style={{
                      color: arrived ? "var(--ivory)" : "rgba(250,248,243,0.4)",
                    }}
                  >
                    <td style={{ padding: "1px 4px 1px 0", color: "var(--gold)" }}>{i + 1}</td>
                    <td style={{ padding: "1px 4px", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {label}
                    </td>
                    <td style={{ padding: "1px 4px", whiteSpace: "nowrap" }}>
                      {fmtCoord(d?.lat ?? null)}, {fmtCoord(d?.lng ?? null)}
                    </td>
                    <td style={{ padding: "1px 4px" }}>
                      {typeof d?.dwellMin === "number" ? `${d.dwellMin}m` : "—"}
                    </td>
                    <td style={{ padding: "1px 0 1px 4px" }}>{d?.kind ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ color: "rgba(250,248,243,0.55)", marginTop: 6, marginBottom: 2 }}>
            segments (drive minutes, haversine):
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              {segments.map((s) => {
                const drawn = s.index < revealedCount;
                return (
                  <tr
                    key={`seg-${s.index}`}
                    style={{ color: drawn ? "var(--ivory)" : "rgba(250,248,243,0.4)" }}
                  >
                    <td style={{ padding: "1px 4px 1px 0", color: "var(--gold)", whiteSpace: "nowrap" }}>
                      {s.index === 0 ? "O" : s.index}→{s.index + 1}
                    </td>
                    <td style={{ padding: "1px 4px", whiteSpace: "nowrap" }}>
                      {fmtCoord(s.from?.lat)},{fmtCoord(s.from?.lng)} → {fmtCoord(s.to?.lat)},{fmtCoord(s.to?.lng)}
                    </td>
                    <td style={{ padding: "1px 0 1px 4px", whiteSpace: "nowrap" }}>
                      {s.driveMin != null ? `${s.driveMin}m` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ color: "rgba(250,248,243,0.55)", marginTop: 6, marginBottom: 2 }}>
            projected (viewBox 200×260):
          </div>
          <div style={{ color: "rgba(250,248,243,0.85)" }}>
            {waypoints.map((p, i) => (
              <span key={`vp-${i}`} style={{ marginRight: 8, whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--gold)" }}>{i + 1}</span>
                :{p.x.toFixed(1)},{p.y.toFixed(1)}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 6, fontSize: 9, color: "rgba(250,248,243,0.45)" }}>
            Shift+D toggles · ?debug=off to hide
          </div>
        </>
      )}
    </div>
  );
}
