/**
 * Below-baseline choice reductions in Tailor.
 *
 * Guests may reduce a Signature's choice pool (wineries, palace…) down to
 * zero. No owner-approved price credit exists for those reductions, so the
 * day cannot be sold instantly at the old base price — it must be sent to
 * the team for confirmation. Mirrored server-side by
 * `serverChoiceBelowBaseline` in supabase/functions/_shared/pricing.ts.
 */
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";
import { tailorRules } from "@/data/tailorRules";

/** Number of choice-pool moments the base price includes for this Signature. */
export function choiceBaselineCount(tourId: string): number | null {
  const winery = tailorRules(tourId).wineries;
  if (winery) return winery.included;
  const bp = TAILOR_BLUEPRINTS[tourId];
  return bp?.choice ? bp.choice.pickMin : null;
}

/**
 * True when the composed day holds fewer choice-pool moments than the
 * base price includes. Winery ladders compare against `included`, never
 * the relaxed selectable minimum.
 */
export function choiceBelowBaseline(
  tourId: string,
  input: { choiceSelectedCount: number; wineriesSelected: number },
): boolean {
  const baseline = choiceBaselineCount(tourId);
  if (baseline == null) return false;
  const count = tailorRules(tourId).wineries ? input.wineriesSelected : input.choiceSelectedCount;
  return count < baseline;
}
