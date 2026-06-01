import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Users, Clock3, ArrowRight } from "lucide-react";
import type { RefineStop } from "./RefineStage";

/**
 * Studio v2 — Draft Map Preview.
 *
 * The same cinematic SVG map style used on the homepage (StudioLivePreview),
 * but bound to the **real** edited stops the user has just designed. Renders
 * inline at the top of the Reveal so the builder visibly produces a tangible
 * draft the client can recognise and edit — not just a poetic vignette.
 *
 * Pure presentation. No invention. Coords are projected from real lat/lng.
 */

interface Props {
  stops: RefineStop[];
  pax: number;
  pickup: string;
  durationHours: [number, number];
  pricePerGuestFrom: number;
  onEdit?: () => void;
}

const VB_W = 200;
const VB_H = 260;
const PAD = 28;

export function DraftMapPreview({
  stops, pax, pickup, durationHours, pricePerGuestFrom, onEdit,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [active, setActive] = useState(false);
  const [pathLen, setPathLen] = useState(260);

  // Project lat/lng → SVG coords (north up, west left).
  const projected = useMemo(() => {
    if (stops.length === 0) return [];
    const lats = stops.map((s) => s.lat);
    const lngs = stops.map((s) => s.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const dLat = Math.max(0.0001, maxLat - minLat);
    const dLng = Math.max(0.0001, maxLng - minLng);
    return stops.map((s) => ({
      id: s.key,
      label: s.label,
      caption: s.tag || `${Math.round(s.duration_minutes / 15) * 15} min`,
      x: PAD + ((s.lng - minLng) / dLng) * (VB_W - PAD * 2),
      // invert Y so higher lat is up
      y: PAD + (1 - (s.lat - minLat) / dLat) * (VB_H - PAD * 2),
    }));
  }, [stops]);

  const routeD = useMemo(() => {
    if (projected.length === 0) return "";
    return projected
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");
  }, [projected]);

  useEffect(() => {
    if (pathRef.current?.getTotalLength) {
      try {
        const l = pathRef.current.getTotalLength();
        if (l > 0 && Number.isFinite(l)) setPathLen(l);
      } catch { /* */ }
    }
  }, [routeD]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setActive(true); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { setActive(true); io.disconnect(); break; }
      }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (projected.length === 0) return null;

  const totalMin = stops.reduce((a, s) => a + s.duration_minutes, 0);
  const hrs = Math.round((totalMin / 60) * 2) / 2;

  return (
    <div
      ref={wrapRef}
      data-active={active ? "true" : "false"}
      className="relative overflow-hidden rounded-[6px] border shadow-[0_18px_40px_-20px_rgba(46,46,46,0.45)]"
      style={{
        borderColor: "color-mix(in oklab, var(--gold) 25%, transparent)",
        background: "var(--charcoal-deep, #1a1a1a)",
      }}
    >
      {/* Header strip */}
      <div className="relative z-20 flex items-center justify-between gap-3 border-b px-4 md:px-5 py-2.5 md:py-3"
        style={{ borderColor: "color-mix(in oklab, var(--gold) 15%, transparent)", background: "color-mix(in oklab, var(--charcoal) 90%, transparent)" }}>
        <span className="inline-flex items-center gap-2 text-[9.5px] md:text-[10px] uppercase tracking-[0.28em] tabular-nums"
          style={{ color: "var(--gold)" }}>
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ background: "var(--gold)" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--gold)" }} />
          </span>
          Your draft · live
        </span>
        <span className="text-[9.5px] md:text-[10px] uppercase tracking-[0.26em] tabular-nums"
          style={{ color: "color-mix(in oklab, var(--ivory) 65%, transparent)" }}>
          {stops.length} stops · {hrs}h
        </span>
      </div>

      {/* Chips row */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 md:gap-2 border-b px-4 md:px-5 py-3"
        style={{ borderColor: "color-mix(in oklab, var(--gold) 12%, transparent)", background: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}>
        <Chip icon={<MapPin size={11} />} label="Pickup" value={pickup} />
        <Chip icon={<Users size={11} />} label="Guests" value={String(pax)} />
        <Chip icon={<Clock3 size={11} />} label="Window" value={`${durationHours[0]}–${durationHours[1]}h`} />
      </div>

      {/* Map stage */}
      <div className="relative aspect-[4/3] sm:aspect-[5/4] md:aspect-[16/11] w-full overflow-hidden">
        <div aria-hidden className="absolute inset-0"
          style={{ background: "radial-gradient(120% 90% at 28% 18%,rgba(201,169,106,0.10) 0%,transparent 55%),radial-gradient(110% 80% at 72% 82%,rgba(41,91,97,0.50) 0%,transparent 60%)" }} />
        <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.16]" preserveAspectRatio="none" viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <defs>
            <pattern id="dmp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--gold)" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width={VB_W} height={VB_H} fill="url(#dmp-grid)" />
        </svg>

        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="dmp-route" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--teal-2)" stopOpacity="0.95" />
              <stop offset="60%" stopColor="var(--gold)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.7" />
            </linearGradient>
            <filter id="dmp-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>
          <path d={routeD} fill="none" stroke="url(#dmp-route)" strokeOpacity="0.45" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#dmp-soft)"
            strokeDasharray={pathLen} strokeDashoffset={active ? 0 : pathLen}
            style={{ transition: "stroke-dashoffset 2400ms cubic-bezier(0.22, 0.61, 0.36, 1)" }} />
          <path ref={pathRef} d={routeD} fill="none" stroke="url(#dmp-route)" strokeOpacity="1" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={pathLen} strokeDashoffset={active ? 0 : pathLen}
            style={{ transition: "stroke-dashoffset 2400ms cubic-bezier(0.22, 0.61, 0.36, 1)" }} />
          {projected.map((s, i) => (
            <g key={s.id}
              style={{
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(4px)",
                transition: `opacity 520ms ease ${i * 220}ms, transform 520ms ease ${i * 220}ms`,
              }}>
              <circle cx={s.x} cy={s.y} r="8" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
              <circle cx={s.x} cy={s.y} r="3.4" fill="var(--charcoal-deep, #1a1a1a)" />
              <circle cx={s.x} cy={s.y} r="2.6" fill={i === 0 ? "var(--teal-2)" : "var(--gold)"} />
            </g>
          ))}
        </svg>

        <ul aria-hidden className="pointer-events-none absolute inset-0 m-0 list-none p-0">
          {projected.map((s, i) => {
            const xPct = (s.x / VB_W) * 100;
            const flipLeft = xPct > 55;
            return (
              <li key={s.id} className="absolute max-w-[42%]"
                style={{
                  left: `${xPct}%`,
                  top: `${(s.y / VB_H) * 100}%`,
                  transform: flipLeft ? "translate(calc(-100% - 10px), -50%)" : "translate(10px, -50%)",
                  textAlign: flipLeft ? "right" : "left",
                  opacity: active ? 1 : 0,
                  transition: `opacity 600ms ease ${250 + i * 220}ms`,
                }}>
                <span className="block text-[10px] md:text-[11px] uppercase tracking-[0.22em] font-semibold"
                  style={{ color: "var(--ivory)", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
                  {s.label}
                </span>
                <span className="mt-0.5 block text-[9px] md:text-[10px] tracking-[0.04em] truncate"
                  style={{ color: "color-mix(in oklab, var(--ivory) 75%, transparent)", textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}>
                  {s.caption}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Investment + CTA band */}
      <div className="relative z-10 border-t px-4 md:px-5 py-3.5"
        style={{ borderColor: "color-mix(in oklab, var(--gold) 15%, transparent)", background: "var(--ivory)" }}>
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-3">
          <div className="min-w-0">
            <span className="block text-[9.5px] uppercase tracking-[0.26em] font-semibold"
              style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}>
              From
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-[1.5rem] md:text-[1.85rem] leading-none font-semibold tabular-nums"
                style={{ color: "var(--charcoal)" }}>
                €{pricePerGuestFrom}
              </span>
              <span className="text-[11.5px]" style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}>/ guest</span>
            </div>
            <span className="mt-1 block text-[10px] tabular-nums" style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}>
              Party of {pax} · all-inclusive · private
            </span>
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[3px] px-3.5 py-2 text-[11px] uppercase tracking-[0.16em] font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: "var(--teal)",
                color: "var(--ivory)",
                boxShadow: "0 4px 14px -6px rgba(41,91,97,0.55)",
              }}
            >
              Edit stops
              <ArrowRight size={12} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-semibold"
      style={{
        borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)",
        background: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
        color: "var(--ivory)",
      }}>
      <span style={{ color: "var(--gold)" }} aria-hidden>{icon}</span>
      <span style={{ color: "color-mix(in oklab, var(--ivory) 60%, transparent)" }}>{label}</span>
      <span>{value}</span>
    </span>
  );
}
