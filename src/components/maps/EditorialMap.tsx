import { useEffect, useMemo, useRef, useState } from "react";

/**
 * EditorialMap — single source of truth for every schematic Portugal map
 * across the product (homepage LiveMapPreview, Studio V3 MapAwakens /
 * Signature reveal, Builder LivingMap).
 *
 * Pure SVG (no Leaflet/Mapbox). Gold pins on a topographic grid over a
 * Portugal-shaped silhouette. Route line draws itself (stroke-dashoffset),
 * pins fade in sequenced by `activeCount`, last active pin gets an ivory
 * core + soft pulse. Mobile-fast, brand-exact, byte-equivalent to the
 * homepage preview.
 *
 * Coordinate sources accepted per stop:
 *   - `x` / `y` already in stopCoords viewBox (0–100 × 0–130)  → preferred
 *   - `lat` / `lng` (mainland Portugal)                        → projected
 *   - nothing                                                  → evenly distributed along an S-curve
 *
 * Respects prefers-reduced-motion (no draw, no pulse).
 */

export type EditorialMapStop = {
  label: string;
  /** stopCoords-space x ∈ [0,100] */
  x?: number;
  /** stopCoords-space y ∈ [0,130] */
  y?: number;
  lat?: number;
  lng?: number;
};

export interface EditorialMapProps {
  stops: ReadonlyArray<EditorialMapStop>;
  /** How many stops are currently "live" (for staggered reveal). Default = all. */
  activeCount?: number;
  /** Bottom-left italic line (e.g. journey title or sub-caption). */
  caption?: string;
  /** Top-left eyebrow text. Default "Routing". */
  eyebrow?: string;
  /** Top-right meta strip (e.g. "Portugal · Live"). */
  meta?: string;
  /** Bottom-right meta strip (e.g. "4 stops · 1 day"). */
  footerRight?: string;
  /** Color tone of the canvas. */
  tone?: "dark" | "light";
  /** Optional aspect ratio override. Default "200 / 400" (homepage shape). */
  aspectRatio?: string;
  /** Optional className for sizing/border overrides. */
  className?: string;
  /** Dense route players can hide projected labels to prevent collisions. */
  showLabels?: boolean;
  /** Accessibility label for the whole map artefact. */
  ariaLabel?: string;
  /**
   * Optional drive-time minutes between consecutive stops. Length should be
   * `stops.length - 1`. When provided (and non-null), a small gold-tinted
   * chip is rendered near the midpoint of each visible leg, e.g. "35 min".
   */
  legMinutes?: ReadonlyArray<number | null | undefined>;
  /**
   * Draw the connecting line between pins. Defaults to true for the
   * schematic/editorial surfaces that have always shown it. Pass `false`
   * when the caller only holds pin coordinates: a curve through the pins is
   * a drawing, not a driven route, and must not be presented as one.
   */
  showRoute?: boolean;
  /**
   * SVG fit mode for the silhouette and route/pin layers. Defaults to
   * "xMidYMid slice" (the original homepage/builder behaviour). Callers that
   * render the portrait viewBox inside a short, wide frame should pass
   * "xMidYMid meet" so the country and its pins are never cropped away.
   */
  preserveAspectRatio?: "xMidYMid slice" | "xMidYMid meet";
}

const VB_W = 200;
const VB_H = 400;

// Mainland Portugal bbox (deg). Generous to absorb edge cases.
const PT_LAT_MAX = 42.2;
const PT_LAT_MIN = 36.9;
const PT_LNG_MIN = -9.6;
const PT_LNG_MAX = -6.1;

function projectLatLng(lat: number, lng: number): { x: number; y: number } {
  const lngT = (lng - PT_LNG_MIN) / (PT_LNG_MAX - PT_LNG_MIN);
  const latT = (PT_LAT_MAX - lat) / (PT_LAT_MAX - PT_LAT_MIN);
  return {
    x: Math.max(8, Math.min(VB_W - 8, lngT * VB_W)),
    y: Math.max(8, Math.min(VB_H - 8, latT * VB_H)),
  };
}

// stopCoords are authored in a 100×130 viewBox; map up to our 200×400.
function projectStopCoord(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(8, Math.min(VB_W - 8, (x / 100) * VB_W)),
    y: Math.max(8, Math.min(VB_H - 8, (y / 130) * VB_H)),
  };
}

function resolveStopPoints(
  stops: ReadonlyArray<EditorialMapStop>,
): { x: number; y: number; label: string }[] {
  const n = stops.length;
  return stops.map((s, i) => {
    if (typeof s.x === "number" && typeof s.y === "number") {
      const p = projectStopCoord(s.x, s.y);
      return { ...p, label: s.label };
    }
    if (typeof s.lat === "number" && typeof s.lng === "number") {
      const p = projectLatLng(s.lat, s.lng);
      return { ...p, label: s.label };
    }
    // Fallback — even distribution along a soft S-curve down the country.
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = 84 + Math.sin(t * Math.PI) * 22;
    const y = 32 + t * 332;
    return { x, y, label: s.label };
  });
}

function buildRouteD(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const cx = (a.x + b.x) / 2;
    const cy = Math.min(a.y, b.y) - 14;
    d += ` Q ${cx} ${cy} ${b.x} ${b.y}`;
  }
  return d;
}

export function EditorialMap({
  stops,
  activeCount,
  caption,
  eyebrow = "Routing",
  meta = "Portugal · Live",
  footerRight,
  tone = "dark",
  aspectRatio = "200 / 400",
  className,
  showLabels = true,
  showRoute = true,
  preserveAspectRatio = "xMidYMid slice",
  ariaLabel,
  legMinutes,
}: EditorialMapProps) {
  const points = useMemo(() => resolveStopPoints(stops), [stops]);
  const visible = Math.max(0, Math.min(points.length, activeCount ?? points.length));
  const shown = points.slice(0, visible);
  const routeD = useMemo(() => (showRoute ? buildRouteD(shown) : ""), [shown, showRoute]);

  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isDark = tone === "dark";
  const surface = isDark
    ? "var(--charcoal-deep, #14181a)"
    : "color-mix(in oklab, var(--ivory) 96%, var(--gold) 4%)";
  const eyebrowColor = isDark
    ? "var(--gold)"
    : "color-mix(in oklab, var(--gold) 90%, var(--charcoal))";
  const metaColor = isDark
    ? "color-mix(in oklab, var(--ivory) 55%, transparent)"
    : "color-mix(in oklab, var(--charcoal) 55%, transparent)";
  const captionColor = isDark
    ? "color-mix(in oklab, var(--ivory) 95%, transparent)"
    : "color-mix(in oklab, var(--charcoal) 88%, transparent)";

  const a11y =
    ariaLabel ??
    `Schematic route through Portugal with ${shown.length} stop${shown.length === 1 ? "" : "s"}.`;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={a11y}
      className={`relative overflow-hidden border ${className ?? ""}`}
      style={{
        aspectRatio,
        background: surface,
        borderColor: "color-mix(in oklab, var(--gold) 30%, transparent)",
      }}
    >
      {/* Atmospheric radial wash */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(120% 90% at 30% 20%, rgba(201,169,106,0.10) 0%, transparent 55%), radial-gradient(110% 80% at 70% 80%, rgba(41,91,97,0.45) 0%, transparent 60%)"
            : "radial-gradient(120% 90% at 30% 20%, rgba(201,169,106,0.14) 0%, transparent 55%), radial-gradient(110% 80% at 70% 80%, rgba(41,91,97,0.10) 0%, transparent 60%)",
        }}
      />

      {/* Topographic grid */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{ opacity: isDark ? 0.18 : 0.12 }}
        preserveAspectRatio="none"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
      >
        <defs>
          <pattern id="em-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--gold)" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width={VB_W} height={VB_H} fill="url(#em-grid)" />
      </svg>

      {/* Portugal silhouette — coastline + land mass */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio={preserveAspectRatio}
      >
        <path
          d="M 78 12 C 96 10 118 14 138 18 C 146 46 148 78 150 108 C 152 148 154 188 152 226 C 150 262 148 296 142 326 C 136 354 126 376 112 388 C 96 398 78 396 66 388 C 54 378 48 358 46 336 C 42 300 44 262 46 224 C 48 184 50 144 54 108 C 58 74 64 44 78 12 Z"
          fill="rgba(201,169,106,0.06)"
          stroke="rgba(201,169,106,0.32)"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        {/* Faint interior spine hinting at the Tagus/Douro axis */}
        <path
          d="M 60 60 Q 96 140 106 230 T 118 360"
          fill="none"
          stroke="rgba(201,169,106,0.10)"
          strokeWidth="0.5"
          strokeDasharray="2 3"
        />
      </svg>

      {/* Route + pins */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio={preserveAspectRatio}
      >
        <defs>
          <linearGradient id="em-route" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {routeD ? (
          <path
            d={routeD}
            fill="none"
            stroke="url(#em-route)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="900"
            strokeDashoffset={active ? 0 : 900}
            style={{ transition: "stroke-dashoffset 2400ms cubic-bezier(0.22, 0.61, 0.36, 1)" }}
          />
        ) : null}
        {shown.map((p, i) => {
          const isLast = i === shown.length - 1;
          const delay = i * 320;
          return (
            <g
              key={`${p.label}-${i}`}
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
                r="6"
                fill="var(--gold)"
                opacity="0.18"
                className={active && isLast ? "em-pulse" : ""}
                style={{
                  animationDelay: `${delay + 600}ms`,
                  transformOrigin: `${p.x}px ${p.y}px`,
                  transformBox: "fill-box",
                }}
              />
              <circle cx={p.x} cy={p.y} r="2.6" fill="var(--gold)" />
              {isLast ? (
                <circle cx={p.x} cy={p.y} r="1.4" fill="var(--ivory)" opacity="0.95" />
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Top eyebrow + meta */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] font-semibold"
          style={{ color: eyebrowColor }}
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
              style={{ background: "var(--gold)" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: "var(--gold)" }}
            />
          </span>
          {eyebrow}
        </span>
        {meta ? (
          <span
            className="text-[9.5px] uppercase tracking-[0.28em] font-semibold"
            style={{ color: metaColor }}
          >
            {meta}
          </span>
        ) : null}
      </div>

      {/* Pin labels — projected to percent so they stick to their pin in any container size. */}
      {showLabels ? (
        <ul className="pointer-events-none absolute inset-0 m-0 list-none p-0">
          {shown.map((p, i) => {
            const xPct = (p.x / VB_W) * 100;
            const yPct = (p.y / VB_H) * 100;
            const flipLeft = xPct > 58;
            const delay = i * 320 + 200;
            return (
              <li
                key={`label-${p.label}-${i}`}
                className="absolute text-[10px] uppercase tracking-[0.24em] font-semibold"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  maxWidth: "44%",
                  transform: flipLeft
                    ? "translate(calc(-100% - 10px), -50%)"
                    : "translate(10px, -50%)",
                  textAlign: flipLeft ? "right" : "left",
                  color: isDark
                    ? "color-mix(in oklab, var(--ivory) 88%, transparent)"
                    : "color-mix(in oklab, var(--charcoal) 78%, transparent)",
                  opacity: active ? 1 : 0,
                  transition: `opacity 700ms ease ${delay}ms`,
                  textShadow: isDark ? "0 1px 4px rgba(0,0,0,0.55)" : "none",
                }}
              >
                {p.label}
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Drive-time chips — small gold-outlined pills near each leg midpoint
          along the visible route. Only rendered when legMinutes are provided
          and the corresponding leg is currently visible. */}
      {showRoute && legMinutes && shown.length >= 2 ? (
        <ul className="pointer-events-none absolute inset-0 m-0 list-none p-0">
          {shown.slice(1).map((b, i) => {
            const a = shown[i];
            const mins = legMinutes[i];
            if (typeof mins !== "number" || mins <= 0) return null;
            // Match the curve's control point (Q ... cy = min(a.y,b.y) - 14).
            // Approximate midpoint of the quadratic at t=0.5:
            // P = 0.25*A + 0.5*C + 0.25*B
            const cx = (a.x + b.x) / 2;
            const cy = Math.min(a.y, b.y) - 14;
            const mx = 0.25 * a.x + 0.5 * cx + 0.25 * b.x;
            const my = 0.25 * a.y + 0.5 * cy + 0.25 * b.y;
            const xPct = (mx / VB_W) * 100;
            const yPct = (my / VB_H) * 100;
            const delay = i * 320 + 900;
            return (
              <li
                key={`leg-${i}`}
                className="absolute text-[9px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: "translate(-50%, -50%)",
                  padding: "2px 6px",
                  borderRadius: "999px",
                  background: isDark
                    ? "color-mix(in oklab, var(--charcoal-deep, #14181a) 82%, transparent)"
                    : "color-mix(in oklab, var(--ivory) 92%, transparent)",
                  color: isDark
                    ? "color-mix(in oklab, var(--ivory) 92%, transparent)"
                    : "color-mix(in oklab, var(--charcoal) 82%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--gold) 55%, transparent)",
                  opacity: active ? 1 : 0,
                  transition: `opacity 520ms ease ${delay}ms`,
                }}
              >
                {Math.round(mins)} min
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Bottom strip */}
      {caption || footerRight ? (
        <div className="absolute left-4 bottom-4 right-4 flex items-end justify-between gap-3">
          {caption ? (
            <div>
              <p
                className="text-[9.5px] uppercase tracking-[0.32em] font-semibold"
                style={{ color: eyebrowColor }}
              >
                Today's draft
              </p>
              <p
                className="mt-1.5 text-[14px] sm:text-[15px] italic leading-tight"
                style={{ fontFamily: "var(--font-serif)", color: captionColor }}
              >
                {caption}
              </p>
            </div>
          ) : (
            <span />
          )}
          {footerRight ? (
            <span
              className="text-[9.5px] uppercase tracking-[0.28em] font-semibold whitespace-nowrap"
              style={{ color: metaColor }}
            >
              {footerRight}
            </span>
          ) : null}
        </div>
      ) : null}

      <style>{`
        @keyframes em-pulse {
          0% { transform: scale(0.6); opacity: 0.55; }
          70% { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .em-pulse {
          animation: em-pulse 2400ms cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .em-pulse { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { projectLatLng, projectStopCoord };
