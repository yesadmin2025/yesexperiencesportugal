// Server-owned Studio V3 commercial pricing catalogue.
//
// Deliberately decoupled from `tour_price_tiers` and from any Signature Tour's
// `priceFrom` anchor. This is the single authority for what the Studio charges.
//
// Pass 1: only 3-guest tier for `studio-v3-private-full-day` is approved.
// Any other guest count → `pricing_unavailable` (guest is routed to designer).
// No borrowed tiers, no invented values.

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

const CATALOGUE: Record<StudioCommercialProductKey, Tier[]> = {
  "studio-v3-private-full-day": [{ guests: 3, unitEur: 145 }],
};

export type CommercialPricingResult =
  | {
      status: "quoted";
      commercialProductKey: StudioCommercialProductKey;
      guests: number;
      unitEur: number;
      baseSubtotalEur: number;
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
    currency: "EUR",
  };
}
