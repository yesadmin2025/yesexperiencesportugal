// Server-owned Studio V3 commercial pricing catalogue.
//
// Deliberately decoupled from `tour_price_tiers` and from any Signature Tour's
// `priceFrom` anchor. This is the single authority for what the Studio charges.
//
// Pass 1: only 3-guest tier for `studio-v3-private-full-day` is approved.
// Any other guest count → `pricing_unavailable` (guest is routed to designer).
// No borrowed tiers, no invented values.
import { buildManualQuote, type ManualPriceTiers } from "./manualPricing.ts";
import type { TravellerComposition } from "./travellerComposition.ts";

export type StudioCommercialProductKey = "studio-v3-private-full-day";

export const STUDIO_COMMERCIAL_PRODUCT_KEYS: readonly StudioCommercialProductKey[] = [
  "studio-v3-private-full-day",
] as const;

export function isStudioCommercialProductKey(
  value: unknown,
): value is StudioCommercialProductKey {
  return (
    typeof value === "string" &&
    (STUDIO_COMMERCIAL_PRODUCT_KEYS as readonly string[]).includes(value)
  );
}

type Tier = { guests: number; unitEur: number };

// Approved tiers (Viator mirror, aligned with Setúbal Wine Discovery):
//   1 → €279 / 2-3 → €215 / 4-6 → €189 / 7-8 → €159 per guest.
// Groups outside 1–8 continue to route to the travel designer.
const CATALOGUE: Record<StudioCommercialProductKey, Tier[]> = {
  "studio-v3-private-full-day": [
    { guests: 1, unitEur: 279 },
    { guests: 2, unitEur: 215 },
    { guests: 3, unitEur: 215 },
    { guests: 4, unitEur: 189 },
    { guests: 5, unitEur: 189 },
    { guests: 6, unitEur: 189 },
    { guests: 7, unitEur: 159 },
    { guests: 8, unitEur: 159 },
  ],
};

export type CommercialPricingResult =
  | {
      status: "quoted";
      commercialProductKey: StudioCommercialProductKey;
      guests: number;
      unitEur: number;
      baseSubtotalEur: number;
      baseLines: ReturnType<typeof buildManualQuote> extends infer R
        ? Exclude<R, { error: string }> extends { lines: infer L } ? L : never
        : never;
      currency: "EUR";
    }
  | { status: "unavailable"; commercialProductKey: StudioCommercialProductKey; guests: number };

export function resolveStudioCommercialPrice(
  key: StudioCommercialProductKey,
  guests: number,
): CommercialPricingResult {
  const tier = CATALOGUE[key]?.find((t) => t.guests === guests);
  if (!tier) return { status: "unavailable", commercialProductKey: key, guests };
  return {
    status: "quoted",
    commercialProductKey: key,
    guests,
    unitEur: tier.unitEur,
    baseSubtotalEur: tier.unitEur * guests,
    baseLines: [{
      bokunCategoryId: "manual:adult",
      label: "Adult (18+)",
      minAge: 18,
      maxAge: 99,
      quantity: guests,
      unitEur: tier.unitEur,
      subtotalEur: tier.unitEur * guests,
    }],
    currency: "EUR",
  };
}

export function resolveStudioCommercialPriceForComposition(
  key: StudioCommercialProductKey,
  composition: TravellerComposition,
): CommercialPricingResult {
  const tiers = Object.fromEntries(
    CATALOGUE[key].map((tier) => [tier.guests, tier.unitEur]),
  ) as ManualPriceTiers;
  const quote = buildManualQuote(composition, tiers);
  const guests = composition.adults + composition.minorAges.length;
  if ("error" in quote || guests < 1 || guests > 8) {
    return { status: "unavailable", commercialProductKey: key, guests };
  }
  return {
    status: "quoted",
    commercialProductKey: key,
    guests,
    unitEur: quote.adultUnitEur,
    baseSubtotalEur: quote.subtotalEur,
    baseLines: quote.lines,
    currency: "EUR",
  };
}
