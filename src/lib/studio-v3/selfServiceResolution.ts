/**
 * SELF-SERVICE RESOLUTION TRUTH — one rule, one place.
 *
 * A composed Living Atlas day may be sold unattended only when nothing
 * structural or operational is missing. `complete` always qualifies.
 *
 * `partial` qualifies ONLY when:
 *   • every anchor obligation (required types) was met,
 *   • every selected taste dimension has verified coverage,
 *   • there is no timing tradeoff/conflict,
 *   • the composer did not itself ask for curator review,
 *   • and the day is a real multi-moment day.
 *
 * A selected taste is never discretionary at the final booking seam. If the
 * verified inventory cannot express it, Studio must keep the traveller in the
 * adjustment flow instead of selling a day that contradicts their choices.
 *
 * `tradeoff`, `impossible`, `invalid` and empty compositions never qualify.
 */
export type SelfServiceCompositionInput = {
  status: "complete" | "partial" | "tradeoff" | "impossible" | "invalid" | (string & {});
  moments: readonly unknown[];
  missingDimensions?: readonly unknown[];
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
    (composition.missingDimensions?.length ?? 0) === 0 &&
    (composition.missingRequiredTypes?.length ?? 0) === 0 &&
    composition.conflict == null &&
    composition.requiresCuratorReview !== true &&
    composition.moments.length >= SELF_SERVICE_MIN_MOMENTS
  );
}
