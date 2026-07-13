import type { BookingQuoteBaseLine } from "@/lib/pricing/bookingQuote";
import type { PriceTiersEUR } from "@/data/signatureToursViator";
import type { TravellerComposition } from "@/lib/pricing/travellerComposition";

type ManualBand = "adult" | "youth" | "child" | "infant";

export interface ManualQuotePreview {
  lines: BookingQuoteBaseLine[];
  subtotalEur: number;
}

const BAND_META: Record<
  ManualBand,
  { label: string; multiplier: number; minAge: number; maxAge: number }
> = {
  adult: { label: "Adult (18+)", multiplier: 1, minAge: 18, maxAge: 99 },
  youth: { label: "Youth (13–17)", multiplier: 0.8, minAge: 13, maxAge: 17 },
  child: { label: "Child (3–12)", multiplier: 0.5, minAge: 3, maxAge: 12 },
  infant: { label: "Infant (0–2, free)", multiplier: 0, minAge: 0, maxAge: 2 },
};

function pickAdultUnit(tiers: PriceTiersEUR, billableParty: number): number | null {
  const bucket = Math.max(1, Math.min(8, Math.round(billableParty || 1)));
  for (let tier = bucket; tier >= 1; tier -= 1) {
    const value = tiers[tier as keyof PriceTiersEUR];
    if (typeof value === "number" && value > 0) return value;
  }
  for (let tier = bucket + 1; tier <= 8; tier += 1) {
    const value = tiers[tier as keyof PriceTiersEUR];
    if (typeof value === "number" && value > 0) return value;
  }
  return null;
}

export function buildManualQuotePreview(
  composition: TravellerComposition,
  tiers: PriceTiersEUR | null | undefined,
): ManualQuotePreview | null {
  if (!tiers || composition.adults < 1) return null;

  const agesByBand: Record<ManualBand, number[]> = {
    adult: [],
    youth: composition.minorAges.filter((age) => age >= 13 && age <= 17),
    child: composition.minorAges.filter((age) => age >= 3 && age <= 12),
    infant: composition.minorAges.filter((age) => age >= 0 && age <= 2),
  };
  const counts: Record<ManualBand, number> = {
    adult: composition.adults,
    youth: agesByBand.youth.length,
    child: agesByBand.child.length,
    infant: agesByBand.infant.length,
  };
  const billableParty = counts.adult + counts.youth + counts.child;
  const adultUnit = pickAdultUnit(tiers, billableParty);
  if (adultUnit == null) return null;

  const lines = (Object.keys(BAND_META) as ManualBand[]).flatMap((band) => {
    const quantity = counts[band];
    if (quantity < 1) return [];
    const meta = BAND_META[band];
    const unitEur = Math.round(adultUnit * meta.multiplier * 100) / 100;
    return [{
      bokunCategoryId: `manual:${band}`,
      label: meta.label,
      minAge: meta.minAge,
      maxAge: meta.maxAge,
      ages: agesByBand[band].length ? agesByBand[band] : undefined,
      quantity,
      unitEur,
      subtotalEur: Math.round(unitEur * quantity * 100) / 100,
      isFree: unitEur === 0 ? true : undefined,
    } satisfies BookingQuoteBaseLine];
  });

  return {
    lines,
    subtotalEur: Math.round(lines.reduce((sum, line) => sum + line.subtotalEur, 0) * 100) / 100,
  };
}