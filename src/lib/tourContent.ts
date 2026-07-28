/**
 * getTourContent(tourId) — unified read for Signature tour content.
 *
 * Returns the Source of Truth (SoT) block when the tour has been
 * verified against its Viator page (see
 * `src/data/signatureToursSourceOfTruth.ts`). Otherwise falls back
 * to the legacy fields on `signatureTours[tourId]` and
 * `VIATOR_META[tourId]` so consumers keep working during the
 * migration.
 *
 * This is the ONLY read helper new code should use for
 * overview / highlights / included / notIncluded / itinerary.
 * Once every tour is in SoT, we delete the legacy fields and
 * this helper becomes a thin SoT wrapper.
 */

import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import {
  SIGNATURE_SOURCE_OF_TRUTH,
  type SignatureSourceOfTruth,
  type SotItineraryChapter,
} from "@/data/signatureToursSourceOfTruth";

export type TourContentSource = "sot" | "legacy";

export type TourContentChapter = {
  order: number;
  label: string;
  description: string;
  /** Real minutes at this stop when known; `null` = unknown. */
  durationMinutes: number | null;
  /** Real transit minutes to next stop when known; `null` = unknown. */
  travelToNextMinutes: number | null;
  optional: boolean;
};

export type TourContent = {
  tourId: string;
  /** Which layer supplied the content. `"sot"` = verified. */
  source: TourContentSource;
  overview: string | null;
  highlights: string[];
  included: string[];
  notIncluded: string[];
  itinerary: TourContentChapter[];
  /** Present only when `source === "sot"` — full verified block. */
  sot: SignatureSourceOfTruth | null;
  /** Underlying tour blueprint, when the id exists. */
  tour: SignatureTour | null;
};

function chaptersFromSot(items: SotItineraryChapter[]): TourContentChapter[] {
  return items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      order: c.order,
      label: c.label,
      description: c.description,
      durationMinutes: c.durationMinutes,
      travelToNextMinutes: c.travelToNextMinutes,
      optional: c.optional,
    }));
}

function chaptersFromLegacy(tour: SignatureTour | null): TourContentChapter[] {
  if (!tour?.stops?.length) return [];
  return tour.stops.map((s, i) => ({
    order: i + 1,
    label: s.label,
    description: s.story ?? "",
    durationMinutes: null,
    travelToNextMinutes: null,
    optional: false,
  }));
}

/**
 * Return the unified content block for a Signature tour.
 * Missing tour → empty block with `source: "legacy"`.
 */
export function getTourContent(tourId: string): TourContent {
  const tour = signatureTours.find((t) => t.id === tourId) ?? null;
  const sot = SIGNATURE_SOURCE_OF_TRUTH[tourId] ?? null;

  if (sot) {
    return {
      tourId,
      source: "sot",
      overview: sot.overview,
      highlights: sot.highlights,
      included: sot.included,
      notIncluded: sot.notIncluded,
      itinerary: chaptersFromSot(sot.itinerary),
      sot,
      tour,
    };
  }

  const meta = VIATOR_META[tourId];
  return {
    tourId,
    source: "legacy",
    overview: meta?.overview ?? null,
    highlights: tour?.highlights ?? [],
    included:
      meta?.included && meta.included.length > 0
        ? meta.included
        : (tour?.included ?? []),
    notIncluded: [],
    itinerary: chaptersFromLegacy(tour),
    sot: null,
    tour,
  };
}

/** True when the tour has a verified SoT entry. */
export function hasSourceOfTruth(tourId: string): boolean {
  return Boolean(SIGNATURE_SOURCE_OF_TRUTH[tourId]);
}

/**
 * Canonical duration label for a Signature ("8–9h").
 *
 * Reads the Viator-verified SoT `durationText` so cards, tour pages,
 * Tailor and JSON-LD can never show three different numbers. Falls back
 * to the legacy `durationHours` only while a tour has no SoT entry.
 */
export function signatureDurationLabel(
  tourId: string,
  fallback?: string | null,
): string | null {
  return SIGNATURE_SOURCE_OF_TRUTH[tourId]?.durationText ?? fallback ?? null;
}

/**
 * True when the canonical inclusions explicitly include a meal.
 * Used for the "Lunch included" card cue — never inferred from the
 * itinerary (Bible 5.2).
 */
export function signatureIncludesLunch(tourId: string): boolean {
  const included = SIGNATURE_SOURCE_OF_TRUTH[tourId]?.included ?? [];
  return included.some((i) => /\blunch\b|\balmoço\b|\bpicnic\b/i.test(i));
}
