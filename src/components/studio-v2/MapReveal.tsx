/**
 * Studio v2 — Map Reveal moment.
 *
 * Engine-triggered (not user-triggered). Once `revealConfidence ≥ threshold`
 * the scene fades, the map blooms full-screen for ~4s with the full traced
 * day, then collapses back. This is the emotional payoff — the bible's
 * "map as co-protagonist" beat.
 *
 * Respects prefers-reduced-motion: no fade animation, shorter dwell, single
 * tap-to-dismiss. ESC and tap also dismiss at any time.
 */

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { RoutedStopUI } from "@/components/builder/types";

const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);

interface Props {
  open: boolean;
  stops: RoutedStopUI[];
  regionCenter: { lat: number; lng: number } | null;
  regionKey?: string;
  /** Auto-dismiss after this many ms. Default 4200. */
  dwellMs?: number;
  onClose: () => void;
}

export function MapReveal({
  open, stops, regionCenter, regionKey, dwellMs = 4200, onClose,
}: Props) {
  const [phase, setPhase] = useState<"hidden" | "in" | "hold" | "out">("hidden");
  const closedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setPhase("hidden");
      closedRef.current = false;
      return;
    }
    closedRef.current = false;
    setPhase("in");
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const inMs = reduced ? 0 : 520;
    const holdMs = reduced ? Math.min(2200, dwellMs) : dwellMs;
    const outMs = reduced ? 0 : 460;

    const t1 = window.setTimeout(() => setPhase("hold"), inMs);
    const t2 = window.setTimeout(() => setPhase("out"), inMs + holdMs);
    const t3 = window.setTimeout(() => {
      if (!closedRef.current) {
        closedRef.current = true;
        onClose();
      }
    }, inMs + holdMs + outMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [open, dwellMs, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closedRef.current) {
        closedRef.current = true;
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open && phase === "hidden") return null;

  const visible = phase === "in" || phase === "hold";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your day on the map"
      onClick={() => {
        if (closedRef.current) return;
        closedRef.current = true;
        onClose();
      }}
      className="fixed inset-0 z-[120] grid place-items-center"
      style={{
        background: "color-mix(in oklab, var(--charcoal) 94%, transparent)",
        opacity: visible ? 1 : 0,
        transition: "opacity 460ms cubic-bezier(.22,.61,.36,1)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: visible ? "scale(1)" : "scale(0.985)",
          transition: "transform 520ms cubic-bezier(.22,.61,.36,1)",
        }}
      >
        {/* Editorial caption — restraint, no UI noise */}
        <div className="pointer-events-none absolute inset-x-0 top-8 z-10 flex flex-col items-center px-6 text-center">
          <p
            className="text-[10.5px] uppercase tracking-[0.36em]"
            style={{
              color: "color-mix(in oklab, var(--gold) 88%, var(--ivory))",
              fontWeight: 700,
            }}
          >
            Your day, in one breath
          </p>
          <p
            className="mt-3 text-[18px] leading-[1.3] sm:text-[22px]"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              color: "var(--ivory)",
              maxWidth: "32ch",
            }}
          >
            The country has arranged itself around you.
          </p>
        </div>

        {/* Map — full-bleed */}
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div
                className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.28em]"
                style={{ color: "color-mix(in oklab, var(--ivory) 70%, transparent)" }}
              >
                tracing the day…
              </div>
            }
          >
            <BuilderMap
              stops={stops}
              regionCenter={regionCenter}
              regionKey={regionKey}
              emotionalMode
              chrome={false}
            />
          </Suspense>
        </div>

        {/* Dismiss affordance — small, gold, top-right; not the main interaction */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (closedRef.current) return;
            closedRef.current = true;
            onClose();
          }}
          aria-label="Return to your day"
          className="absolute right-5 top-5 z-20 grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: "color-mix(in oklab, var(--ivory) 18%, transparent)",
            color: "var(--ivory)",
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
