import { useEffect, useState } from "react";

/**
 * HeroScrimRuler — preview-only visual ruler that overlays the hero with
 * horizontal guide lines marking the top/bottom edges of each mobile scrim,
 * plus a vertical svh ruler down the right edge. Helps verify scrim
 * positioning at a glance without changing any animation/scrim logic.
 *
 * Activate with any of:
 *   • URL flag `?debug-scrim` (or `?debug-scrim=1`)
 *   • Shift+R toggle (persisted in sessionStorage)
 *
 * Hidden on production by default — opt-in only.
 */

const STORAGE_KEY = "hero-scrim-ruler";

// eslint-disable-next-line react-refresh/only-export-components
export function useHeroScrimRulerToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = new URLSearchParams(window.location.search).has("debug-scrim");
    const fromStorage = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    if (fromUrl || fromStorage) setEnabled(true);

    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== "r") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      setEnabled((prev) => {
        const next = !prev;
        try {
          window.sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return enabled;
}

type Edge = {
  /** Label shown next to the line. */
  label: string;
  /** CSS top value, e.g. "10svh" or "calc(100% - 8svh)". */
  top: string;
  /** Tailwind/inline color tone (gold for radial, teal for vertical). */
  color: string;
  /** Whether this is a top or bottom edge of a scrim band. */
  side: "top" | "bottom";
};

const EDGES: Edge[] = [
  { label: "radial top · 10svh", top: "10svh", color: "color:var(--gold)", side: "top" },
  { label: "radial bottom · 8svh", top: "calc(100% - 8svh)", color: "var(--gold)", side: "bottom" },
  { label: "vertical top · 12svh", top: "12svh", color: "#5BB0BA", side: "top" },
  { label: "vertical bottom · 10svh", top: "calc(100% - 10svh)", color: "#5BB0BA", side: "bottom" },
];

/** svh tick marks down the right edge — every 10svh from 0..100. */
const TICKS = Array.from({ length: 11 }, (_, i) => i * 10);

export function HeroScrimRuler() {
  return (
    <div
      aria-hidden="true"
      // Sits above scrims (z-2) but below the copy column (z-10) so the
      // ruler is visible without intercepting clicks. md:hidden — mobile only.
      className="hero-scrim-ruler pointer-events-none absolute inset-0 z-[3] md:hidden font-mono"
    >
      {EDGES.map((edge) => (
        <div
          key={edge.label}
          className="absolute inset-x-0 flex items-center"
          style={{ top: edge.top }}
        >
          <div
            className="h-px flex-1"
            style={{
              background: `repeating-linear-gradient(to right, ${edge.color} 0 6px, transparent 6px 10px)`,
            }}
          />
          <span
            className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white"
            style={{
              background: `${edge.color}E6`,
              transform: edge.side === "bottom" ? "translateY(-50%)" : "translateY(-50%)",
            }}
          >
            {edge.label}
          </span>
        </div>
      ))}

      {/* svh ruler down the left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-white/15 bg-black/30 backdrop-blur-[2px]">
        {TICKS.map((t) => (
          <div
            key={t}
            className="absolute left-0 right-0 flex items-center gap-1"
            style={{ top: `${t}svh`, transform: "translateY(-50%)" }}
          >
            <span className="h-px w-2 bg-white/60" />
            <span className="text-[8.5px] text-white/85 tabular-nums">{t}</span>
          </div>
        ))}
      </div>

      {/* Legend pill */}
      <div className="absolute right-2 top-2 rounded-md bg-black/75 px-2 py-1.5 text-[9px] text-white/90 leading-tight ring-1 ring-white/15">
        <div className="font-bold tracking-[0.18em] uppercase mb-0.5 text-[8.5px]">Scrim ruler</div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-2.5" style={{ background: "var(--gold)" }} />
          radial
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-2.5" style={{ background: "#5BB0BA" }} />
          vertical
        </div>
        <div className="mt-0.5 text-white/55">Shift+R</div>
      </div>
    </div>
  );
}
