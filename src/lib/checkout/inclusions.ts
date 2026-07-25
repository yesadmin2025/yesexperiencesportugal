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
