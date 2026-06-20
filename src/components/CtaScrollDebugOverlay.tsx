import { useEffect, useRef, useState, type RefObject } from "react";

type Snapshot = {
  scale: number;
  from: number;
  to: number;
  distance: number;
  scrollY: number;
  /** True when the raw eased value would have escaped [from, to] before clamping. */
  clamped: boolean;
};

type Props = {
  /** Element that owns --cta-scroll-scale (the magnet group / hero CTA wrapper). */
  targetRef: RefObject<HTMLElement | null>;
};

const STORAGE_KEY = "cta-scroll-debug";

/**
 * useCtaScrollDebugToggle — small hook that decides whether the overlay is
 * active. Two ways to enable:
 *   1. URL contains `?debug-cta` (or `&debug-cta`)
 *   2. Press Shift+D anywhere on the page (toggles + persists in sessionStorage)
 *
 * SSR-safe: starts `false`, hydrates the real value after mount so the
 * server and client render the same initial markup.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCtaScrollDebugToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fromUrl = new URLSearchParams(window.location.search).has("debug-cta");
    const fromStorage = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    if (fromUrl || fromStorage) setEnabled(true);

    const onKey = (e: KeyboardEvent) => {
      // Shift+D, ignore when typing in an input/textarea/contenteditable.
      if (!e.shiftKey || e.key.toLowerCase() !== "d") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) {
        return;
      }
      setEnabled((prev) => {
        const next = !prev;
        try {
          window.sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        } catch {
          /* sessionStorage may be blocked — fine, in-memory state still works */
        }
        return next;
      });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return enabled;
}

/**
 * CtaScrollDebugOverlay — fixed-corner readout of the live
 * `--cta-scroll-scale` value plus the from/to/distance clamp envelope.
 *
 * Designed for QA, not for end users. Render conditionally:
 *
 *   const debug = useCtaScrollDebugToggle();
 *   const ref = useCtaScrollScale<HTMLDivElement>(...);
 *   ...
 *   {debug && <CtaScrollDebugOverlay targetRef={ref} />}
 *
 * Polls the target via rAF (no extra scroll listener of its own), reads
 * the resolved CSS variables off computed style so it reflects whatever
 * the hook actually applied — including CSS-overridden from/to/distance.
 */
export function CtaScrollDebugOverlay({ targetRef }: Props) {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof window === "undefined") return;

    let rafId = 0;
    let mounted = true;

    const readNumber = (name: string, fallback: number) => {
      const raw = getComputedStyle(el).getPropertyValue(name).trim();
      if (!raw) return fallback;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : fallback;
    };

    const tick = () => {
      if (!mounted) return;
      const scale = readNumber("--cta-scroll-scale", 1);
      const from = readNumber("--cta-scroll-from", 0.96);
      const to = readNumber("--cta-scroll-to", 1.015);
      const distance = readNumber("--cta-scroll-distance", 280);
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      // "Clamped" if the live scale is sitting exactly on either bound
      // while we're not at the matching scroll extreme — a useful signal
      // that the envelope is doing real work.
      const clamped =
        (Math.abs(scale - lo) < 0.0001 && window.scrollY > 0 && window.scrollY < distance) ||
        (Math.abs(scale - hi) < 0.0001 && window.scrollY > 0 && window.scrollY < distance);
      setSnap({ scale, from, to, distance, scrollY: window.scrollY, clamped });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [targetRef]);

  if (!snap) return null;

  const lo = Math.min(snap.from, snap.to);
  const hi = Math.max(snap.from, snap.to);
  // Position of current scale on the [lo, hi] track.
  const scalePct = hi === lo ? 0 : ((snap.scale - lo) / (hi - lo)) * 100;
  // Position of scroll on the [0, distance] track.
  const scrollPct = Math.min(100, (snap.scrollY / Math.max(1, snap.distance)) * 100);

  return (
    <div
      // Fixed corner, never blocks the CTA itself, ignores pointer so it
      // can't disrupt hover/click testing of the buttons it's measuring.
      className="fixed bottom-4 right-4 z-[9999] pointer-events-none select-none font-mono text-[11px] leading-tight text-white"
      role="status"
      aria-label="CTA scroll-scale debug overlay"
    >
      <div className="rounded-md bg-black/80 backdrop-blur-md px-3 py-2.5 shadow-2xl ring-1 ring-white/10 min-w-[220px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 uppercase tracking-[0.18em] text-[9.5px]">cta-scroll</span>
          <span className="text-white/40 text-[9.5px]">Shift+D</span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[20px] font-light tabular-nums text-[color:var(--gold-soft)]">
            {snap.scale.toFixed(4)}
          </span>
          <span className="text-white/45 text-[10px]">scale</span>
          {snap.clamped && (
            <span className="ml-auto text-[9px] uppercase tracking-wider text-amber-300">
              clamped
            </span>
          )}
        </div>

        {/* Scale within [from, to] envelope */}
        <div className="mb-1 flex justify-between text-[9.5px] text-white/55 tabular-nums">
          <span>from {snap.from.toFixed(3)}</span>
          <span>to {snap.to.toFixed(3)}</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-white/10 mb-2.5">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[color:var(--gold)] shadow-[0_0_6px_rgba(201,169,106,0.8)]"
            style={{ left: `calc(${scalePct}% - 4px)` }}
          />
        </div>

        {/* Scroll within [0, distance] window */}
        <div className="mb-1 flex justify-between text-[9.5px] text-white/55 tabular-nums">
          <span>scroll {Math.round(snap.scrollY)}px</span>
          <span>dist {Math.round(snap.distance)}px</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/55"
            style={{ width: `${scrollPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
