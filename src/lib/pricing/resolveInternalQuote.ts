// Single source of truth for booking totals.
// Client-safe. Mirrored server-side in supabase/functions/_shared/internalQuote.ts.

import type { SignatureTour } from "@/data/signatureTours";
import { resolvePerPaxEur } from "@/data/signatureTourPricing";
import type { PriceTiersEUR } from "@/data/signatureToursViator";
import { AGE_BANDS, bandForAge, type AgeBand } from "./ageBands";
import {
  billableParticipants,
  type TravellerComposition,
} from "./travellerComposition";

export interface QuoteLine {
  band: AgeBand;
  label: string;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
  isFree: boolean;
}

export interface AddOnInput {
  id: string;
  label: string;
  quantity: number;
  unitEur: number;
}

export interface QuoteAddOnLine extends AddOnInput {
  subtotalEur: number;
}

export interface InternalQuote {
  currency: "EUR";
  perPaxAdultEur: number;
  tier: number;
  realTier: boolean;
  lines: QuoteLine[];
  addOnLines: QuoteAddOnLine[];
  baseSubtotalEur: number;
  addOnSubtotalEur: number;
  finalTotalEur: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function resolveInternalQuote(input: {
  tour: Pick<SignatureTour, "id" | "priceFrom">;
  composition: TravellerComposition;
  addOns?: AddOnInput[];
  dbTiersOverride?: Record<string, PriceTiersEUR | undefined> | null;
}): InternalQuote | null {
  const partyForTier = Math.max(1, billableParticipants(input.composition));
  const resolution = resolvePerPaxEur(input.tour, partyForTier, input.dbTiersOverride);
  if (!resolution) return null;
  const perPaxAdultEur = resolution.eurPerPax;

  // Group minors into bands so the breakdown reads like a single row per band.
  const bandCounts: Record<AgeBand, number> = { adult: input.composition.adults, youth: 0, child: 0, infant: 0 };
  for (const age of input.composition.minorAges) {
    const b = bandForAge(age).band;
    if (b === "adult") bandCounts.adult += 1;
    else bandCounts[b] += 1;
  }

  const lines: QuoteLine[] = [];
  for (const def of AGE_BANDS) {
    const qty = bandCounts[def.band];
    if (qty <= 0) continue;
    const unit = round2(perPaxAdultEur * def.multiplier);
    lines.push({
      band: def.band,
      label: def.label,
      quantity: qty,
      unitEur: unit,
      subtotalEur: round2(unit * qty),
      isFree: def.multiplier === 0,
    });
  }

  const addOnLines: QuoteAddOnLine[] = (input.addOns ?? [])
    .filter((a) => a.quantity > 0)
    .map((a) => ({ ...a, subtotalEur: round2(a.unitEur * a.quantity) }));

  const baseSubtotalEur = round2(lines.reduce((s, l) => s + l.subtotalEur, 0));
  const addOnSubtotalEur = round2(addOnLines.reduce((s, l) => s + l.subtotalEur, 0));
  const finalTotalEur = round2(baseSubtotalEur + addOnSubtotalEur);

  return {
    currency: "EUR",
    perPaxAdultEur: round2(perPaxAdultEur),
    tier: resolution.tier,
    realTier: resolution.real,
    lines,
    addOnLines,
    baseSubtotalEur,
    addOnSubtotalEur,
    finalTotalEur,
  };
}
