/**
 * Studio V3 — BUILD 1 / Pass 1: canonical TIME domain.
 *
 * This module is pure, data-only and INERT: no production consumer reads it
 * yet. It establishes the vocabulary that later passes will use to make TIME
 * (not stop count, not rhythm) the composition authority.
 *
 * Two hard rules encoded here:
 *
 *  1. DURATION AND RHYTHM ARE INDEPENDENT. Rhythm is pace/depth (how minutes
 *     are spent). Duration is day length (how many minutes exist). A slow
 *     half-day and a slow full-day are both legitimate.
 *
 *  2. THE CLASS LABEL IS A CONVENIENCE, NEVER THE AUTHORITY. Composition must
 *     read `ResolvedTimeBudget.availableExperienceMinutes` (and the
 *     min/max envelope). It must never branch on the class name.
 */

import type { ExperienceDimensionId } from "@/components/studio-v3/livingAtlasTaxonomy";
import type { Rhythm } from "@/components/studio-v3/types";

/* ------------------------------------------------------------------ *
 * Duration classes
 * ------------------------------------------------------------------ */

/**
 * Classes a traveller may ever choose. Deliberately narrow — the internal
 * catalogue-only `extended` class must never leak into a traveller choice.
 */
export type TravellerDurationClass = "half-day" | "medium" | "full-day";

/**
 * Classes the resolver may produce. `extended` is INTERNAL ONLY. It exists
 * because the verified catalogue contains real 570 and 600 minute Signatures
 * (`signatureToursSourceOfTruth.durationMinutes`) that must not be truncated
 * into the public "full-day" label.
 */
export type ResolvedDurationClass = TravellerDurationClass | "extended";

export const TRAVELLER_DURATION_CLASSES: readonly TravellerDurationClass[] = [
  "half-day",
  "medium",
  "full-day",
] as const;

export type DurationEnvelope = {
  /** Canonical target minutes for the class. */
  targetMinutes: number;
  /** Lower bound of a still-truthful day for this class. */
  minMinutes: number;
  /** Upper bound of a still-truthful day for this class. */
  maxMinutes: number;
};

/**
 * Owner-approved envelopes. Approximate by design:
 *   half day  ≈ 4h · medium ≈ 6h · full day ≈ 8–9h
 * `extended` is derived from real catalogue truth (570 / 600 minutes).
 *
 * These are TARGET ENVELOPES, not hard exact values. The authority for any
 * single composition is always `ResolvedTimeBudget.availableExperienceMinutes`.
 */
export const DURATION_ENVELOPES: Readonly<Record<ResolvedDurationClass, DurationEnvelope>> = {
  "half-day": { targetMinutes: 240, minMinutes: 210, maxMinutes: 285 },
  medium: { targetMinutes: 360, minMinutes: 330, maxMinutes: 390 },
  "full-day": { targetMinutes: 510, minMinutes: 480, maxMinutes: 545 },
  extended: { targetMinutes: 570, minMinutes: 546, maxMinutes: 615 },
} as const;

/**
 * Neutral legacy default for sessions that carry neither an explicit
 * traveller choice nor a resolved skeleton. 510 is the catalogue's modal
 * duration — it is a documented neutral one-day default, NOT an inference
 * from rhythm.
 */
export const LEGACY_NEUTRAL_DEFAULT_MINUTES = 510 as const;

export type TimeBudgetSource =
  | "explicit-traveller-choice"
  | "signature-skeleton-truth"
  | "legacy-neutral-default";

export type ResolvedTimeBudget = {
  /** Convenience label for UI/reporting. NEVER the composition authority. */
  durationClass: ResolvedDurationClass;
  /** THE authority. Exact minutes available for experience content. */
  availableExperienceMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  source: TimeBudgetSource;
  /** Present when the budget came from a resolved Signature skeleton. */
  skeletonTourId?: string;
  /** Human-readable provenance note for diagnostics. */
  notes?: string;
};

/* ------------------------------------------------------------------ *
 * Rhythm timing policy — DEPTH ONLY
 * ------------------------------------------------------------------ */

export type RhythmTimingPolicy = {
  /**
   * Applied to dwell. Values above 1 lengthen dwell. Values below 1 may only
   * take effect where an explicit truthful minimum allows it — a verified
   * dwell fact is otherwise the floor.
   */
  dwellMultiplier: number;
  /** Operational slack added per transition between moments. Not travel. */
  perTransitionSlackMin: number;
};

/**
 * Rhythm changes HOW minutes are spent. It never changes how many minutes
 * exist. No entry here encodes a stop count.
 */
export const RHYTHM_TIMING_POLICY: Readonly<Record<Rhythm, RhythmTimingPolicy>> = {
  slow: { dwellMultiplier: 1.25, perTransitionSlackMin: 8 },
  balanced: { dwellMultiplier: 1.0, perTransitionSlackMin: 5 },
  full: { dwellMultiplier: 0.9, perTransitionSlackMin: 3 },
  immersive: { dwellMultiplier: 1.15, perTransitionSlackMin: 6 },
} as const;

/**
 * Fixed INTERNAL experience-day operational slack.
 *
 * Covers only overhead that happens inside the experience day itself:
 * parking at/within experience moments, regrouping the party between
 * moments, supplier handover, and small internal operational variability.
 *
 * It explicitly EXCLUDES origin pickup (hotel -> first moment) and final
 * drop-off (last moment -> hotel); those legs are outside the experience
 * budget entirely and must never be hidden inside this constant.
 */
export const FIXED_OPERATIONAL_SLACK_MIN = 15 as const;

/**
 * Canonical stored `travelToNextMinutes` already carries operational padding,
 * so per-transition slack is halved on those legs to avoid double padding.
 */
export const CANONICAL_TRAVEL_SLACK_FACTOR = 0.5 as const;

/** Conservative fallback when neither side of a leg has coordinates. */
export const CONSERVATIVE_MISSING_GEO_TRAVEL_MIN = 25 as const;

/** Conservative fallback when no dwell fact of any kind exists. */
export const CONSERVATIVE_DEFAULT_DWELL_MIN = 60 as const;

/* ------------------------------------------------------------------ *
 * Timing provenance + result types
 * ------------------------------------------------------------------ */

export type DwellSource =
  | "sot-chapter"
  | "addon-catalog"
  | "inventory"
  | "kind-table"
  | "conservative-default";

export type TravelSource =
  | "sot-travel-to-next"
  | "routed-osrm"
  | "geo-estimate"
  | "conservative-missing-geo";

export type TimingStage = "planning" | "validated";

/** Stable commercial/operational identity carried through every projection. */
export type MomentIdentity = {
  /** Stable inventory / stop id. Never a label. */
  stopId: string;
  /** Signature tour id(s) this moment truthfully belongs to. */
  sourceTourIds: readonly string[];
  /** Existing add-on / commercial id when the moment is a paid insert. */
  commercialId?: string;
};

export type MomentTiming = {
  identity: MomentIdentity;
  /** Dwell after the rhythm policy has been applied (floors respected). */
  dwellMinutes: number;
  /** Dwell before the rhythm policy — the truthful base fact. */
  baseDwellMinutes: number;
  dwellSource: DwellSource;
  /**
   * True only when canonical metadata proves this moment IS a meal. Never
   * inferred from free text in this foundation.
   */
  isMeal: boolean;
  /** Travel to the NEXT experience moment. `null` on the last moment. */
  travelToNextMinutes: number | null;
  travelSource: TravelSource | null;
  /** Slack attributed to the transition that follows this moment. */
  transitionSlackMinutes: number;
};

export type ComposedTiming = {
  stage: TimingStage;
  perMoment: readonly MomentTiming[];
  /** Sum of dwell, INCLUDING any real meal moment. */
  dwellMinutes: number;
  /** Reporting-only subtotal of dwell where `isMeal`. NEVER a second addend. */
  mealMinutes: number;
  /** Sum of travel between consecutive experience moments only. */
  internalTravelMinutes: number;
  /** Fixed day slack + per-transition slack. Distinct from travel. */
  slackMinutes: number;
  /** dwellMinutes + internalTravelMinutes + slackMinutes. */
  totalMinutes: number;
  budget: ResolvedTimeBudget;
  remainingMinutes: number;
  withinEnvelope: boolean;
  /**
   * Structural record that transfer legs outside the experience window are
   * excluded by construction — they are never part of `totalMinutes`.
   */
  excluded: { pickupToFirst: true; lastToDropoff: true };
};

/* ------------------------------------------------------------------ *
 * Conflict / tradeoff schema
 * ------------------------------------------------------------------ */

/**
 * Requested dimensions reuse the canonical Living Atlas taxonomy type rather
 * than inventing a parallel vocabulary.
 */
export type RequestedDimensionStatus = {
  dimension: ExperienceDimensionId;
  status: "represented" | "unfitted";
  /** Stops that already carry the dimension. Empty when unfitted. */
  representedByStopIds: readonly string[];
};

export type UnfittedRequest = {
  dimension: ExperienceDimensionId;
  /** Truthful candidate moments that could satisfy the dimension. */
  candidateStopIds: readonly string[];
  /** Cheapest truthful cost of admitting it: dwell + its travel + slack. */
  minimumExtraMinutesNeeded: number;
};

/**
 * Truthful resolution options. There is deliberately NO `shorten-dwell`
 * option: verified dwell is never compressed to manufacture a fit.
 */
export type TimingConflictOption =
  | { option: "extend-duration"; toClass: ResolvedDurationClass; extraMinutesGained: number }
  | {
      option: "swap-moment";
      dropStopId: string;
      forStopId: string;
      minutesRecovered: number;
      dimensionCost: ExperienceDimensionId | null;
    }
  | { option: "choose-between-anchors"; anchorStopIds: readonly string[] };

export type TimingConflictKind =
  | "time-overflow"
  | "unfittable-required-type"
  | "competing-anchors"
  | "routed-overflow";

export type TimingConflict = {
  kind: TimingConflictKind;
  stage: TimingStage;
  /** Every requested dimension, represented or not. Nothing is dropped. */
  requestedDimensions: readonly RequestedDimensionStatus[];
  unfittedRequests: readonly UnfittedRequest[];
  overflowMinutes: number;
  options: readonly TimingConflictOption[];
};
