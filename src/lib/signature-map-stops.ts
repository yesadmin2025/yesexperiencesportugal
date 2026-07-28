/**
 * Signature map stops — single resolver shared by the client map and the
 * `getSignatureTourRoute` server fn, so the pins and the drawn legs can
 * never disagree.
 *
 * Source of truth: the Viator-verified SoT itinerary
 * (`SIGNATURE_SOURCE_OF_TRUTH`). Pass-by chapters are excluded (they are
 * seen from the road, not visited). Legacy `tour.stops` is used ONLY when
 * a tour has no SoT entry.
 *
 * Content policy: labels come from the SoT verbatim. Nothing invented.
 */

import type { SignatureTour } from "@/data/signatureTours";
import { sotItinerary } from "@/data/signatureToursSourceOfTruth";
import { lookupStop } from "@/data/stopGeo";

export interface SignatureMapStop {
  label: string;
  lat: number;
  lng: number;
}

/** Ordered, de-duplicated, geo-resolved stops for a Signature map. */
export function resolveSignatureMapStops(tour: SignatureTour): SignatureMapStop[] {
  const sot = sotItinerary(tour.id);
  const labels: string[] = sot?.length
    ? sot
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((c) => c.stopType !== "pass-by")
        .map((c) => c.label)
    : (tour.stops ?? []).map((s) => s.label);

  const seen = new Set<string>();
  const out: SignatureMapStop[] = [];
  for (const label of labels) {
    const hit = lookupStop(label);
    if (!hit) continue;
    const key = `${hit.lat.toFixed(4)},${hit.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, lat: hit.lat, lng: hit.lng });
  }
  return out;
}
