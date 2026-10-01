/**
 * resolveClientIncludedItems — single-source-of-truth for the
 * `includedItems` payload the Signature/Tailor flows send to the
 * `create-signature-checkout` edge function.
 *
 * Priority (SoT-first):
 *   0. If `tour.id` resolves to a verified Source of Truth entry
 *      (see `signatureToursSourceOfTruth`), return its `included`.
 *   1. Otherwise, `VIATOR_META[tourId].included` verbatim.
 *   2. Otherwise, `tour.included` (blueprint-level fallback).
 *   3. Otherwise `undefined` so the edge function's own fallback chain
 *      (Bókun inclusions → nothing) kicks in.
 *
 * The server priority is then:  Bókun → clientIncluded → nothing.
 */

import { getTourContent } from "@/lib/tourContent";

export interface ViatorMetaLike {
  included?: readonly string[];
}

export interface TourLike {
  id?: string;
  included?: readonly string[];
}

export function resolveClientIncludedItems(
  meta: ViatorMetaLike | null | undefined,
  tour: TourLike,
): string[] | undefined {
  if (tour?.id) {
    const content = getTourContent(tour.id);
    if (content.source === "sot" && content.included.length > 0) {
      return [...content.included];
    }
  }
  if (meta && Array.isArray(meta.included) && meta.included.length > 0) {
    return [...meta.included];
  }
  if (Array.isArray(tour.included) && tour.included.length > 0) {
    return [...tour.included];
  }
  return undefined;
}

export interface CheckoutInclusions {
  included: string[];
  notIncluded: string[];
}

/** Full verified Included / Not included lists shown to guests before they pay. Never shortened, never invented. */
export function resolveCheckoutInclusions(
  meta: ViatorMetaLike | null | undefined,
  tour: TourLike,
): CheckoutInclusions {
  const content = tour?.id ? getTourContent(tour.id) : null;
  const included = (resolveClientIncludedItems(meta, tour) ?? []).map((s) => s.trim()).filter(Boolean);
  const notIncluded = (content?.notIncluded ?? []).map((s) => s.trim()).filter(Boolean);
  return { included, notIncluded };
}

export interface TailorInclusionAdjustments {
  /** Guest removed the included lunch (credit applied). */
  lunchRemoved?: boolean;
  /** Winery visits actually in the tailored day, when the tour lets guests change the count. */
  wineryCount?: number;
}

/** Tailor flow: the verified lists, adjusted to match what the guest actually kept. */
export function applyTailorInclusionAdjustments(
  base: CheckoutInclusions,
  adj: TailorInclusionAdjustments,
): CheckoutInclusions {
  let included = [...base.included];
  const notIncluded = [...base.notIncluded];
  if (adj.lunchRemoved) {
    const removed = included.filter((s) => /\blunch\b/i.test(s));
    included = included.filter((s) => !/\blunch\b/i.test(s));
    if (removed.length > 0 && !notIncluded.some((s) => /\blunch\b/i.test(s))) notIncluded.unshift("Lunch (removed from this day)");
  }
  if (typeof adj.wineryCount === "number" && adj.wineryCount > 0) {
    const label = `${adj.wineryCount} winery visit${adj.wineryCount === 1 ? "" : "s"}`;
    let replaced = false;
    included = included.flatMap((s) => {
      if (!/winer(y|ies)/i.test(s)) return [s];
      if (replaced) return [];
      replaced = true;
      return [label];
    });
  }
  return { included, notIncluded };
}
