/**
 * Studio V3 — BUILD 1 / Pass 1: duration budget resolver.
 *
 * Pure. No DB, no network, no side effects. INERT — no production consumer
 * reads it yet.
 *
 * HARD RULE: rhythm is never inspected. Day length and pace are independent
 * concepts, and this module resolves length only.
 *
 * Hierarchy (first match wins):
 *   A. explicit traveller duration class (or explicit minutes)
 *   B. resolved skeleton's exact canonical `sotDurationMinutes(tourId)`
 *   C. neutral legacy one-day default (510) when neither exists
 */

import { sotDurationMinutes } from "@/data/signatureToursSourceOfTruth";
import {
  DURATION_ENVELOPES,
  LEGACY_NEUTRAL_DEFAULT_MINUTES,
  type ResolvedDurationClass,
  type ResolvedTimeBudget,
  type TravellerDurationClass,
} from "@/lib/studio-v3/timeDomain";

export type ResolveTimeBudgetInput = {
  /** Explicit traveller choice. Highest authority when present. */
  experienceDurationClass?: TravellerDurationClass | null;
  /** Explicit minutes, e.g. a future precise traveller control. */
  explicitMinutes?: number | null;
  /** Resolved Signature skeleton, when one already exists. */
  skeletonTourId?: string | null;
  /**
   * Test/inventory seam: canonical minutes for the skeleton. Defaults to
   * `sotDurationMinutes(skeletonTourId)`.
   */
  skeletonDurationMinutes?: number | null;
};

const CLASS_ORDER: readonly ResolvedDurationClass[] = [
  "half-day",
  "medium",
  "full-day",
  "extended",
] as const;

/**
 * Nearest sensible class for an exact minutes value. Classification is a
 * label only — it never rewrites the minutes it describes.
 */
export function classifyMinutes(minutes: number): ResolvedDurationClass {
  for (const cls of CLASS_ORDER) {
    const envelope = DURATION_ENVELOPES[cls];
    if (minutes >= envelope.minMinutes && minutes <= envelope.maxMinutes) return cls;
  }
  // Outside every envelope: fall back to the closest target.
  let best: ResolvedDurationClass = CLASS_ORDER[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const cls of CLASS_ORDER) {
    const distance = Math.abs(DURATION_ENVELOPES[cls].targetMinutes - minutes);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = cls;
    }
  }
  return best;
}

/**
 * Widen a class envelope so it truthfully CONTAINS an exact catalogue value.
 * A verified 570 or 600 minute Signature stays 570 / 600 — never truncated.
 */
function envelopeContaining(cls: ResolvedDurationClass, minutes: number) {
  const envelope = DURATION_ENVELOPES[cls];
  return {
    minMinutes: Math.min(envelope.minMinutes, minutes),
    maxMinutes: Math.max(envelope.maxMinutes, minutes),
  };
}

export function resolveTimeBudget(input: ResolveTimeBudgetInput = {}): ResolvedTimeBudget {
  // ---- A. Explicit traveller choice -------------------------------------
  // An explicit Half Day stays Half Day even when a long skeleton exists.
  // Later composition must raise a conflict rather than silently expanding
  // the traveller's own request.
  if (typeof input.explicitMinutes === "number" && input.explicitMinutes > 0) {
    const minutes = Math.round(input.explicitMinutes);
    const durationClass = classifyMinutes(minutes);
    return {
      durationClass,
      availableExperienceMinutes: minutes,
      ...envelopeContaining(durationClass, minutes),
      source: "explicit-traveller-choice",
      notes: "Explicit traveller minutes.",
    };
  }

  if (input.experienceDurationClass) {
    const durationClass: ResolvedDurationClass = input.experienceDurationClass;
    const envelope = DURATION_ENVELOPES[durationClass];
    return {
      durationClass,
      availableExperienceMinutes: envelope.targetMinutes,
      minMinutes: envelope.minMinutes,
      maxMinutes: envelope.maxMinutes,
      source: "explicit-traveller-choice",
      notes: "Explicit traveller duration class.",
    };
  }

  // ---- B. Signature skeleton truth --------------------------------------
  const skeletonTourId = input.skeletonTourId ?? null;
  const skeletonMinutes =
    typeof input.skeletonDurationMinutes === "number" && input.skeletonDurationMinutes > 0
      ? input.skeletonDurationMinutes
      : skeletonTourId
        ? (sotDurationMinutes(skeletonTourId) ?? null)
        : null;

  if (typeof skeletonMinutes === "number" && skeletonMinutes > 0) {
    // OWNER RULE: a legacy 570/600-minute Signature duration is historical
    // product metadata, never permission for a Studio day to exceed the 9h
    // door-to-door ceiling. Public Signature pages are untouched; only the
    // live Studio budget is clamped (opt out explicitly for catalogue reads).
    const clamped =
      input.allowLegacyExtendedDuration === true
        ? skeletonMinutes
        : Math.min(skeletonMinutes, STUDIO_DOOR_TO_DOOR_HARD_MAX_MIN);
    const durationClass = classifyMinutes(clamped);
    return {
      durationClass,
      // Exact canonical value — never rounded to the class target.
      availableExperienceMinutes: clamped,
      ...envelopeContaining(durationClass, clamped),
      source: "signature-skeleton-truth",
      ...(skeletonTourId ? { skeletonTourId } : {}),
      notes:
        clamped === skeletonMinutes
          ? "Canonical Signature source-of-truth duration."
          : "Canonical Signature duration clamped to the Studio 9h door-to-door ceiling.",
    };
  }

  // ---- C. Neutral legacy default ----------------------------------------
  const durationClass = classifyMinutes(LEGACY_NEUTRAL_DEFAULT_MINUTES);
  const envelope = DURATION_ENVELOPES[durationClass];
  return {
    durationClass,
    availableExperienceMinutes: LEGACY_NEUTRAL_DEFAULT_MINUTES,
    minMinutes: envelope.minMinutes,
    maxMinutes: envelope.maxMinutes,
    source: "legacy-neutral-default",
    notes: "No explicit choice and no skeleton duration — neutral one-day default.",
  };
}
