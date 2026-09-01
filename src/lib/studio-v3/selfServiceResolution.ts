/**
 * SELF-SERVICE RESOLUTION TRUTH — one rule, one place.
 *
 * A composed Living Atlas day may be sold unattended only when nothing
 * structural or operational is missing. `complete` always qualifies.
 *
 * `partial` qualifies ONLY when:
 *   • every anchor obligation (required types) was met,
 *   • there is no timing tradeoff/conflict,
 *   • the composer did not itself ask for curator review,
 *   • and the day is a real multi-moment day.
 *
 * In that narrow case "partial" means only this: a DISCRETIONARY taste
 * dimension found no verified moment inside the anchor's own commercially
 * containable inventory. The day is still entirely truthful and priceable —
 * it simply does not claim to express that taste. Nothing is invented, no
 * moment is substituted and no obligation is waived.
 *
 * `tradeoff`, `impossible`, `invalid` and empty compositions never qualify.
 */
export type SelfServiceCompositionInput = {
  status: "complete" | "partial" | "tradeoff" | "impossible" | "invalid" | (string & {});
  moments: readonly unknown[];
  missingRequiredTypes?: readonly unknown[];
  conflict?: unknown;
  requiresCuratorReview?: boolean;
} | null;

/** Minimum moments a partially-expressive day must still contain to be sold. */
export const SELF_SERVICE_MIN_MOMENTS = 3;

export function isSelfServiceComposable(composition: SelfServiceCompositionInput): boolean {
  if (!composition || composition.moments.length === 0) return false;
  if (composition.status === "complete") return true;
  if (composition.status !== "partial") return false;
  return (
    (composition.missingRequiredTypes?.length ?? 0) === 0 &&
    composition.conflict == null &&
    composition.requiresCuratorReview !== true &&
    composition.moments.length >= SELF_SERVICE_MIN_MOMENTS
  );
}
