// Slice C — Stop-level suitability filter with same-skeleton replacement.
//
// Pure helper. Removes stops whose registered suitability metadata cannot
// serve the current traveller requirements, and (when a skeleton pool is
// provided) fills each removed slot with the first compatible candidate
// from that SAME skeleton tour. Never invents stops. Never crosses tours.
// Studio commercial identity is not touched here.

import {
  checkTravellerSuitability,
  type SuitabilityReason,
  type SuitabilityRequirements,
} from "@/lib/pricing/travellerSuitability";
import { getStopSuitability } from "@/data/studioStopSuitability";

export interface StopLike {
  label: string;
  story?: string;
}

export interface StopFilterOutcome<S extends StopLike> {
  /** Final stop list, in original order, replacements substituted in place. */
  stops: S[];
  removed: Array<{ index: number; label: string; reasons: SuitabilityReason[] }>;
  replacements: Array<{ index: number; from: string; to: string }>;
  /** Slots that had no compatible replacement in the skeleton pool and were dropped. */
  dropped: Array<{ index: number; label: string }>;
}

function isCompatible(label: string, req: SuitabilityRequirements): boolean {
  const meta = getStopSuitability(label);
  return checkTravellerSuitability(meta, req).ok;
}

export function filterStopsBySuitability<S extends StopLike>(
  input: readonly S[],
  requirements: SuitabilityRequirements,
  skeletonPool: readonly S[] = [],
): StopFilterOutcome<S> {
  const removed: StopFilterOutcome<S>["removed"] = [];
  const replacements: StopFilterOutcome<S>["replacements"] = [];
  const dropped: StopFilterOutcome<S>["dropped"] = [];
  // Track labels currently placed in the output plus originally-present incompatible
  // labels, so a swap can never land on a duplicate.
  const used = new Set(input.map((s) => s.label.toLowerCase()));

  const out: S[] = [];
  input.forEach((stop, index) => {
    const check = checkTravellerSuitability(getStopSuitability(stop.label), requirements);
    if (check.ok) {
      out.push(stop);
      return;
    }
    removed.push({ index, label: stop.label, reasons: check.reasons });

    const swap = skeletonPool.find(
      (cand) =>
        !used.has(cand.label.toLowerCase()) &&
        isCompatible(cand.label, requirements),
    );
    if (swap) {
      used.add(swap.label.toLowerCase());
      replacements.push({ index, from: stop.label, to: swap.label });
      out.push(swap);
    } else {
      dropped.push({ index, label: stop.label });
    }
  });

  // Invariants — defensive, cheap. If any of these trip we have a logic bug
  // upstream; failing loudly is better than shipping a broken itinerary.
  const outLabels = out.map((s) => s.label.toLowerCase());
  if (new Set(outLabels).size !== outLabels.length) {
    throw new Error("[stop-suitability] duplicate replacement stop produced");
  }
  for (const s of out) {
    if (!isCompatible(s.label, requirements)) {
      throw new Error(`[stop-suitability] returned incompatible stop: ${s.label}`);
    }
  }

  return { stops: out, removed, replacements, dropped };
}

/**
 * Post-replacement itinerary validity check. Returns null on success or a
 * short reason string on failure. Callers force the existing "unsupported"
 * gate (no quote, no Stripe) when this returns non-null.
 */
export function validateItineraryAfterReplacement<S extends StopLike>(
  outcome: StopFilterOutcome<S>,
  requirements: SuitabilityRequirements,
): "empty" | "duplicate" | "incompatible" | null {
  if (outcome.stops.length < 1) return "empty";
  const labels = outcome.stops.map((s) => s.label.toLowerCase());
  if (new Set(labels).size !== labels.length) return "duplicate";
  for (const s of outcome.stops) {
    if (!isCompatible(s.label, requirements)) return "incompatible";
  }
  return null;
}
