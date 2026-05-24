import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import type { RoutedStopUI } from "@/components/builder/types";

const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);

/**
 * Wraps BuilderMap with a progressive reveal: starts hidden, fades in the
 * first time a stop is accepted, then stays as the living storytelling layer.
 *
 * Optional `ribbon` slot enables a "lift the curtain" affordance — a discreet
 * gold-soft chevron at the map base that travellers can tap or drag up to
 * reveal the ItineraryRibbon as a non-modal overlay. State is ephemeral
 * (no nav, no persistence). Respects `prefers-reduced-motion`.
 */
interface Props {
  stops: RoutedStopUI[];
  regionCenter: { lat: number; lng: number } | null;
  regionKey?: string;
  revealed: boolean;
  ribbon?: ReactNode;
  curtainLabel?: string;
}

export function LivingMap({ stops, regionCenter, regionKey, revealed, ribbon, curtainLabel = "ver percurso" }: Props) {
  const [mounted, setMounted] = useState(revealed);
  const [visible, setVisible] = useState(false);
  const [curtainOpen, setCurtainOpen] = useState(false);

  useEffect(() => {
    if (revealed && !mounted) setMounted(true);
  }, [revealed, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const t = window.setTimeout(() => setVisible(true), 40);
    return () => window.clearTimeout(t);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-[4px] border border-[color:var(--ivory)]/25 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] transition-all duration-[700ms] ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
      aria-hidden={!visible}
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center bg-[color:var(--sand)] text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--charcoal)]/60 font-semibold">
            Mapa a despertar…
          </div>
        }
      >
        <BuilderMap stops={stops} regionCenter={regionCenter} regionKey={regionKey} emotionalMode />
      </Suspense>

      {ribbon ? (
        <>
          {/* Curtain handle — subtle gold-soft chevron, 24px touch target ≥44px */}
          <button
            type="button"
            onClick={() => setCurtainOpen((v) => !v)}
            aria-expanded={curtainOpen}
            aria-label={curtainLabel}
            className="absolute left-1/2 bottom-2 -translate-x-1/2 z-20 inline-flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-3 group"
          >
            <span
              className={`block w-10 h-[2px] rounded-full bg-[color:var(--gold-soft)]/70 group-hover:bg-[color:var(--gold)] transition-[transform,background-color] duration-[260ms] ease-out ${
                curtainOpen ? "translate-y-[2px] scale-x-75" : ""
              }`}
            />
            <ChevronUp
              size={14}
              className={`mt-1 text-[color:var(--gold-soft)] group-hover:text-[color:var(--gold)] transition-transform duration-[260ms] ease-out ${
                curtainOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Lifted curtain — non-modal overlay, ephemeral */}
          <div
            className={`absolute inset-x-0 bottom-0 z-10 transition-transform duration-[320ms] ease-out motion-reduce:transition-none ${
              curtainOpen ? "translate-y-0" : "translate-y-full"
            }`}
            aria-hidden={!curtainOpen}
          >
            <div className="bg-[color:var(--ivory)]/96 backdrop-blur-md border-t border-[color:var(--gold)]/40 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] pt-10 pb-4 px-4 max-h-[60%] overflow-y-auto">
              {ribbon}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
