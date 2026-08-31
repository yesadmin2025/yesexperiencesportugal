/**
 * authoredAnchorProjection — P0-A COMPOSITION TRUTH.
 *
 * The RAW catalogue stop list of a Signature is NOT a sellable itinerary.
 * For anchors that declare an alternative pool ("choose 2 of 5 wineries"),
 * the catalogue lists every CANDIDATE. Emitting that list wholesale invents
 * a day nobody sells: 5 winery visits in one afternoon, a duration and a
 * price that do not exist, and a commercially unresolvable composition.
 *
 * This module projects the authored anchor down to its canonical
 * cardinality, using ONLY existing truth:
 *   - `signatureToursSourceOfTruth` · `poolPick.wineries.min`
 *   - `tailorBlueprints` · `choice.pickMin`
 *   - `isWineryStopLabel` (the typed catalogue winery identity authority)
 *
 * It never invents a stop, never reorders, never renames. It only DROPS
 * surplus pool candidates beyond the canonical minimum, keeping the first
 * ones in authored route order. When the anchor declares no pool, or fewer
 * candidates than the minimum are present, the points pass through
 * untouched — the projection fails OPEN only in the direction of "change
 * nothing", never in the direction of inventing membership.
 */

import { getSot } from "@/data/signatureToursSourceOfTruth";
import { getTailorBlueprint } from "@/data/tailorBlueprints";
import { isWineryStopLabel } from "./studioWineryPresentation";

/** Canonical number of pool picks the base product actually includes. */
export function anchorWineryPickMin(anchorTourId: string | null | undefined): number | null {
  if (!anchorTourId) return null;
  const sotMin = getSot(anchorTourId)?.poolPick?.wineries?.min;
  if (typeof sotMin === "number" && sotMin > 0) return sotMin;
  const blueprintMin = getTailorBlueprint(anchorTourId)?.choice?.pickMin;
  if (typeof blueprintMin === "number" && blueprintMin > 0) return blueprintMin;
  return null;
}

export interface AuthoredAnchorProjection<T> {
  /** The canonical authored day — surplus pool candidates removed. */
  readonly points: T[];
  /** Canonical labels dropped as surplus candidates. Diagnostics only. */
  readonly droppedLabels: string[];
  /** True when the raw list was over-cardinal and had to be projected. */
  readonly projected: boolean;
}

/**
 * Collapse an authored anchor stop list to its canonical pool cardinality.
 * Generic over any object carrying a `label`; identity fields untouched.
 */
export function projectAuthoredAnchorStops<T extends { label: string }>(
  anchorTourId: string | null | undefined,
  points: ReadonlyArray<T>,
): AuthoredAnchorProjection<T> {
  const pickMin = anchorWineryPickMin(anchorTourId);
  if (!pickMin || points.length === 0) {
    return { points: [...points], droppedLabels: [], projected: false };
  }

  const candidateIndexes = points
    .map((p, i) => (isWineryStopLabel(p.label) ? i : -1))
    .filter((i) => i >= 0);

  // Nothing surplus to drop — the authored day is already canonical, or the
  // catalogue carries fewer candidates than the product includes (in which
  // case dropping anything would UNDER-deliver).
  if (candidateIndexes.length <= pickMin) {
    return { points: [...points], droppedLabels: [], projected: false };
  }

  const dropped = new Set(candidateIndexes.slice(pickMin));
  return {
    points: points.filter((_, i) => !dropped.has(i)),
    droppedLabels: points.filter((_, i) => dropped.has(i)).map((p) => p.label),
    projected: true,
  };
}
