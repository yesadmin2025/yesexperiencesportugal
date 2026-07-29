/**
 * Stop parity engine — compares the Viator Source-of-Truth (SoT) itinerary
 * for each Signature tour against three YES surfaces:
 *
 *   1. `signatureTours[].stops[]` — used on tour detail, Tailor, Studio.
 *   2. `stopGeo.STOP_LATLNG` (via lookupStop) — used by the map.
 *   3. `stopIntents.TOUR_STOP_INTENTS[tourId]` — used by Studio curation.
 *
 * Pure read-only. Used by /admin/stop-parity and by the CI test
 * `studio-signature-stop-completeness.test.ts`.
 */

import { SIGNATURE_SOURCE_OF_TRUTH } from "@/data/signatureToursSourceOfTruth";
import { signatureTours } from "@/data/signatureTours";
import { lookupStop } from "@/data/stopGeo";
import { TOUR_STOP_INTENTS } from "@/data/stopIntents";

export type StopParityStatus =
  | "match"
  | "sot-missing-in-yes"
  | "yes-only"
  | "missing-map-coord"
  | "missing-studio-intent";

export type StopParityRow = {
  order: number | null;
  sotLabel: string | null;
  yesLabel: string | null;
  optional: boolean;
  status: StopParityStatus;
  hasMapCoord: boolean;
  hasStudioIntent: boolean;
};

export type TourParityReport = {
  tourId: string;
  hasSot: boolean;
  rows: StopParityRow[];
  counts: {
    total: number;
    matched: number;
    missingInYes: number;
    yesOnly: number;
    missingMapCoord: number;
    missingStudioIntent: number;
  };
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Fuzzy label equality — normalises casing, accents, punctuation. */
function labelsMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Allow one to be a phrase-contained subset of the other (e.g.
  // "Parque Natural da Arrábida" vs "Arrábida Natural Park").
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (shorter.length >= 5 && longer.includes(shorter)) return true;
  // Token-overlap fallback for reordered labels.
  const at = new Set(na.split(" "));
  const bt = new Set(nb.split(" "));
  const shared = [...at].filter((t) => bt.has(t) && t.length >= 4).length;
  return shared >= 2;
}

export function computeTourParity(tourId: string): TourParityReport {
  const sot = SIGNATURE_SOURCE_OF_TRUTH[tourId];
  const tour = signatureTours.find((t) => t.id === tourId);
  const intents = TOUR_STOP_INTENTS[tourId] ?? {};
  const rows: StopParityRow[] = [];

  const yesStops = tour?.stops ?? [];
  const yesUsed = new Set<number>();

  if (sot) {
    for (const chapter of sot.itinerary) {
      // Pickup / drop-off entries are transit not stops — ignore.
      if (/^lisbon(\s+district)?$/i.test(chapter.label.trim())) continue;
      const yesIdx = yesStops.findIndex(
        (s, i) => !yesUsed.has(i) && labelsMatch(s.label, chapter.label),
      );
      const yesLabel = yesIdx >= 0 ? yesStops[yesIdx].label : null;
      if (yesIdx >= 0) yesUsed.add(yesIdx);

      const hasMapCoord = Boolean(lookupStop(chapter.label));
      const intentLabel = yesLabel ?? chapter.label;
      const hasStudioIntent = Boolean(intents[intentLabel]) || Boolean(intents[chapter.label]);

      let status: StopParityStatus = "match";
      if (!yesLabel) status = "sot-missing-in-yes";
      else if (!hasMapCoord) status = "missing-map-coord";
      else if (!hasStudioIntent && Object.keys(intents).length > 0)
        status = "missing-studio-intent";

      rows.push({
        order: chapter.order,
        sotLabel: chapter.label,
        yesLabel,
        optional: chapter.optional,
        status,
        hasMapCoord,
        hasStudioIntent,
      });
    }
  }

  // YES stops not matched to any SoT chapter.
  yesStops.forEach((s, i) => {
    if (yesUsed.has(i)) return;
    rows.push({
      order: null,
      sotLabel: null,
      yesLabel: s.label,
      optional: false,
      status: "yes-only",
      hasMapCoord: Boolean(lookupStop(s.label)),
      hasStudioIntent: Boolean(intents[s.label]),
    });
  });

  const counts = {
    total: rows.length,
    matched: rows.filter((r) => r.status === "match").length,
    missingInYes: rows.filter((r) => r.status === "sot-missing-in-yes").length,
    yesOnly: rows.filter((r) => r.status === "yes-only").length,
    missingMapCoord: rows.filter((r) => r.status === "missing-map-coord").length,
    missingStudioIntent: rows.filter((r) => r.status === "missing-studio-intent").length,
  };

  return { tourId, hasSot: Boolean(sot), rows, counts };
}

export function computeAllTourParity(): TourParityReport[] {
  const ids = new Set<string>();
  for (const id of Object.keys(SIGNATURE_SOURCE_OF_TRUTH)) ids.add(id);
  for (const t of signatureTours) ids.add(t.id);
  return [...ids].sort().map(computeTourParity);
}
