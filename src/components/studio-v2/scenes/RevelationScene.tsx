/**
 * RevelationScene — Phase 4.
 *
 * Cinematic "Portugal is responding…" beat between the last signal and the
 * itinerary reveal. A soft full-bleed image of the inferred region fades in
 * at very low opacity, then real stop names from the engine surface one-by-one
 * with small gold dot markers. No map widget — the suggestion of a map, not
 * its UI. Honours prefers-reduced-motion (drops animation, shortens dwell).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { INTENT_IMAGE } from "@/lib/studio-v2/images";
import { composeRealItinerary } from "@/lib/studio-v2/itinerary.functions";
import type { IntentAtmosphere, TravelerProfile } from "@/lib/studio-v2/profile";

interface Props {
  profile: TravelerProfile;
  region: "arrabida" | "lisbon-coast" | "alentejo" | "centro";
  topIntent: IntentAtmosphere;
  onContinue: () => void;
}

/** Editorial region label — drives the opening whisper. */
const REGION_NAME: Record<Props["region"], string> = {
  "arrabida":      "Arrábida",
  "lisbon-coast":  "the Lisbon coast",
  "alentejo":      "the Alentejo",
  "centro":        "central Portugal",
};

/** Minimum on-screen time so the beat reads as restraint, not lag. */
const MIN_DWELL_MS = 3200;
/** Max wait for the server itinerary before advancing without it. */
const MAX_DWELL_MS = 6000;
/** Cadence between stops surfacing. */
const STOP_INTERVAL_MS = 520;

export function RevelationScene({ profile, region, topIntent, onContinue }: Props) {
  const img = INTENT_IMAGE[topIntent] ?? INTENT_IMAGE.relaxed_scenic;
  const regionName = REGION_NAME[region];

  const composeReal = useServerFn(composeRealItinerary);
  const [stops, setStops] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0 whisper · 1 region · 2 stops
  const mountedAt = useRef(Date.now());
  const advancedRef = useRef(false);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Choreography: stage the lines so each beat lands.
  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), prefersReducedMotion ? 200 : 700);
    const t2 = window.setTimeout(() => setPhase(2), prefersReducedMotion ? 600 : 1500);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [prefersReducedMotion]);

  // Fetch real itinerary stops.
  useEffect(() => {
    let cancelled = false;
    composeReal({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profile: profile as any,
        region,
        targetStops: profile.stopDensityTarget ?? 4,
      },
    })
      .then((r) => {
        if (cancelled) return;
        const labels = (r?.stops ?? []).map((s) => s.label).slice(0, 5);
        setStops(labels);
      })
      .catch(() => { /* swallow — beat still advances on timer */ });
    return () => { cancelled = true; };
  }, [composeReal, profile, region]);

  // Surface stops one-by-one once they arrive and the stop phase is active.
  useEffect(() => {
    if (phase < 2 || stops.length === 0) return;
    setVisibleCount(0);
    const id = window.setInterval(() => {
      setVisibleCount((n) => {
        if (n >= stops.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, prefersReducedMotion ? 180 : STOP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [phase, stops, prefersReducedMotion]);

  // Advance once the minimum dwell has passed AND either all stops are
  // shown or we hit the safety ceiling.
  useEffect(() => {
    const tick = window.setInterval(() => {
      if (advancedRef.current) return;
      const elapsed = Date.now() - mountedAt.current;
      const stopsDone = stops.length > 0 && visibleCount >= stops.length;
      if (elapsed >= MIN_DWELL_MS && (stopsDone || elapsed >= MAX_DWELL_MS)) {
        advancedRef.current = true;
        window.clearInterval(tick);
        onContinue();
      }
    }, 200);
    return () => window.clearInterval(tick);
  }, [stops.length, visibleCount, onContinue]);

  return (
    <section
      className="relative h-[100svh] w-full overflow-hidden"
      aria-label="Portugal is responding"
      style={{ background: "var(--ivory)", color: "var(--charcoal)" }}
    >
      {/* Soft full-bleed image at ~8% — the suggestion of a map, not the UI. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src={img.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.08, filter: "saturate(0.6) blur(2px)" }}
        />
        {/* Faint teal grid wash to evoke a quiet cartographic surface. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--teal) 14%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--teal) 14%, transparent) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.18,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 50%, color-mix(in oklab, var(--ivory) 30%, transparent) 0%, color-mix(in oklab, var(--ivory) 80%, transparent) 70%, var(--ivory) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-[640px] flex-col items-center justify-center px-6 text-center sm:px-10">
        <span
          className={[
            "inline-flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-[0.36em]",
            "transition-opacity duration-[800ms] ease-out",
            phase >= 0 ? "opacity-100" : "opacity-0",
          ].join(" ")}
          style={{ color: "color-mix(in oklab, var(--charcoal) 65%, transparent)" }}
        >
          <span className="h-px w-6" style={{ background: "var(--gold)" }} />
          Chapter V · Revelation
          <span className="h-px w-6" style={{ background: "var(--gold)" }} />
        </span>

        <p
          className={[
            "mt-8 text-[24px] leading-[1.25] sm:text-[30px]",
            "transition-all duration-[900ms] ease-out",
            phase >= 0 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          ].join(" ")}
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            color: "var(--charcoal)",
          }}
        >
          Portugal is responding…
        </p>

        <p
          className={[
            "mt-3 text-[13px] uppercase tracking-[0.28em]",
            "transition-opacity duration-[700ms] ease-out",
            phase >= 1 ? "opacity-100" : "opacity-0",
          ].join(" ")}
          style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
        >
          {regionName} is opening.
        </p>

        <ul
          className={[
            "mt-10 w-full max-w-[34ch] space-y-3 text-left",
            "transition-opacity duration-[700ms] ease-out",
            phase >= 2 ? "opacity-100" : "opacity-0",
          ].join(" ")}
          aria-live="polite"
        >
          {stops.slice(0, visibleCount).map((label, i) => (
            <li
              key={`${label}-${i}`}
              className="flex items-center gap-3"
              style={{
                animation: prefersReducedMotion
                  ? undefined
                  : "studioV2RevealUp 600ms ease-out both",
              }}
            >
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 flex-none rounded-full"
                style={{
                  background: "var(--gold)",
                  boxShadow:
                    "0 0 0 4px color-mix(in oklab, var(--gold) 18%, transparent)",
                }}
              />
              <span
                className="text-[16px] leading-[1.35] sm:text-[17px]"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  color: "var(--charcoal)",
                }}
              >
                {label}
              </span>
            </li>
          ))}
        </ul>

        {/* Heartbeat — three soft gold dots while we wait. */}
        <div
          className={[
            "mt-10 flex items-center gap-2",
            "transition-opacity duration-[700ms] ease-out",
            phase >= 0 ? "opacity-100" : "opacity-0",
          ].join(" ")}
          aria-hidden="true"
        >
          <Dot delay={0} />
          <Dot delay={160} />
          <Dot delay={320} />
        </div>
      </div>
    </section>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{
        background: "var(--gold)",
        animation: "studioV2Pulse 1.4s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
