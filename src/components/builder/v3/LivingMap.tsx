import { lazy, Suspense, useEffect, useState } from "react";
import type { RoutedStopUI } from "@/components/builder/types";

const BuilderMap = lazy(() =>
  import("@/components/builder/BuilderMap").then((m) => ({ default: m.BuilderMap })),
);

/**
 * Wraps BuilderMap with a progressive reveal: starts hidden, fades in the
 * first time a stop is accepted, then stays as the living storytelling layer.
 */
interface Props {
  stops: RoutedStopUI[];
  regionCenter: { lat: number; lng: number } | null;
  regionKey?: string;
  revealed: boolean;
}

export function LivingMap({ stops, regionCenter, regionKey, revealed }: Props) {
  const [mounted, setMounted] = useState(revealed);
  const [visible, setVisible] = useState(false);

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
        <BuilderMap stops={stops} regionCenter={regionCenter} regionKey={regionKey} />
      </Suspense>
    </div>
  );
}
