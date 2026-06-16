// Compares each Signature tour's internal stops + included list against the
// canonical Viator product data. Used by:
//   - admin/viator-validation (full report UI)
//   - tours/$tourId & tours/$tourId.tailor (dev-only console.warn)
//   - tailor booking flow (picks the Viator inclusion list when present so
//     what we sell matches what Viator actually delivers).
//
// Pure functions only — safe to import on client or server.

import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { getViatorMeta, type ViatorMeta, type ViatorStop } from "@/data/signatureToursViator";

export type FieldDiff = {
  matched: string[];
  onlyInternal: string[]; // in tour but not in Viator → likely invented
  onlyViator: string[];   // in Viator but missing from tour
};

export type TourValidation = {
  tourId: string;
  title: string;
  hasViatorMeta: boolean;
  stops: FieldDiff;
  included: FieldDiff;
  /** Total mismatch count (onlyInternal + onlyViator across both fields). */
  issueCount: number;
};

/** Normalize a string for fuzzy comparison — lowercase, strip diacritics + punctuation. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when two strings refer to the same thing (substring or token overlap). */
function looseMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(" ").filter((t) => t.length > 3));
  const tb = new Set(nb.split(" ").filter((t) => t.length > 3));
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  // Consider matched when ≥60% of the smaller token set overlaps.
  const min = Math.min(ta.size, tb.size);
  return overlap / min >= 0.6;
}

function diffLists(internal: string[], viator: string[]): FieldDiff {
  const matchedInternal = new Set<number>();
  const matchedViator = new Set<number>();
  const matched: string[] = [];

  internal.forEach((iv, i) => {
    const j = viator.findIndex((vv, k) => !matchedViator.has(k) && looseMatch(iv, vv));
    if (j >= 0) {
      matched.push(viator[j]);
      matchedInternal.add(i);
      matchedViator.add(j);
    }
  });

  return {
    matched,
    onlyInternal: internal.filter((_, i) => !matchedInternal.has(i)),
    onlyViator: viator.filter((_, j) => !matchedViator.has(j)),
  };
}

/** Stops the booking flow should sell. Falls back to internal when no Viator meta. */
export function bookableStops(
  tour: SignatureTour,
  meta: ViatorMeta | undefined,
): Array<{ label: string; passBy?: boolean; source: "viator" | "internal" }> {
  if (meta?.stops?.length) {
    return meta.stops
      .filter((s) => !s.passBy)
      .map((s) => ({ label: s.name, source: "viator" as const }));
  }
  return (tour.stops ?? []).map((s) => ({ label: s.label, source: "internal" as const }));
}

/** Inclusions the booking flow should sell. Falls back to internal when no Viator meta. */
export function bookableIncluded(
  tour: SignatureTour,
  meta: ViatorMeta | undefined,
): { items: string[]; source: "viator" | "internal" } {
  if (meta?.included?.length) return { items: meta.included, source: "viator" };
  return { items: tour.included ?? [], source: "internal" };
}

export function validateTour(tour: SignatureTour, meta?: ViatorMeta): TourValidation {
  const hasViatorMeta = !!meta;
  if (!meta) {
    return {
      tourId: tour.id,
      title: tour.title,
      hasViatorMeta: false,
      stops: { matched: [], onlyInternal: tour.stops.map((s) => s.label), onlyViator: [] },
      included: { matched: [], onlyInternal: tour.included ?? [], onlyViator: [] },
      issueCount: 0,
    };
  }

  // Viator stops compared excluding pass-bys (not booked, just driven through).
  const viatorStops = meta.stops.filter((s: ViatorStop) => !s.passBy).map((s) => s.name);
  const stops = diffLists(tour.stops.map((s) => s.label), viatorStops);
  const included = diffLists(tour.included ?? [], meta.included ?? []);

  return {
    tourId: tour.id,
    title: tour.title,
    hasViatorMeta: true,
    stops,
    included,
    issueCount:
      stops.onlyInternal.length +
      stops.onlyViator.length +
      included.onlyInternal.length +
      included.onlyViator.length,
  };
}

export function validateAllTours(): TourValidation[] {
  return signatureTours.map((t: SignatureTour) => validateTour(t, getViatorMeta(t.id)));
}

/**
 * Dev-only logger. Call once per tour mount; no-op in production.
 * Surfaces mismatches in the browser console so QA catches drift between
 * Viator and our copy without blocking the page.
 */
export function logTourValidation(v: TourValidation): void {
  if (typeof window === "undefined") return;
  if (!import.meta.env?.DEV) return;
  if (!v.hasViatorMeta || v.issueCount === 0) return;
  // eslint-disable-next-line no-console
  console.warn(
    `[viator-validation] ${v.tourId} — ${v.issueCount} mismatch${v.issueCount === 1 ? "" : "es"}`,
    {
      stops_missing_in_viator: v.stops.onlyInternal,
      stops_missing_in_tour: v.stops.onlyViator,
      included_missing_in_viator: v.included.onlyInternal,
      included_missing_in_tour: v.included.onlyViator,
    },
  );
}
