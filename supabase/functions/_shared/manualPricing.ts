// Manual Signature pricing — bypasses Bókun entirely.
//
// Uses the adult per-pax EUR tier map stored in `tour_price_tiers.tiers`
// (Viator data) and applies the launch-locked age-band rule:
//
//   Adult (18+)        = 100% of adult per-pax tier
//   Youth (13–17)      =  80% of adult
//   Child (3–12)       =  50% of adult
//   Infant (0–2)       =    €0
//
// Party size for the tier lookup = adults + youth + children (infants
// excluded). Category ids use a `manual:<band>` prefix so downstream
// checkout can detect the manual quote and skip every Bókun call.

import type { TravellerComposition } from "./travellerComposition.ts";
import type {
  BookingQuoteBaseLine,
} from "./bookingQuote.ts";

export type ManualPriceTiers = Partial<
  Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>
>;

export type ManualBand = "adult" | "youth" | "child" | "infant";

export interface ManualQuoteResult {
  lines: BookingQuoteBaseLine[];
  subtotalEur: number;
  adultUnitEur: number;
  billableParty: number;
  guestMix: {
    adults: number;
    youths: number;
    children: number;
    infants: number;
    totalParticipants: number;
  };
}

/** Age → band. */
export function ageToManualBand(age: number): ManualBand {
  if (age >= 18) return "adult";
  if (age >= 13) return "youth";
  if (age >= 3) return "child";
  return "infant";
}

const BAND_LABEL: Record<ManualBand, string> = {
  adult: "Adult (18+)",
  youth: "Youth (13–17)",
  child: "Child (3–12)",
  infant: "Infant (0–2, free)",
};

const BAND_MULT: Record<ManualBand, number> = {
  adult: 1.0,
  youth: 0.8,
  child: 0.5,
  infant: 0.0,
};

const BAND_MIN_AGE: Record<ManualBand, number> = {
  adult: 18,
  youth: 13,
  child: 3,
  infant: 0,
};

const BAND_MAX_AGE: Record<ManualBand, number> = {
  adult: 99,
  youth: 17,
  child: 12,
  infant: 2,
};

const BAND_ORDER: ManualBand[] = ["adult", "youth", "child", "infant"];

/** Coerce raw `tiers` JSON to a numeric map. Accepts flat adult-only shape. */
export function coerceAdultTiers(raw: unknown): ManualPriceTiers | null {
  if (!raw || typeof raw !== "object") return null;
  // Banded shape { adult: {...}, ... } → take adult sub-map.
  const record = raw as Record<string, unknown>;
  const source =
    record.adult && typeof record.adult === "object"
      ? (record.adult as Record<string, unknown>)
      : record;
  const out: ManualPriceTiers = {};
  for (const k of ["1", "2", "3", "4", "5", "6", "7", "8"] as const) {
    const v = source[k];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      out[Number(k) as keyof ManualPriceTiers] = v;
    }
  }
  return Object.keys(out).length ? out : null;
}

/** Resolve adult per-pax €. Walks to nearest available tier if requested tier absent. */
export function pickAdultUnit(
  tiers: ManualPriceTiers,
  billableParty: number,
): number | null {
  const clamped = Math.max(1, Math.min(8, billableParty || 1));
  // Try exact, then walk down, then walk up.
  for (let k = clamped; k >= 1; k--) {
    const v = tiers[k as keyof ManualPriceTiers];
    if (typeof v === "number") return v;
  }
  for (let k = clamped + 1; k <= 8; k++) {
    const v = tiers[k as keyof ManualPriceTiers];
    if (typeof v === "number") return v;
  }
  return null;
}

export function buildManualQuote(
  composition: TravellerComposition,
  tiers: ManualPriceTiers,
): ManualQuoteResult | { error: "no_adult_tier" | "no_adults" } {
  const adults = Math.max(0, composition.adults);
  const youths = composition.minorAges.filter((a) => a >= 13 && a <= 17).length;
  const children = composition.minorAges.filter((a) => a >= 3 && a <= 12).length;
  const infants = composition.minorAges.filter((a) => a >= 0 && a <= 2).length;
  const totalParticipants = adults + youths + children + infants;

  if (adults <= 0) return { error: "no_adults" };

  const billableParty = adults + youths + children;
  const adultUnit = pickAdultUnit(tiers, billableParty);
  if (adultUnit == null) return { error: "no_adult_tier" };

  const counts: Record<ManualBand, number> = {
    adult: adults,
    youth: youths,
    child: children,
    infant: infants,
  };
  const agesByBand: Record<ManualBand, number[]> = {
    adult: [],
    youth: composition.minorAges.filter((a) => a >= 13 && a <= 17),
    child: composition.minorAges.filter((a) => a >= 3 && a <= 12),
    infant: composition.minorAges.filter((a) => a >= 0 && a <= 2),
  };

  const lines: BookingQuoteBaseLine[] = [];
  for (const band of BAND_ORDER) {
    const qty = counts[band];
    if (qty <= 0) continue;
    const unit = Math.round(adultUnit * BAND_MULT[band] * 100) / 100;
    const subtotal = Math.round(unit * qty * 100) / 100;
    lines.push({
      bokunCategoryId: `manual:${band}`,
      label: BAND_LABEL[band],
      minAge: BAND_MIN_AGE[band],
      maxAge: BAND_MAX_AGE[band],
      ages: agesByBand[band].length ? agesByBand[band] : undefined,
      quantity: qty,
      unitEur: unit,
      subtotalEur: subtotal,
      isFree: unit === 0 ? true : undefined,
    });
  }

  const subtotalEur =
    Math.round(lines.reduce((s, l) => s + l.subtotalEur, 0) * 100) / 100;

  return {
    lines,
    subtotalEur,
    adultUnitEur: adultUnit,
    billableParty,
    guestMix: { adults, youths, children, infants, totalParticipants },
  };
}

/** Sentinels used in booking_quotes rows for manual quotes. */
export const MANUAL_BOKUN_PRODUCT_ID = "manual";
export const MANUAL_AVAILABILITY_ID_PREFIX = "manual";
export function manualAvailabilityId(date: string, startTime?: string | null): string {
  return `${MANUAL_AVAILABILITY_ID_PREFIX}:${date}:${(startTime ?? "").slice(0, 16)}`;
}
export function manualCommercialMappingId(
  flow: string,
  commercialProductKey: string,
): string {
  return `manual:${flow}:${commercialProductKey}`;
}
export function isManualBokunProductId(v: string | null | undefined): boolean {
  return v === MANUAL_BOKUN_PRODUCT_ID;
}
