/**
 * ATTACH STRUCTURAL DWELL — recover the timing truth a route point ALREADY has.
 *
 * Some legacy route sources (the non-Living-Atlas curation path and the raw
 * catalogue Signature fallback) only ever carried label / story / geography.
 * A day built from them reached the canonical Time Authority with no proven
 * dwell, so it was judged `not-evaluable` — never bookable — even though every
 * one of its moments is a real, already-published inventory stop with a
 * verified duration.
 *
 * This module invents nothing. For each point it asks the EXISTING scoped
 * identity authority (`resolveCompositionIdentity`) which single in-scope
 * inventory stop the moment is, and, only when that resolution is `verified`,
 * copies that stop's own `durationMin` (provenance `inventory`), its id and
 * its published coordinates. Anything ambiguous or unresolved is returned
 * untouched and keeps failing closed.
 */

import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { resolveCompositionIdentity } from "@/lib/studio-v3/compositionIdentity";
import type { DwellSource } from "@/lib/studio-v3/timeDomain";

export interface StructuralDwellPoint {
  label: string;
  lat?: number | null;
  lng?: number | null;
  inventoryStopId?: string | null;
  durationMinutes?: number | null;
  durationSource?: DwellSource | null;
}

export function attachStructuralDwell<P extends StructuralDwellPoint>(
  anchorTourId: string | null | undefined,
  points: ReadonlyArray<P>,
): P[] {
  if (!anchorTourId) return points.map((point) => ({ ...point }));
  return points.map((point, slot) => {
    if (point.durationMinutes != null && point.inventoryStopId) return { ...point };
    const record = resolveCompositionIdentity({
      anchorTourId,
      slot,
      moment: { label: point.label, inventoryStopId: point.inventoryStopId ?? null },
    });
    if (record.confidence !== "verified" || !record.inventoryStopId) return { ...point };
    const stop = REGION_STOP_POOL.find((candidate) => candidate.id === record.inventoryStopId);
    if (!stop || !(stop.durationMin > 0)) return { ...point };
    return {
      ...point,
      inventoryStopId: point.inventoryStopId ?? stop.id,
      lat: point.lat ?? stop.coords?.lat ?? null,
      lng: point.lng ?? stop.coords?.lng ?? null,
      durationMinutes: point.durationMinutes ?? stop.durationMin,
      durationSource: point.durationSource ?? ("inventory" as DwellSource),
    };
  });
}
