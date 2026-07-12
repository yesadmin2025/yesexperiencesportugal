// MIRROR of src/lib/pricing/bokunCategories.ts for Supabase Edge Functions.
// Keep byte-equivalent to the src/ copy — parity test enforces this.

import type { AgeBand } from "./ageBandPricing.ts";

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

export function suggestBandForCategory(input: {
  id: number | string;
  title: string;
  minAge?: number;
  maxAge?: number;
}): { uiBand: UiBand; mappingStatus: MappingStatus; normallyFree: boolean } {
  const title = input.title ?? "";
  const min = typeof input.minAge === "number" ? input.minAge : undefined;
  const max = typeof input.maxAge === "number" ? input.maxAge : undefined;

  for (const a of TITLE_ALIASES) {
    if (a.pattern.test(title)) {
      return {
        uiBand: a.band,
        mappingStatus: "suggested",
        normallyFree: a.band === "infant",
      };
    }
  }

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
