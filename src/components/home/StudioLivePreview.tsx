import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wine, Users, Clock3, Sparkles, MapPin, ArrowRight, Plus } from "lucide-react";
import { useScrollDebugFlags } from "@/lib/scroll-debug";

/**
 * StudioLivePreview — homepage "Experience Studio" hero device.
 *
 * v2 (conversion pass) — keeps the cinematic map, but adds the high-signal
 * elements travellers expect when shopping a premium private day:
 *  · top step indicator + progress bar (clear sense of advancement)
 *  · live "Routing your day" status + Mood / Who / Rhythm chips
 *  · animated route across Lisbon → Azeitão → Sesimbra
 *  · smart-recommendation upsell row (1-tap add)
 *  · estimated investment band (price visible, not hidden)
 *  · dual CTA: Reserve draft (primary) + Open Studio (ghost)
 *
 * Mobile-first. Honours `prefers-reduced-motion`. All numbers below are
 * preview-only and explicitly labelled "Draft" / "Concierge confirms".
 */

type Stop = {
  id: string;
  x: number;
  y: number;
  label: string;
  caption: string;
  delay: number;
};

const STOPS: Stop[] = [
  { id: "lis", x: 70, y: 60, label: "Lisbon", caption: "Pickup", delay: 0 },
  {
    id: "aze",
    x: 110,
    y: 138,
    label: "Azeitão",
    caption: "Wine tasting · Local lunch",
    delay: 700,
  },
  { id: "ses", x: 154, y: 206, label: "Sesimbra", caption: "Coastal viewpoint", delay: 1400 },
];

const ROUTE_D = "M 70 60 C 78 92, 90 116, 110 138 S 138 178, 154 206";
const FALLBACK_LEN = 260;

// Preview-only figures. Marked as a draft on screen so we never imply a
// final, payable quote — actual pricing lands at /builder + Bokun.
const DRAFT_STEP = 2;
const DRAFT_STEPS_TOTAL = 3;
const DRAFT_INVESTMENT_EUR = 145;
const DRAFT_PARTY = 2;

export function StudioLivePreview() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [active, setActive] = useState(false);
  const [visibleTest, setVisibleTest] = useState(false);
  const [pathLen, setPathLen] = useState(FALLBACK_LEN);
  const [added, setAdded] = useState(false);
  const scrollDebug = useScrollDebugFlags();
  const renderedActive = active || scrollDebug.disableMobileStudioMotion;
  const routeDuration = visibleTest ? 3000 : 2900;

  const progressPct = Math.round((DRAFT_STEP / DRAFT_STEPS_TOTAL) * 100);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVisibleTest(new URLSearchParams(window.location.search).get("motion-visible-test") === "1");
  }, []);

  useEffect(() => {
    if (pathRef.current && typeof pathRef.current.getTotalLength === "function") {
      try {
        const l = pathRef.current.getTotalLength();
        if (l > 0 && Number.isFinite(l)) setPathLen(l);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
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
      { threshold: 0.12, rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      data-active={renderedActive ? "true" : "false"}
      className="studio-live relative overflow-hidden rounded-[6px] border border-[color:var(--gold)]/25 bg-[color:var(--charcoal-deep)] shadow-[0_18px_40px_-20px_rgba(46,46,46,0.45)]"
      role="img"
      aria-label="Experience Studio live preview: Lisbon to Azeitão to Sesimbra, a relaxed day around wine and the coast, your day so far one hundred and forty-five euros per guest"
    >
      {/* ── Header strip — stepper + live status ─────────────────── */}
      <div className="relative z-20 flex items-center justify-between gap-3 border-b border-[color:var(--gold)]/15 bg-[color:var(--charcoal-deep)]/90 px-4 md:px-5 py-2.5 md:py-3 backdrop-blur-[2px]">
        <span className="inline-flex items-center gap-2 text-[9.5px] md:text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)] tabular-nums">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--gold)] opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--gold)]" />
          </span>
          Step {DRAFT_STEP} of {DRAFT_STEPS_TOTAL}
        </span>
      </div>

      {/* Progress bar — gold fill, animates on reveal */}
      <div aria-hidden="true" className="relative z-20 h-[3px] w-full bg-[color:var(--ivory)]/10">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:var(--teal-2)] via-[color:var(--gold)] to-[color:var(--gold)]"
          style={{
            width: renderedActive ? `${progressPct}%` : "6%",
            transition: "width 1400ms cubic-bezier(0.22, 0.61, 0.36, 1) 200ms",
          }}
        />
      </div>

      {/* Chips row — Mood · Who · Rhythm */}
      <div
        className="relative z-10 flex flex-wrap items-center gap-1.5 md:gap-2 border-b border-[color:var(--gold)]/12 bg-[color:var(--charcoal-deep)]/70 px-4 md:px-5 py-3"
        role="group"
        aria-label="Studio inputs preview"
      >
        <Chip icon={<Wine size={11} aria-hidden="true" />} label="Mood" value="Wine & food" />
        <Chip icon={<Users size={11} aria-hidden="true" />} label="Who" value="Couple" />
        <Chip icon={<Clock3 size={11} aria-hidden="true" />} label="Rhythm" value="Relaxed" />
      </div>

      {/* ── Map stage ─────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] sm:aspect-[5/4] md:aspect-[16/11] w-full overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_28%_18%,rgba(201,169,106,0.10)_0%,transparent_55%),radial-gradient(110%_80%_at_72%_82%,rgba(41,91,97,0.50)_0%,transparent_60%)]"
        />
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-[0.16]"
          preserveAspectRatio="none"
          viewBox="0 0 200 260"
        >
          <defs>
            <pattern id="slv-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--gold)" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="200" height="260" fill="url(#slv-grid)" />
        </svg>
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 200 260"
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
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 200 260"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="slv-route" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--teal-2)" stopOpacity="0.95" />
              <stop offset="60%" stopColor="var(--gold)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.7" />
            </linearGradient>
            <filter id="slv-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>
          <path
            d={ROUTE_D}
            fill="none"
            stroke="url(#slv-route)"
            strokeOpacity="0.45"
            strokeWidth="3.8"
            strokeLinecap="round"
            filter="url(#slv-soft)"
            strokeDasharray={pathLen}
            strokeDashoffset={renderedActive ? 0 : pathLen}
            style={{
              transition: `stroke-dashoffset ${routeDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
            }}
          />
          <path
            ref={pathRef}
            d={ROUTE_D}
            fill="none"
            stroke="url(#slv-route)"
            strokeOpacity="1"
            strokeWidth="1.95"
            strokeLinecap="round"
            strokeDasharray={pathLen}
            strokeDashoffset={renderedActive ? 0 : pathLen}
            style={{
              transition: `stroke-dashoffset ${routeDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
            }}
          />
          {STOPS.map((s, i) => (
            <g
              key={s.id}
              className="slv-pin"
              role="button"
              tabIndex={0}
              aria-label={`${s.label} — ${s.caption}`}
              style={{
                opacity: renderedActive ? 1 : 0,
                transform: renderedActive ? "translateY(0)" : "translateY(4px)",
                transition: `opacity 520ms ease ${s.delay}ms, transform 520ms ease ${s.delay}ms`,
                transformBox: "fill-box",
                transformOrigin: `${s.x}px ${s.y}px`,
              }}
            >
              <circle
                className="slv-pin-focus"
                cx={s.x}
                cy={s.y}
                r="8"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="1.2"
              />
              {(i === 0 || i === STOPS.length - 1) && (
                <circle
                  cx={s.x}
                  cy={s.y}
                  r="6"
                  fill="var(--gold)"
                  opacity="0.18"
                  className={renderedActive ? "slv-pulse" : ""}
                  style={{ animationDelay: `${s.delay + 600}ms` }}
                />
              )}
              <circle cx={s.x} cy={s.y} r="3.4" fill="var(--charcoal-deep)" />
              <circle cx={s.x} cy={s.y} r="2.6" fill={i === 0 ? "var(--teal-2)" : "var(--gold)"} />
              {i === STOPS.length - 1 && (
                <circle cx={s.x} cy={s.y} r="1.1" fill="var(--ivory)" opacity="0.95" />
              )}
            </g>
          ))}
        </svg>
        <ul aria-hidden="true" className="pointer-events-none absolute inset-0 m-0 list-none p-0">
          {STOPS.map((s) => {
            const xPct = (s.x / 200) * 100;
            const flipLeft = xPct > 55; // keep labels inside the frame
            return (
              <li
                key={s.id}
                className="absolute max-w-[44%]"
                style={{
                  left: `${xPct}%`,
                  top: `${(s.y / 260) * 100}%`,
                  transform: flipLeft
                    ? "translate(calc(-100% - 10px), -50%)"
                    : "translate(10px, -50%)",
                  textAlign: flipLeft ? "right" : "left",
                  opacity: renderedActive ? 1 : 0,
                  transition: `opacity 600ms ease ${s.delay + 250}ms`,
                }}
              >
                <span className="block text-[10px] md:text-[11px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
                  {s.label}
                </span>
                <span className="mt-0.5 block text-[9px] md:text-[10px] tracking-[0.04em] text-[color:var(--ivory)]/75 [text-shadow:0_1px_3px_rgba(0,0,0,0.55)] truncate">
                  {s.caption}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-[color:var(--ivory)]/90">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
            Today's draft
          </p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ivory)]/60 tabular-nums">
            3 stops · 7h30
          </p>
        </div>
      </div>

      {/* ── Smart recommendation row — 1-tap upsell ───────────────── */}
      <button
        type="button"
        onClick={() => setAdded((v) => !v)}
        aria-pressed={added}
        className="group relative z-10 flex w-full items-center gap-3 border-t border-[color:var(--gold)]/15 bg-[color:var(--charcoal-deep)]/80 px-4 md:px-5 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-inset"
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold)]/45 bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
          <Sparkles size={12} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--gold)]">
            Smart pick
          </span>
          <span className="mt-0.5 block truncate text-[12px] md:text-[12.5px] text-[color:var(--ivory)]/90">
            Most couples add a private cellar tasting.
          </span>
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] uppercase tracking-[0.18em] font-semibold tabular-nums transition-colors duration-200 ${
            added
              ? "border-[color:var(--teal-2)]/60 bg-[color:var(--teal-2)]/15 text-[color:var(--teal-2)]"
              : "border-[color:var(--gold)]/45 bg-transparent text-[color:var(--gold)] group-hover:bg-[color:var(--gold)]/10"
          }`}
        >
          <Plus
            size={11}
            aria-hidden="true"
            className={added ? "rotate-45 transition-transform" : "transition-transform"}
          />
          {added ? "Added" : "Add"}
        </span>
      </button>

      {/* ── Investment + CTA band ─────────────────────────────────── */}
      <div className="relative z-10 border-t border-[color:var(--gold)]/15 bg-[color:var(--ivory)] px-4 md:px-5 py-3.5">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-3">
          <div className="min-w-0">
            <span className="block text-[9.5px] uppercase tracking-[0.26em] font-semibold text-[color:var(--charcoal-soft)]">
              Draft investment
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-[1.5rem] md:text-[1.85rem] leading-none font-semibold text-[color:var(--charcoal)] tabular-nums">
                €{DRAFT_INVESTMENT_EUR}
              </span>
              <span className="text-[11.5px] text-[color:var(--charcoal-soft)]">/ guest</span>
            </div>
            <span className="mt-1 block text-[10px] text-[color:var(--charcoal-soft)] tabular-nums">
              Party of {DRAFT_PARTY} · concierge confirms
            </span>
          </div>
          <Link
            to="/studio-v3"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[3px] bg-[color:var(--teal)] px-3.5 py-2 text-[11px] uppercase tracking-[0.16em] font-semibold text-[color:var(--ivory)] shadow-[0_4px_14px_-6px_rgba(41,91,97,0.55)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2"
          >
            Continue draft
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>

        {/* Reassurance row — instant-confirmation signal */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] text-[color:var(--charcoal-soft)]">
            <MapPin size={11} aria-hidden="true" className="text-[color:var(--teal)]" />
            Instant confirmation · cancel 48h
          </p>
          <Link
            to="/experiences"
            className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[color:var(--teal)] hover:text-[color:var(--gold)] transition-colors duration-200"
          >
            See sample day
          </Link>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${value}`}
      className="slv-focusable inline-flex items-center gap-1.5 rounded-full border border-[color:var(--gold)]/30 bg-[color:var(--charcoal-deep)]/60 px-2.5 py-1 text-[color:var(--ivory)]"
    >
      <span className="text-[color:var(--gold)]">{icon}</span>
      <span className="text-[9px] uppercase tracking-[0.26em] text-[color:var(--ivory)]/65">
        {label}
      </span>
      <span className="text-[11px] font-semibold tracking-[0.01em] text-[color:var(--ivory)]">
        {value}
      </span>
    </span>
  );
}
