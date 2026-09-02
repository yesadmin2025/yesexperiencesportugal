/**
 * STUDIO V3 — PREFLIGHT ELIGIBILITY RESOLUTION.
 *
 * Combines the EXISTING availability authority (`tour_operating_rules`, read
 * through `getOperatingRule`) with the EXISTING exact-tier authority
 * (`tour_price_tiers` via `resolveStudioStrictPerPaxEur`) and the pure rules
 * in `instantBookableEligibility.ts`.
 *
 * AUTHORITY LIMITATION (documented on purpose): the product has no guide or
 * vehicle capacity registry, so operating rules + exact price tiers are the
 * only authoritative availability facts. Nothing here invents capacity, and
 * the server re-validates every rule again at the payment seam.
 */

import { getOperatingRule } from "@/lib/availability";
import {
  eligibilityRevision,
  judgeTourEligibility,
  type PreflightFacts,
  type TourEligibility,
} from "@/lib/studio-v3/instantBookableEligibility";
import { resolveStudioStrictPerPaxEur, type StudioTiersMap } from "@/lib/studio-v3/studioStrictTier";

export interface EligibilityResult {
  readonly revision: string;
  readonly eligibleTourIds: string[];
  readonly rejections: TourEligibility[];
}

/** Hours between now and 09:00 Lisbon on the requested date. */
export function hoursUntilDate(dateIso: string, now: Date = new Date()): number {
  // DST-safe: resolve the real UTC instant of 09:00 Europe/Lisbon on that
  // calendar day instead of assuming a fixed offset.
  const naiveUtc = Date.parse(`${dateIso}T09:00:00Z`);
  const shown = new Date(naiveUtc).toLocaleString("en-US", { timeZone: "Europe/Lisbon" });
  const offsetMs = new Date(shown).getTime() - naiveUtc;
  return (naiveUtc - offsetMs - now.getTime()) / 3_600_000;
}

export async function resolveEligibleTours(
  tourIds: readonly string[],
  facts: Omit<PreflightFacts, "nowIso" | "hoursUntilDate">,
  tiers: StudioTiersMap,
  now: Date = new Date(),
): Promise<EligibilityResult> {
  const fullFacts: PreflightFacts = {
    ...facts,
    nowIso: now.toISOString(),
    hoursUntilDate: hoursUntilDate(facts.dateExact, now),
  };

  const judged = await Promise.all(
    tourIds.map(async (tourId) => {
      const rule = await getOperatingRule(tourId);
      const hasExactTier =
        resolveStudioStrictPerPaxEur(tourId, Math.round(facts.partyTotal), tiers) !== null;
      return judgeTourEligibility(
        fullFacts,
        {
          tourId,
          weekdays: rule.weekdays,
          blackoutDates: rule.blackoutDates,
          minLeadHours: rule.minLeadHours,
        },
        hasExactTier,
      );
    }),
  );

  return {
    revision: eligibilityRevision(fullFacts),
    eligibleTourIds: judged.filter((j) => j.eligible).map((j) => j.tourId),
    rejections: judged.filter((j) => !j.eligible),
  };
}
