// Slice C — client-safe mirror of the Studio commercial identity constant.
// The server authority lives in
// `supabase/functions/_shared/studioCommercialPricing.ts` — this file is a
// literal mirror so the browser can guard against identity leakage without
// importing server modules.

export const STUDIO_COMMERCIAL_PRODUCT_KEY = "studio-v3-private-full-day" as const;
export type StudioCommercialProductKey = typeof STUDIO_COMMERCIAL_PRODUCT_KEY;

export function isStudioCommercialProductKey(value: unknown): value is StudioCommercialProductKey {
  return value === STUDIO_COMMERCIAL_PRODUCT_KEY;
}

/**
 * Runtime guard — throws when a caller has accidentally swapped Studio's
 * commercial identity to a Signature-tour mapping during
 * filtering/replacement. Keeps Slice C's promise: itinerary changes MUST NOT
 * change pricing/availability provenance.
 */
export function assertStudioCommercialIdentity(key: unknown): asserts key is StudioCommercialProductKey {
  if (!isStudioCommercialProductKey(key)) {
    throw new Error(
      `[studio-identity-guard] expected commercialProductKey="${STUDIO_COMMERCIAL_PRODUCT_KEY}", got ${JSON.stringify(key)}`,
    );
  }
}
