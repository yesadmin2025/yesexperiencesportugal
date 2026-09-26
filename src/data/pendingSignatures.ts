/**
 * Signatures whose venues are not yet verified by the owner. They are
 * reserve-as-designed only: no route map, no Studio/Living Atlas matching,
 * no Tailor edits and no cross-Signature add-ons until the real venues are
 * confirmed. Remove an id here once its venues are verified.
 */
export const PENDING_VENUE_SIGNATURE_IDS: ReadonlySet<string> = new Set([
  "p23-artisan-pottery-cork",
]);

export function isPendingVenueSignature(id: string | null | undefined): boolean {
  return !!id && PENDING_VENUE_SIGNATURE_IDS.has(id);
}
