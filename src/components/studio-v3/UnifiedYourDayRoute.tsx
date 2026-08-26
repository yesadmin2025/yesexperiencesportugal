/**
 * UnifiedYourDayRoute — the truthful geography of the unified "Your Day".
 *
 * It answers one question first: may we draw this day on a map at all? The
 * rule lives in `yourDayMapTruth.ts` and is not negotiable:
 *
 *  - every kept moment has real, coherent Portuguese coordinates → show the
 *    single map instance the caller passes in;
 *  - one moment missing a real coordinate → render the `YourDayTimeline` for
 *    the SAME moments, in the same order. Not a degraded state: a composition.
 *
 * In the unified editable surface the timeline is deliberately an overview,
 * not a second copy of every stop description. The detailed story already
 * lives immediately below in the editorial/editing layer.
 *
 * A neighbour's coordinates are never copied to fill a gap, and no driven
 * route line is drawn — pins only, unless real routed geometry exists.
 */

import { YourDayTimeline } from "./YourDayTimeline";
import { resolveYourDayMapTruth } from "./yourDayMapTruth";
import "./studioMobileA11y.css";

export interface UnifiedYourDayMoment {
  readonly label: string;
  readonly story?: string | null;
  /** Real coordinate or null. Never a filled-in neighbour value. */
  readonly lat: number | null;
  readonly lng: number | null;
}

export function UnifiedYourDayRoute({
  moments,
  mapSlot,
  className,
  testId = "studio-v3-unified-route",
}: {
  moments: ReadonlyArray<UnifiedYourDayMoment>;
  /** The single map instance, rendered only when geography is complete. */
  mapSlot: React.ReactNode;
  className?: string;
  /** Durable anchor for the reveal-order contract and E2E specs. */
  testId?: string;
}) {
  const truth = resolveYourDayMapTruth(
    moments.map((m) => ({ label: m.label, lat: m.lat, lng: m.lng })),
  );

  const scrollToEditor = () => {
    if (typeof document === "undefined") return;
    const editor = document.querySelector<HTMLElement>('[data-testid="studio-v3-stops-editor"]');
    if (!editor) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    editor.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div
      data-testid={testId}
      data-route-mode={truth.mode}
      data-route-reason={truth.reason}
      className={className}
    >
      {truth.mode === "map" ? (
        mapSlot
      ) : (
        <YourDayTimeline moments={moments.map((m) => ({ label: m.label }))} />
      )}

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          data-testid="studio-v3-edit-moments"
          onClick={scrollToEditor}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
          style={{
            color: "var(--teal)",
            border: "1px solid color-mix(in oklab, var(--teal) 28%, transparent)",
            background: "color-mix(in oklab, var(--ivory) 88%, transparent)",
          }}
        >
          Edit moments{" "}
          <span aria-hidden className="ml-1.5">
            ↓
          </span>
        </button>
      </div>
    </div>
  );
}
