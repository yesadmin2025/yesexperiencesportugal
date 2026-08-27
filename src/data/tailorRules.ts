/**
 * Tailor this Signature — authorized actions, per Signature.
 *
 * BINDING AUTHORITY: "YES Canonical Signature Implementation Bible v1.1
 * FINAL", section "Tailor this Signature — final rule" of each chapter.
 *
 * Only the actions declared here may be offered. Anything else routes the
 * guest to the Studio or the Travel Designer (see `src/lib/tailored-policy.ts`).
 *
 * Pricing effects come from `src/config/pricing.ts` — this file never
 * hardcodes amounts, it only declares which actions exist.
 */

import { TAILOR_BLUEPRINTS } from "./tailorBlueprints";
import {
  TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR,
  TAILOR_LUNCH_SUPPLEMENT_EUR,
  lunchRemovalDiscountEur,
} from "@/config/pricing";

export type TailorRules = {
  /** Remove a principal stop: −5% per stop (universal). */
  allowRemoveStop: boolean;
  /**
   * Offer "Add lunch" (+€35 pp). `false` when lunch is already included
   * or replaced by another meal component (picnic, winery lunch).
   *
   * CANONICAL PRODUCT EXCEPTION (not a pricing change): Roman Talha
   * ("roman-heritage-alentejo") and Wild Beaches & Picnic already include
   * a meal in the canonical product, so "Add lunch" stays suppressed.
   */
  allowAddLunch: boolean;
  /** Why the lunch upsell is hidden — shown to no-one, used by tests/QA. */
  lunchExcludedReason?: string;
  /**
   * Offer "Remove included lunch" (−€15 pp, flat). Only for Signatures
   * where lunch is included AND the operation can run the day without it.
   * Never expressed as a stop removal or a negative supplement.
   */
  allowRemoveLunch?: boolean;
  /** Guest-facing note shown next to the included-lunch row. */
  lunchIncludedNote?: string;
  /** Extra wineries beyond the included baseline (Setúbal & Arrábida only). */
  wineries?: {
    /** Wineries included in the base price. */
    included: number;
    /** Hard maximum the operation can run. */
    max: number;
    /** Per-person supplement for each winery beyond `included`. */
    supplementEur: number;
    /**
     * Adding the winery at this index (1-based count, e.g. 4) is only
     * possible when the guest also removes another stop.
     */
    requiresRemovalFrom?: number;
  };
};

const REMOVE_ONLY: TailorRules = {
  allowRemoveStop: true,
  allowAddLunch: false,
};

const REMOVE_OR_LUNCH: TailorRules = {
  allowRemoveStop: true,
  allowAddLunch: true,
};

export const TAILOR_RULES: Record<string, TailorRules> = {
  "troia-comporta": REMOVE_OR_LUNCH,
  "southwest-vicentine-coast": REMOVE_OR_LUNCH,
  "arrabida-boat": REMOVE_OR_LUNCH,
  "sintra-cascais": REMOVE_OR_LUNCH,
  "azeitao-cheese": REMOVE_OR_LUNCH,
  "tomar-coimbra": REMOVE_OR_LUNCH,
  "evora-alentejo": REMOVE_OR_LUNCH,
  "fatima-nazare-obidos": REMOVE_OR_LUNCH,
  "tiles-workshop": REMOVE_OR_LUNCH,

  "roman-heritage-alentejo": {
    ...REMOVE_ONLY,
    lunchExcludedReason: "A traditional lunch at the winery is already included.",
  },
  "wild-beaches-picnic": {
    ...REMOVE_ONLY,
    lunchExcludedReason: "The picnic is already the lunch component.",
  },

  "arrabida-wine-allinclusive": {
    allowRemoveStop: true,
    allowAddLunch: false,
    lunchExcludedReason: "Lunch is already included in this Signature.",
    allowRemoveLunch: true,
    lunchIncludedNote:
      "A seated lunch is included in this Signature. Remove it and the day continues without the table.",
    wineries: {
      included: 2,
      max: 4,
      supplementEur: TAILOR_EXTRA_WINERY_SUPPLEMENT_EUR,
      requiresRemovalFrom: 4,
    },
  },
};

/** Rules for a Signature; defaults to remove-only when unknown. */
export function tailorRules(tourId: string): TailorRules {
  return TAILOR_RULES[tourId] ?? REMOVE_ONLY;
}

/** Flat per-person supplement for the "Add lunch" action, if allowed. */
export function lunchSupplementEur(tourId: string): number {
  return tailorRules(tourId).allowAddLunch ? TAILOR_LUNCH_SUPPLEMENT_EUR : 0;
}

/** May the guest remove the included lunch on this Signature? */
export function allowsLunchRemoval(tourId: string): boolean {
  return tailorRules(tourId).allowRemoveLunch === true;
}

/**
 * Flat per-person credit for removing the included lunch.
 * Always 0 unless the Signature is lunch-removal eligible.
 */
export function lunchRemovalEur(tourId: string, lunchRemoved: boolean): number {
  if (!allowsLunchRemoval(tourId)) return 0;
  return lunchRemovalDiscountEur(tourId, lunchRemoved);
}

/**
 * Per-person winery supplement for a requested total winery count.
 * Returns 0 for Signatures without a winery ladder or at/below baseline.
 */
export function winerySupplementEur(tourId: string, wineriesSelected: number): number {
  const w = tailorRules(tourId).wineries;
  if (!w) return 0;
  const capped = Math.min(Math.max(wineriesSelected, w.included), w.max);
  return (capped - w.included) * w.supplementEur;
}

export type WineryGateResult =
  | { allowed: true }
  | { allowed: false; code: "max-reached" | "needs-removal"; message: string };

/**
 * Can the guest move to `wineriesSelected` wineries right now?
 * The 4th winery on Setúbal & Arrábida requires removing another stop.
 */
export function canSelectWineries(
  tourId: string,
  wineriesSelected: number,
  stopsRemoved: number,
): WineryGateResult {
  const w = tailorRules(tourId).wineries;
  if (!w) return { allowed: true };
  if (wineriesSelected > w.max) {
    return {
      allowed: false,
      code: "max-reached",
      message: `Maximum ${w.max} wineries in a single day.`,
    };
  }
  if (
    w.requiresRemovalFrom !== undefined &&
    wineriesSelected >= w.requiresRemovalFrom &&
    stopsRemoved < 1
  ) {
    return {
      allowed: false,
      code: "needs-removal",
      message: "Remove another stop to make room for a fourth winery.",
    };
  }
  return { allowed: true };
}

/**
 * Total flat per-person supplements for a Tailor configuration.
 * Feed the result into `tailorFinalPerPax`.
 */
export function tailorSupplementsEur(
  tourId: string,
  opts: { lunchAdded?: boolean; wineriesSelected?: number },
): number {
  const lunch = opts.lunchAdded ? lunchSupplementEur(tourId) : 0;
  const wine =
    opts.wineriesSelected === undefined ? 0 : winerySupplementEur(tourId, opts.wineriesSelected);
  return lunch + wine;
}

/**
 * The included-lunch stop governed by the dedicated "Remove included lunch"
 * action (−€15 pp flat). Owner-approved meaning: this removal is NOT a
 * principal-stop removal, so the same lunch must never earn the −5% stop
 * reduction as well. Skipping this stop and toggling the dedicated action
 * are two representations of ONE decision.
 *
 * Mirrored server-side in `supabase/functions/_shared/pricing.ts`
 * (`TAILOR_DEDICATED_LUNCH_STOP_ID`) — parity is enforced by a unit test.
 */
export const TAILOR_DEDICATED_LUNCH_STOP_ID: Readonly<Record<string, string>> = {
  "arrabida-wine-allinclusive": "lunch-azeitao",
};

/** Stop id whose removal is priced by the dedicated lunch credit, if any. */
export function dedicatedLunchStopId(tourId: string): string | null {
  if (!allowsLunchRemoval(tourId)) return null;
  return TAILOR_DEDICATED_LUNCH_STOP_ID[tourId] ?? null;
}

/**
 * AUTHORITATIVE per-Signature set of Tailor core stop ids that may earn the
 * −5% principal-removal reduction.
 *
 * NOT derived from `!lock`. Eligibility comes from the explicit pricing
 * classification in `src/data/tailorStopPricing.ts`:
 *   - locked stops (product-defining, mandatory transfers…) are NOT eligible
 *   - descriptive / free viewpoints / drive-bys are removable for TIME but
 *     are NOT eligible (skipping them never changes the price)
 *   - the dedicated included-lunch stop is NOT eligible (flat −€15 credit)
 *   - stops still awaiting owner classification keep the pre-classification
 *     behaviour (eligible), and are reported by
 *     `tailorStopsPendingOwnerReview()`
 * Mirrored server-side in `supabase/functions/_shared/pricing.ts`
 * (`TAILOR_PRINCIPAL_ELIGIBLE_STOP_IDS`); parity is enforced by a unit test.
 */
export function principalEligibleStopIds(tourId: string): ReadonlySet<string> {
  const bp = TAILOR_BLUEPRINTS[tourId];
  const dedicatedCreditStopId = dedicatedLunchStopId(tourId);
  const ids = new Set<string>();
  for (const stop of bp?.core ?? []) {
    const pricing = classifyTailorCoreStop(tourId, stop.id, { dedicatedCreditStopId });
    if (!pricing || !classEarnsPrincipalCredit(pricing)) continue;
    ids.add(stop.id);
  }
  return ids;
}

/**
 * Count of principal-stop removals eligible for the −5% ladder.
 * Counts UNIQUE, whitelisted ids only: invented ids, duplicates, locked
 * anchors and descriptive/free stops never earn a reduction. Excludes the
 * dedicated included-lunch stop, which is priced solely by the flat −€15 pp
 * credit. Capped by any declared minimum viable composition.
 */
export function principalRemovalCount(tourId: string, skippedStopIds: Iterable<string>): number {
  const eligible = principalEligibleStopIds(tourId);
  const seen = new Set<string>();
  for (const id of skippedStopIds) {
    if (typeof id !== "string" || !eligible.has(id)) continue;
    seen.add(id);
  }
  return Math.min(seen.size, maxRemovalsForMinViable(tourId));
}

