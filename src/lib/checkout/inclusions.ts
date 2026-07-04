/**
 * resolveClientIncludedItems — single-source-of-truth for the
 * `includedItems` payload the Signature/Tailor flows send to the
 * `create-signature-checkout` edge function.
 *
 * Contract (must match `supabase/functions/create-signature-checkout/index.ts`):
 *   1. If `VIATOR_META[tourId].included` has entries → use those verbatim
 *      (this is the truth-passed operator list).
 *   2. Otherwise fall back to `tour.included` (blueprint-level list).
 *   3. Otherwise `undefined` so the edge function's own fallback chain
 *      (Bókun inclusions → nothing) kicks in.
 *
 * The server priority is then:  Bókun → clientIncluded → nothing.
 * Together this guarantees checkout descriptions never invent copy.
 */

export interface ViatorMetaLike {
  included?: readonly string[];
}

export interface TourLike {
  included?: readonly string[];
}

export function resolveClientIncludedItems(
  meta: ViatorMetaLike | null | undefined,
  tour: TourLike,
): string[] | undefined {
  if (meta && Array.isArray(meta.included) && meta.included.length > 0) {
    return [...meta.included];
  }
  if (Array.isArray(tour.included) && tour.included.length > 0) {
    return [...tour.included];
  }
  return undefined;
}
