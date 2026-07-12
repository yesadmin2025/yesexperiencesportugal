// Shared Bókun category model. Preserved verbatim from Bókun so the app never
// loses the original category identity even when the UI collapses it into a
// simpler adult/youth/child/infant band.
//
// This module is browser-safe. `supabase/functions/_shared/bokunCategories.ts`
// is a byte-equivalent mirror — the contract-parity test in
// `src/lib/pricing/__tests__/parity.test.ts` guarantees they stay in sync.

import type { AgeBand } from "./ageBandPricing";

export type UiBand = AgeBand | "other";
export type MappingStatus = "confirmed" | "suggested" | "unmapped";
export type PricingPartySizeRule = "all_participants" | "billable_participants";
export type PricingMode = "flat" | "date-dependent" | "slot-dependent" | "inconsistent";

export interface MappedBokunPricingCategory {
  bokunCategoryId: string;
  bokunTitle: string;
  minAge?: number;
  maxAge?: number;
  uiBand: UiBand;
  countsTowardCapacity: boolean;
  normallyFree: boolean;
  mappingStatus: MappingStatus;
}

const TITLE_ALIASES: Array<{ pattern: RegExp; band: UiBand }> = [
  { pattern: /infant|baby|toddler/i, band: "infant" },
  { pattern: /child|kid|junior/i, band: "child" },
  { pattern: /youth|teen|student/i, band: "youth" },
  { pattern: /adult|senior/i, band: "adult" },
];

/**
 * Classify a raw Bókun pricingCategory by title alias + age range.
 * NEVER returns `mappingStatus: 'confirmed'` — only Admin UI can confirm.
 * Ambiguous rows come back as `unmapped` and MUST NOT be booked.
 */
export function suggestBandForCategory(input: {
  id: number | string;
  title: string;
  minAge?: number;
  maxAge?: number;
}): { uiBand: UiBand; mappingStatus: MappingStatus; normallyFree: boolean } {
  const title = input.title ?? "";
  const min = typeof input.minAge === "number" ? input.minAge : undefined;
  const max = typeof input.maxAge === "number" ? input.maxAge : undefined;

  // Title first (Bókun free-form label wins over age guesses).
  for (const a of TITLE_ALIASES) {
    if (a.pattern.test(title)) {
      return {
        uiBand: a.band,
        mappingStatus: "suggested",
        normallyFree: a.band === "infant",
      };
    }
  }

  // Age heuristics as fallback.
  if (max !== undefined && max <= 2) {
    return { uiBand: "infant", mappingStatus: "suggested", normallyFree: true };
  }
  if (max !== undefined && max <= 11) {
    return { uiBand: "child", mappingStatus: "suggested", normallyFree: false };
  }
  if (max !== undefined && max <= 17) {
    return { uiBand: "youth", mappingStatus: "suggested", normallyFree: false };
  }
  if (min !== undefined && min >= 18) {
    return { uiBand: "adult", mappingStatus: "suggested", normallyFree: false };
  }

  return { uiBand: "other", mappingStatus: "unmapped", normallyFree: false };
}

/** Merge freshly-fetched Bókun categories with previously stored mappings.
 * Previously CONFIRMED mappings survive — sync must never reclassify them.
 * New categories arrive as `suggested` / `unmapped`.
 */
export function mergeCategoryMappings(
  fresh: Array<{ id: number | string; title: string; minAge?: number; maxAge?: number }>,
  existing: MappedBokunPricingCategory[] | null | undefined,
): MappedBokunPricingCategory[] {
  const byId = new Map<string, MappedBokunPricingCategory>();
  for (const e of existing ?? []) byId.set(e.bokunCategoryId, e);

  return fresh.map((raw) => {
    const id = String(raw.id);
    const prior = byId.get(id);
    if (prior?.mappingStatus === "confirmed") {
      // Refresh title/ages from Bókun but preserve confirmed classification.
      return {
        ...prior,
        bokunTitle: raw.title,
        ...(typeof raw.minAge === "number" ? { minAge: raw.minAge } : { minAge: undefined }),
        ...(typeof raw.maxAge === "number" ? { maxAge: raw.maxAge } : { maxAge: undefined }),
      };
    }
    const suggestion = suggestBandForCategory({
      id: raw.id, title: raw.title, minAge: raw.minAge, maxAge: raw.maxAge,
    });
    return {
      bokunCategoryId: id,
      bokunTitle: raw.title,
      ...(typeof raw.minAge === "number" ? { minAge: raw.minAge } : {}),
      ...(typeof raw.maxAge === "number" ? { maxAge: raw.maxAge } : {}),
      uiBand: suggestion.uiBand,
      countsTowardCapacity: true,
      normallyFree: suggestion.normallyFree,
      mappingStatus: prior?.mappingStatus ?? suggestion.mappingStatus,
    };
  });
}

export function pickCategoryForBand(
  categories: MappedBokunPricingCategory[],
  band: AgeBand,
): MappedBokunPricingCategory | null {
  // Prefer confirmed matches; fall back to suggested; never return unmapped.
  const confirmed = categories.find((c) => c.uiBand === band && c.mappingStatus === "confirmed");
  if (confirmed) return confirmed;
  const suggested = categories.find((c) => c.uiBand === band && c.mappingStatus === "suggested");
  return suggested ?? null;
}

export function supportedUiBands(categories: MappedBokunPricingCategory[]): AgeBand[] {
  const bands: AgeBand[] = [];
  for (const b of ["adult", "youth", "child", "infant"] as const) {
    if (pickCategoryForBand(categories, b)) bands.push(b);
  }
  return bands;
}
