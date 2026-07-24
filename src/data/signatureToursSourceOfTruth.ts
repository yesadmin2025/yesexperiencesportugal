/**
 * Signature Tours — Source of Truth (SoT).
 *
 * Hand-verified extract of each Signature tour's public Viator product page.
 * This file is the ONLY place Signature overview / highlights / included /
 * itinerary / real per-chapter timings should live once every tour is
 * populated. Nothing here may be invented — every field must be visible on
 * the linked Viator URL. See `docs/signature-source-of-truth.md`.
 *
 * Populate via /admin/sot-refresh — that page fetches the Viator page,
 * runs the extractor, and gives you a ready-to-paste TS block.
 *
 * Ranges (e.g. "8 to 9 hours"): use MIDPOINT for durationMinutes and for
 * chapter minute sums. This is the project-wide convention (approved 2026-07).
 */

export type SotItineraryChapter = {
  /** Position in the day (1-based). */
  order: number;
  /** Real stop / activity name — spelled as on Viator. */
  label: string;
  /** One faithful sentence from the Viator description. ≤ 220 chars. */
  description: string;
  /**
   * Real minutes spent AT this stop. `null` when Viator doesn't state a
   * duration — never guess. Studio then falls back to its own estimate
   * but visibly marks it as approximate.
   */
  durationMinutes: number | null;
  /**
   * Real minutes of driving/transit from THIS stop to the next.
   * `null` for the last chapter or when Viator doesn't state it.
   */
  travelToNextMinutes: number | null;
  /**
   * True when Viator marks the stop as "depending on option" / "optional" /
   * "subject to availability". These render as dashed timeline entries.
   */
  optional: boolean;
};

export type SignatureSourceOfTruth = {
  /** Internal Signature tour id (must exist in signatureTours.ts). */
  tourId: string;
  /** Full Viator product URL — canonical source. */
  viatorUrl: string;
  /** e.g. "P3", parsed from the URL. */
  productCode: string;

  /** Title as printed on Viator. */
  title: string;
  /** Duration text as printed on Viator, e.g. "8 to 9 hours". */
  durationText: string;
  /** Midpoint of durationText in minutes. E.g. "8 to 9 hours" → 510. */
  durationMinutes: number;

  /** Meeting / pickup window as printed on Viator (or `null` when omitted). */
  pickupWindow: string | null;
  /** Free-text pickup zone as printed on Viator. */
  pickupZone: string;

  /** "Private tour" | "Small group" | etc — verbatim. */
  groupType: string;
  /** Max group size when Viator states it explicitly. */
  maxGroup: number | null;

  /** 2–4 sentence overview drawn only from Viator page copy. */
  overview: string;

  /** Bullet highlights as printed on Viator ("Highlights" section). */
  highlights: string[];
  /** Verbatim "What's included" list. */
  included: string[];
  /** Verbatim "What's not included" list. */
  notIncluded: string[];
  /** Items Viator marks as varying by selected package/option. */
  variesByOption: string[];

  /** Ordered chapter list — real stops with real timings when available. */
  itinerary: SotItineraryChapter[];

  /** Cancellation policy sentence as printed on Viator. */
  cancellation: string | null;
  /** Language(s) the tour is offered in. */
  languages: string[];
  /** Meeting point description as printed on Viator. */
  meetingPoint: string | null;

  /** ISO date the entry was last verified against the live Viator page. */
  verifiedAt: string;
};

/**
 * Registry — populate one tour at a time via /admin/sot-refresh.
 *
 * Populated entries are the source of truth for /tours/$tourId,
 * /tours/$tourId.tailor and Studio v2 itinerary timings. Missing entries
 * cause callers to fall back to the legacy VIATOR_META + signatureTours
 * fields (safe, unchanged behaviour).
 */
export const SIGNATURE_SOURCE_OF_TRUTH: Partial<
  Record<string, SignatureSourceOfTruth>
> = {
  // Populated via /admin/sot-refresh. Keep alphabetically by tourId.
};

/**
 * Canonical Viator URL registry for the 12 Signature tours.
 * Used by /admin/sot-refresh to know which URL to fetch per tour id.
 * Two ids intentionally point at DIFFERENT Viator products than their
 * name suggests — see plan approved 2026-07:
 *   - tiles-workshop      → P4 Golf & Wine       (id kept for SEO history)
 *   - evora-alentejo      → P6 Setúbal Wine Tour (id kept for SEO history)
 */
export const CANONICAL_VIATOR_URLS: Record<string, string> = {
  "arrabida-wine-allinclusive":
    "https://www.viator.com/tours/Lisbon/Private-Wine-Tour-with-Food-and-Wine-Tasting-in-Southern-Lisbon/d538-349639P3",
  "wild-beaches-picnic":
    "https://www.viator.com/tours/Lisbon/Wild-Beaches-and-Picnic-Experience/d538-349639P1",
  "arrabida-boat":
    "https://www.viator.com/tours/Lisbon/Private-Full-Day-Arrabida-and-Sesimbra-with-Boat-Tour-from-Lisbon/d538-349639P12",
  "tiles-workshop":
    "https://www.viator.com/tours/Lisbon/Full-Day-Golf-and-Wine-tasting-Private-Tour-in-South-Lisbon/d538-349639P4",
  "azeitao-cheese":
    "https://www.viator.com/tours/Lisbon/Azeitao-Cheese-Private-Workshop-with-Wine-and-Food-Tasting/d538-349639P9",
  "sintra-cascais":
    "https://www.viator.com/tours/Lisbon/Sintra-and-Cascais-Hidden-Gems-Private-Tour-with-Wine-Tasting/d538-349639P10",
  "troia-comporta":
    "https://www.viator.com/tours/Lisbon/Private-Troia-and-Comporta-Tour-from-Lisbon-Ruins-Wine-and-Coast/d538-349639P18",
  "evora-alentejo":
    "https://www.viator.com/tours/Lisbon/Private-Full-Day-Wine-Tour-in-Setubal-Region-from-Lisbon/d538-349639P6",
  "tomar-coimbra":
    "https://www.viator.com/tours/Lisbon/From-Lisbon-Private-Full-Day-Tour-to-Tomar-and-Coimbra/d538-349639P8",
  "fatima-nazare-obidos":
    "https://www.viator.com/tours/Lisbon/Private-Full-day-Fatima-Nazare-Obidos-Tour-from-Lisbon/d538-349639P5",
  "roman-heritage-alentejo":
    "https://www.viator.com/tours/Lisbon/Exclusive-Roman-Wine-Tour-from-Lisbon-Hidden-Alentejo-and-Flavors/d538-349639P17",
  "southwest-vicentine-coast":
    "https://www.viator.com/tours/Lisbon/Exclusive-Southwest-Coast-Experience-Undiscovered-Hidden-Secret/d538-349639P16",
};

/* -------------------------------------------------------------------------- */
/*  Read helpers — all fall back to `undefined` when SoT entry is missing.    */
/*  Callers should default to the legacy VIATOR_META / signatureTours field.  */
/* -------------------------------------------------------------------------- */

export function getSot(tourId: string): SignatureSourceOfTruth | undefined {
  return SIGNATURE_SOURCE_OF_TRUTH[tourId];
}

export function sotOverview(tourId: string): string | undefined {
  return getSot(tourId)?.overview;
}

export function sotHighlights(tourId: string): string[] | undefined {
  const v = getSot(tourId)?.highlights;
  return v && v.length > 0 ? v : undefined;
}

export function sotIncluded(tourId: string): string[] | undefined {
  const v = getSot(tourId)?.included;
  return v && v.length > 0 ? v : undefined;
}

export function sotItinerary(
  tourId: string,
): SotItineraryChapter[] | undefined {
  const v = getSot(tourId)?.itinerary;
  return v && v.length > 0 ? v : undefined;
}

export function sotDurationMinutes(tourId: string): number | undefined {
  return getSot(tourId)?.durationMinutes;
}

export function sotDurationText(tourId: string): string | undefined {
  return getSot(tourId)?.durationText;
}
