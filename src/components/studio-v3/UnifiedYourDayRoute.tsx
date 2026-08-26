/**
 * UnifiedYourDayRoute — the truthful geography of the unified "Your Day".
 *
 * Presentational only. It answers one question: may we draw this day on a
 * map at all? The rule lives in `yourDayMapTruth.ts` and is not negotiable:
 *
 *  - every kept moment has real, coherent Portuguese coordinates → show the
 *    single map instance the caller passes in;
 *  - one moment missing a real coordinate → render the `YourDayTimeline` for
 *    the SAME moments, in the same order. Not a degraded state: a composition.
 *
 * A neighbour's coordinates are never copied to fill a gap, and no driven
 * route line is drawn — pins only, unless real routed geometry exists.
 */

import { YourDayTimeline } from "./YourDayTimeline";
import { resolveYourDayMapTruth } from "./yourDayMapTruth";

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
}: {
  moments: ReadonlyArray<UnifiedYourDayMoment>;
  /** The single map instance, rendered only when geography is complete. */
  mapSlot: React.ReactNode;
  className?: string;
}) {
  const truth = resolveYourDayMapTruth(
    moments.map((m) => ({ label: m.label, lat: m.lat, lng: m.lng })),
  );

  return (
    <div
      data-testid="studio-v3-unified-route"
      data-route-mode={truth.mode}
      data-route-reason={truth.reason}
      className={className}
    >
      {truth.mode === "map" ? (
        mapSlot
      ) : (
        <YourDayTimeline moments={moments.map((m) => ({ label: m.label, story: m.story ?? null }))} />
      )}
    </div>
  );
}
