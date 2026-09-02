/**
 * STUDIO V3 — INSTANT-BOOKABLE PREFLIGHT ELIGIBILITY (pure rules).
 *
 * The Studio is an instant-bookable product builder: it must never spend a
 * traveller's time designing a day it cannot actually sell. Before any taste
 * question is asked, three practical facts are collected — exact date,
 * supported pickup area and traveller composition — and this module answers
 * ONE question from them:
 *
 *   which Signature product ids are currently sellable self-service?
 *
 * This module owns NO new commercial truth. It composes the EXISTING
 * authorities:
 *   - operating rules (weekdays / blackout dates / minimum lead) — the same
 *     rows the server checkout gate reads;
 *   - the self-service party ceiling (`selfServiceParty.ts`);
 *   - the exact price-tier authority (a party with no approved exact tier has
 *     no price, therefore no instant booking).
 *
 * Nothing here invents capacity: there is no guide/vehicle registry in the
 * product, so operating rules + exact tiers are the only authoritative
 * availability facts. That limitation is deliberate and documented.
 */

import type { Pickup } from "@/components/studio-v3/types";
import { SELF_SERVICE_MAX_PARTY } from "@/lib/studio-v3/selfServiceParty";
import { pickupOriginCoord } from "@/components/studio-v3/curation";

/** Pickup areas the Studio may sell instantly: proven operational origin. */
export function isSupportedStudioPickup(pickup: Pickup | null | undefined): boolean {
  if (!pickup) return false;
  // `other` has no proven coordinate and no approved exact-address geocoder,
  // so it can never be certified door-to-door. It is not offered in Studio.
  return pickupOriginCoord(pickup) !== null;
}

/** Party sizes the existing Stripe/server contract can actually complete. */
export function isSupportedStudioParty(total: number | null | undefined): boolean {
  if (typeof total !== "number" || !Number.isFinite(total)) return false;
  const n = Math.round(total);
  return n >= 1 && n <= SELF_SERVICE_MAX_PARTY;
}

export interface OperatingRuleFact {
  readonly tourId: string;
  /** 0=Sunday … 6=Saturday. Empty means "unknown" → treated as all days. */
  readonly weekdays: readonly number[];
  readonly blackoutDates: readonly string[];
  readonly minLeadHours: number;
}

export interface PreflightFacts {
  /** ISO yyyy-mm-dd, already validated against the Studio 3-day minimum. */
  readonly dateExact: string;
  readonly pickup: Pickup | null;
  readonly partyTotal: number;
  /** Lisbon "today" ISO plus elapsed hours, supplied by the caller. */
  readonly nowIso: string;
  readonly hoursUntilDate: number;
}

export type EligibilityRejection =
  | "unsupported-pickup"
  | "unsupported-party"
  | "closed-weekday"
  | "blackout-date"
  | "insufficient-lead"
  | "no-exact-price";

export interface TourEligibility {
  readonly tourId: string;
  readonly eligible: boolean;
  readonly reason: EligibilityRejection | null;
}

function weekdayOf(dateIso: string): number {
  return new Date(`${dateIso}T12:00:00Z`).getUTCDay();
}

/**
 * Judge ONE product against the preflight facts. Pure; the caller supplies the
 * operating-rule row and whether an exact tier exists for this exact party.
 */
export function judgeTourEligibility(
  facts: PreflightFacts,
  rule: OperatingRuleFact,
  hasExactTier: boolean,
): TourEligibility {
  const fail = (reason: EligibilityRejection): TourEligibility => ({
    tourId: rule.tourId,
    eligible: false,
    reason,
  });
  if (!isSupportedStudioPickup(facts.pickup)) return fail("unsupported-pickup");
  if (!isSupportedStudioParty(facts.partyTotal)) return fail("unsupported-party");
  if (rule.weekdays.length > 0 && !rule.weekdays.includes(weekdayOf(facts.dateExact))) {
    return fail("closed-weekday");
  }
  if (rule.blackoutDates.includes(facts.dateExact)) return fail("blackout-date");
  if (facts.hoursUntilDate < rule.minLeadHours) return fail("insufficient-lead");
  if (!hasExactTier) return fail("no-exact-price");
  return { tourId: rule.tourId, eligible: true, reason: null };
}

/** Stable token for the exact facts an eligibility set was resolved from. */
export function eligibilityRevision(facts: PreflightFacts): string {
  return [facts.dateExact, facts.pickup ?? "none", Math.round(facts.partyTotal)].join("|");
}

/**
 * Has the traveller changed a practical fact since the eligible set was
 * resolved? A stale set must send them back to the preflight, never forward
 * into a checkout the server would refuse.
 */
export function isEligibilityStale(
  revision: string | null | undefined,
  facts: PreflightFacts,
): boolean {
  if (!revision) return true;
  return revision !== eligibilityRevision(facts);
}
