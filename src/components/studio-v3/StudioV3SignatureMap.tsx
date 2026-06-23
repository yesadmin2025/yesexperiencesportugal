// Studio V3 — Signature Map (shared cinematic map language).
//
// Visually mirrors the homepage StudioLivePreview map stage so that
// between-question creation beats AND the final Signature Story reveal
// feel like the same artefact. We do NOT import the homepage component
// directly — it bakes in its own chrome (stepper, chips, investment band,
// CTA, hard-coded Lisbon→Azeitão→Sesimbra data) which is unsafe to reuse
// inside Studio V3. Instead we mirror only its map stage: dark editorial
// canvas, radial gradient, hairline gold grid, coastal silhouette,
// gradient route line with soft glow, pulsing gold/teal pins with labels.
//
// This component is presentational only. It accepts real label strings
// from `resolveStudioV3Route` / `editedRoutePoints` and lays them out as
// schematic pins on a fixed 200×260 viewBox — never claiming geographic
// coordinates (the schematic is explicitly marked aria-hidden where it
// would mislead, and the wrapper carries a descriptive aria-label).
//
// Missing coordinates do NOT prevent rendering — the map is intentionally
// schematic, so the only graceful-degradation case is "no labels at all"
// (we return null in that case so callers can fall back).

import { useEffect, useMemo, useRef, useState } from "react";

export interface StudioV3SignatureMapProps {
  /** Real stop labels (1..6). First pin is the route start. */
  stops: ReadonlyArray<string>;
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
}

const VB_W = 200;
const VB_H = 260;
const ORIGIN = { x: 40, y: 44 };

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

/** Generate deterministic screen-space waypoints along a soft S-curve.
 *  Slots are distributed evenly across the full curve regardless of `n`,
 *  then deconflicted so no two pins land within `MIN_SEP` of each other —
 *  this prevents 4-stop routes (e.g. Évora / Alentejo) from visually
 *  collapsing into 2 pins when stops are geographically close.
 *  Geometry is schematic, not geographic. */
const MIN_SEP = 22; // viewBox units (pin radius ≈ 8)
function waypointsForLabels(labels: ReadonlyArray<string>): { x: number; y: number }[] {
  const n = labels.length;
  if (n === 0) return [];
  // Even fractions along the curve: 1→[0.5], 2→[0,1], 3→[0,0.5,1], 4→[0,.34,.67,1]
  const xMin = 70,
    xMax = 178;
  const yMin = 88,
    yMax = 232;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    // Soft S-curve in Y so the route reads as a coastal arc.
    const sy = t + Math.sin(t * Math.PI) * 0.08;
    const baseX = xMin + (xMax - xMin) * t;
    const baseY = yMin + (yMax - yMin) * Math.max(0, Math.min(1, sy));
    const j = labelJitter(labels[i]);
    out.push({
      x: Math.max(60, Math.min(186, baseX + j * 0.4)),
      y: Math.max(80, Math.min(236, baseY + (j % 5) * 0.6)),
    });
  }
  // Deconflict — if any pin is too close to its predecessor, nudge it
  // further along the natural curve direction.
  for (let i = 1; i < out.length; i += 1) {
    const a = out[i - 1];
    const b = out[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < MIN_SEP) {
      const push = MIN_SEP - dist + 1;
      // Push primarily along +x/+y (route flows down-right).
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

/** Build a smooth route path through origin + waypoints (Catmull-Rom-ish). */
function buildRoutePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${ORIGIN.x} ${ORIGIN.y}`;
  let prev = ORIGIN;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const cx = (prev.x + p.x) / 2;
    const cy = Math.min(prev.y, p.y) - 10;
    d += ` Q ${cx} ${cy} ${p.x} ${p.y}`;
    prev = p;
  }
  return d;
}

export function StudioV3SignatureMap({
  stops,
  originLabel,
  activeCount,
  paceLabel,
  aspectRatio = "16 / 11",
  className,
  ariaLabel,
}: StudioV3SignatureMapProps) {
  const cleaned = useMemo(() => stops.map(cleanLabel).filter(Boolean), [stops]);
  const visible = Math.max(0, Math.min(cleaned.length, activeCount ?? cleaned.length));
  const shown = cleaned.slice(0, visible);
  const waypoints = useMemo(() => waypointsForLabels(shown), [shown]);
  const path = useMemo(() => buildRoutePath(waypoints), [waypoints]);

  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(280);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (pathRef.current && typeof pathRef.current.getTotalLength === "function") {
      try {
        const l = pathRef.current.getTotalLength();
        if (l > 0 && Number.isFinite(l)) setPathLen(l);
      } catch {
        /* noop */
      }
    }
  }, [path]);

  useEffect(() => {
    setActive(false);
    const t = window.setTimeout(() => setActive(true), 60);
    return () => window.clearTimeout(t);
  }, [path, visible]);

  if (cleaned.length === 0) return null;

  const a11y =
    ariaLabel ??
    (originLabel
      ? `Forming route from ${originLabel} with ${shown.length} stop${shown.length === 1 ? "" : "s"}.`
      : `Forming route with ${shown.length} stop${shown.length === 1 ? "" : "s"}.`);

  return (
    <div
      role="img"
      aria-label={a11y}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        aspectRatio,
        background: "var(--charcoal-deep, #14181a)",
        borderRadius: "6px",
        border: "1px solid color-mix(in oklab, var(--gold) 28%, transparent)",
        boxShadow:
          "0 28px 70px -34px rgba(0,0,0,0.75), 0 0 60px -22px color-mix(in oklab, var(--gold) 18%, transparent) inset",
      }}
    >
      {/* Radial wash — gold top-left, teal bottom-right. Mirrors homepage. */}
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

      {/* Coastal silhouette — abstract land/water divide. */}
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

      {/* Hairline gold rule + corner ticks (editorial signature). */}
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
            cx={ORIGIN.x}
            cy={ORIGIN.y}
            r="7"
            fill="none"
            stroke="var(--gold)"
            strokeOpacity="0.5"
            strokeWidth="0.55"
            style={{
              animation: active ? "sv3smPulse 2200ms ease-out 200ms infinite" : undefined,
              transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
              transformBox: "fill-box",
            }}
          />
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r="3.6" fill="var(--charcoal-deep, #14181a)" />
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r="2.6" fill="var(--teal-2, var(--teal))" />
        </g>

        {path ? (
          <>
            <path
              d={path}
              fill="none"
              stroke="url(#sv3sm-route)"
              strokeOpacity="0.45"
              strokeWidth="3.6"
              strokeLinecap="round"
              filter="url(#sv3sm-soft)"
              strokeDasharray={pathLen}
              strokeDashoffset={active ? 0 : pathLen}
              style={{
                transition: "stroke-dashoffset 1900ms cubic-bezier(0.22, 0.61, 0.36, 1) 380ms",
              }}
            />
            <path
              ref={pathRef}
              d={path}
              fill="none"
              stroke="url(#sv3sm-route)"
              strokeOpacity="1"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeDasharray={pathLen}
              strokeDashoffset={active ? 0 : pathLen}
              style={{
                transition: "stroke-dashoffset 1900ms cubic-bezier(0.22, 0.61, 0.36, 1) 380ms",
              }}
            />
          </>
        ) : null}

        {waypoints.map((p, i) => {
          const isLast = i === waypoints.length - 1;
          const delay = 600 + i * 380;
          return (
            <g
              key={i}
              style={{
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(4px)",
                transition: `opacity 520ms ease ${delay}ms, transform 520ms ease ${delay}ms`,
                transformBox: "fill-box",
                transformOrigin: `${p.x}px ${p.y}px`,
              }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r="8"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="1.1"
                strokeOpacity="0.55"
              />
              {isLast ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill="var(--gold)"
                  opacity="0.18"
                  style={{
                    animation: active
                      ? `sv3smPulse 2200ms ease-out ${delay + 600}ms infinite`
                      : undefined,
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

      {/* Only the active/last pin's full name floats on the map.
          Hidden on mobile (≤520px) to prevent overlap with the legend
          and the bottom strip. The numbered legend below the map
          carries the full route on small screens. */}
      {waypoints.length > 0
        ? (() => {
            const i = waypoints.length - 1;
            const p = waypoints[i];
            const xPct = (p.x / VB_W) * 100;
            const yPct = (p.y / VB_H) * 100;
            const flipLeft = xPct > 55;
            const delay = 600 + i * 380 + 250;
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
                  opacity: active ? 1 : 0,
                  transition: `opacity 600ms ease ${delay}ms`,
                }}
              >
                <span className="block text-[10px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]">
                  {shown[i]}
                </span>
              </div>
            );
          })()
        : null}

      {/* Bottom strip — From X · pace/stops.
          Hidden on mobile (≤520px) so the in-map captions never collide
          with the pin labels. The numbered legend rendered by the caller
          carries the full route on small screens. */}
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

      <style>{`
        @keyframes sv3smPulse {
          0% { opacity: 0; transform: scale(0.6); }
          40% { opacity: 0.7; }
          100% { opacity: 0; transform: scale(1.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="sv3smPulse"] { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
  );
}
