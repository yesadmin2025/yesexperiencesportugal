// Slice C — Per-stop traveller suitability registry.
//
// Additive, keyed by stop label (case-insensitive, exact match). Empty by
// default. See travellerSuitability.ts for field semantics. Never infer
// restrictions from marketing text.

import type { TravellerSuitability } from "@/lib/pricing/travellerSuitability";

export const STUDIO_STOP_SUITABILITY: Readonly<Record<string, TravellerSuitability>> = Object.freeze({});

export function getStopSuitability(label: string | null | undefined): TravellerSuitability | undefined {
  if (!label) return undefined;
  return STUDIO_STOP_SUITABILITY[label.toLowerCase()];
}
