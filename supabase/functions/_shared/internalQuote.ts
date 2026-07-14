// Server-side mirror of src/lib/pricing/ageBands.ts + resolveInternalQuote.ts.
// Duplicated for Deno edge runtime. Rules MUST stay byte-equivalent to the
// client version — the whole point of the server re-compute is tamper
// resistance.

export type AgeBand = "adult" | "youth" | "child" | "infant";

export interface AgeBandDef {
  band: AgeBand;
  label: string;
  minAge: number;
  maxAge: number;
  multiplier: number;
  countsForPartySize: boolean;
}

export const AGE_BANDS: readonly AgeBandDef[] = [
  { band: "adult", label: "Adult", minAge: 18, maxAge: 120, multiplier: 1.0, countsForPartySize: true },
  { band: "youth", label: "Youth (12–17)", minAge: 12, maxAge: 17, multiplier: 0.75, countsForPartySize: true },
  { band: "child", label: "Child (3–11)", minAge: 3, maxAge: 11, multiplier: 0.5, countsForPartySize: true },
  { band: "infant", label: "Infant (0–2)", minAge: 0, maxAge: 2, multiplier: 0, countsForPartySize: false },
] as const;

export function bandForAge(age: number): AgeBandDef {
  if (!Number.isFinite(age) || age < 0) return AGE_BANDS[3];
  for (const def of AGE_BANDS) {
    if (age >= def.minAge && age <= def.maxAge) return def;
  }
  return AGE_BANDS[0];
}

export interface TravellerComposition {
  adults: number;
  minorAges: number[];
}

export interface PriceTiers {
  [tier: string]: number | undefined;
}

export interface InternalQuoteLine {
  band: AgeBand;
  label: string;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
  isFree: boolean;
}

export interface InternalQuote {
  currency: "EUR";
  perPaxAdultEur: number;
  tier: number;
  lines: InternalQuoteLine[];
  addOnLines: Array<{ id: string; label: string; quantity: number; unitEur: number; subtotalEur: number }>;
  baseSubtotalEur: number;
  addOnSubtotalEur: number;
  finalTotalEur: number;
  billableGuests: number;
  totalGuests: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function clampTier(g: number): number {
  if (!Number.isFinite(g) || g < 1) return 8;
  if (g >= 8) return 8;
  return Math.round(g);
}

/** Resolve adult per-pax EUR for a party size against tier map + priceFrom. */
export function resolvePerPaxAdultEur(
  tiers: PriceTiers | null | undefined,
  priceFromEur: number,
  partyForTier: number,
): number {
  const tier = clampTier(partyForTier);
  const t = tiers?.[String(tier)];
  if (typeof t === "number" && t > 0) return t;
  return priceFromEur;
}

export function computeInternalQuote(input: {
  tiers: PriceTiers | null | undefined;
  priceFromEur: number;
  composition: TravellerComposition;
  addOns?: Array<{ id: string; label: string; quantity: number; unitEur: number }>;
}): InternalQuote {
  const adults = Math.max(0, Math.floor(input.composition.adults));
  const minorAges = (input.composition.minorAges ?? []).map((a) => Math.max(0, Math.floor(a)));

  const bandCounts: Record<AgeBand, number> = { adult: adults, youth: 0, child: 0, infant: 0 };
  for (const age of minorAges) {
    const b = bandForAge(age).band;
    if (b === "adult") bandCounts.adult += 1;
    else bandCounts[b] += 1;
  }

  const billable = bandCounts.adult + bandCounts.youth + bandCounts.child;
  const total = billable + bandCounts.infant;
  const partyForTier = Math.max(1, billable);
  const perPaxAdultEur = resolvePerPaxAdultEur(input.tiers, input.priceFromEur, partyForTier);

  const lines: InternalQuoteLine[] = [];
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

  const addOnLines = (input.addOns ?? [])
    .filter((a) => a.quantity > 0 && a.unitEur >= 0)
    .map((a) => ({ ...a, subtotalEur: round2(a.unitEur * a.quantity) }));

  const baseSubtotalEur = round2(lines.reduce((s, l) => s + l.subtotalEur, 0));
  const addOnSubtotalEur = round2(addOnLines.reduce((s, l) => s + l.subtotalEur, 0));
  const finalTotalEur = round2(baseSubtotalEur + addOnSubtotalEur);

  return {
    currency: "EUR",
    perPaxAdultEur: round2(perPaxAdultEur),
    tier: clampTier(partyForTier),
    lines,
    addOnLines,
    baseSubtotalEur,
    addOnSubtotalEur,
    finalTotalEur,
    billableGuests: billable,
    totalGuests: total,
  };
}
