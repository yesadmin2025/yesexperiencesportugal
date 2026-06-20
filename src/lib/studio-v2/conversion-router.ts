/**
 * Studio v2 — Conversion path router.
 *
 * Pure, deterministic decision: at the moment of conversion, should the
 * traveller see Instant Booking, Refine With a Local Host, or both as
 * equal cinematic choices?
 *
 * The rule preserves emotional momentum:
 *   - simple, high-confidence days → instant embedded checkout
 *   - complex / luxury / edge cases → human refinement (premium, not "support")
 *   - mid-confidence → present both as equal options, no primary/secondary
 *
 * Inputs come from the traveller profile and the final real itinerary
 * (post-edit). No invented signals — every input already exists in the
 * v2 engine output.
 */

import type { TravelerProfile } from "./profile";

export type ConversionPath = "instant" | "refine" | "both";

export interface ItinerarySummary {
  /** Number of real stops on the final edited day. */
  stopCount: number;
  /** True if every stop has source_tour_keys (i.e. comes from real tours). */
  allReal: boolean;
  /** Total driving minutes (haversine-derived). */
  driveMinutes: number;
  /** True if any feasibility warning is currently active. */
  hasWarning: boolean;
}

export interface RouteDecision {
  path: ConversionPath;
  /** Confidence score (0..1) that informed the decision. */
  confidence: number;
  /** Human-readable reasons, kept for debug/analytics only. */
  reasons: string[];
}

/**
 * Average confidence across the profile's per-signal confidence map.
 * Returns 0.5 when nothing has been recorded — neutral, not pessimistic.
 */
function averageConfidence(profile: TravelerProfile): number {
  const vals = Object.values(profile.confidence ?? {});
  if (vals.length === 0) return 0.5;
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.max(0, Math.min(1, sum / vals.length));
}

export function decideConversionPath(
  profile: TravelerProfile,
  itinerary: ItinerarySummary,
): RouteDecision {
  const reasons: string[] = [];
  const confidence = averageConfidence(profile);

  const group = profile.group;
  const totalGuests = group ? group.adults + group.teens + group.children : 0;

  // Hard refine triggers — always hand to a human.
  const isUltra = group?.luxuryTier === "ultra";
  const isCorporate = group?.occasion === "corporate";
  const isLargeGroup = totalGuests > 8;
  const hasHardConstraints =
    (profile.ops?.hardConstraints?.length ?? 0) > 0 ||
    (profile.ops?.accessibility?.length ?? 0) > 0 ||
    group?.mobility === "wheelchair";
  const isMultiDay = profile.duration === "multi-day";

  if (isUltra) reasons.push("ultra tier");
  if (isCorporate) reasons.push("corporate occasion");
  if (isLargeGroup) reasons.push(`group of ${totalGuests}`);
  if (hasHardConstraints) reasons.push("hard constraints / accessibility");
  if (isMultiDay) reasons.push("multi-day");
  if (!itinerary.allReal) reasons.push("not every stop is real-sourced");
  if (itinerary.hasWarning) reasons.push("feasibility warning active");

  const mustRefine =
    isUltra ||
    isCorporate ||
    isLargeGroup ||
    hasHardConstraints ||
    isMultiDay ||
    !itinerary.allReal;

  if (mustRefine) {
    return { path: "refine", confidence, reasons };
  }

  // Instant booking only when everything is calm and clean.
  const instantReady =
    confidence >= 0.65 &&
    itinerary.stopCount >= 3 &&
    itinerary.stopCount <= 8 &&
    !itinerary.hasWarning &&
    itinerary.driveMinutes <= 240;

  if (instantReady) {
    reasons.push("clean simple day, high confidence");
    return { path: "instant", confidence, reasons };
  }

  reasons.push("mid-confidence — present both options equally");
  return { path: "both", confidence, reasons };
}
