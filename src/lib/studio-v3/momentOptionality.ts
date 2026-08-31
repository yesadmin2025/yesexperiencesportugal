/**
 * FINAL CLOSURE — moment optionality authority.
 *
 * Whether a moment may be removed from YOUR DAY is a COMMERCIAL/OPERATIONAL
 * fact, never a count heuristic and never inferred from a label. The single
 * truth source is the existing Tailor blueprint for the anchor Signature:
 *
 *   • `core[]`      — what the anchor price always buys → protected;
 *   • `choice`      — "pick N from the pool" → removable only while the kept
 *                     picks stay at or above `pickMin`;
 *   • `optional[]`  — genuine extensions → removable;
 *   • a moment the traveller added from the approved pool (absent from the
 *     blueprint) → removable, otherwise undo could never restore the day;
 *   • any moment carrying a `lock` → never removable, whatever bucket.
 *
 * FAIL CLOSED: no blueprint, or no anchor tour, means optionality cannot be
 * proven and NOTHING is removable.
 *
 * Pure, no React, no fetch.
 */

import { getTailorBlueprint } from "@/data/tailorBlueprints";

export type MomentOptionalityReason =
  | "unproven"
  | "locked"
  | "core-anchor"
  | "choice-minimum"
  | "choice-extra"
  | "optional-extension"
  | "traveller-added"
  | "minimum-day";

export interface MomentOptionality {
  readonly label: string;
  readonly removable: boolean;
  readonly reason: MomentOptionalityReason;
}

const norm = (value: string): string => value.trim().toLowerCase();

/**
 * Resolve, per moment and in order, whether removal is commercially and
 * operationally supported right now.
 */
export function resolveMomentOptionality(input: {
  /** Anchor Signature id. Null/unknown ⇒ nothing removable. */
  tourId: string | null | undefined;
  labels: ReadonlyArray<string>;
  /** Existing route floor. The day may never fall below it. */
  minStops: number;
}): MomentOptionality[] {
  const labels = input.labels ?? [];
  const blueprint = input.tourId ? getTailorBlueprint(input.tourId) : null;

  if (!blueprint) {
    return labels.map((label) => ({ label, removable: false, reason: "unproven" as const }));
  }

  const coreByLabel = new Map(blueprint.core.map((stop) => [norm(stop.label), stop]));
  const choiceByLabel = new Map(
    (blueprint.choice?.options ?? []).map((stop) => [norm(stop.label), stop]),
  );
  const optionalByLabel = new Map(blueprint.optional.map((stop) => [norm(stop.label), stop]));

  const pickMin = blueprint.choice?.pickMin ?? 0;
  const keptChoicePicks = labels.filter((label) => choiceByLabel.has(norm(label))).length;

  const aboveFloor = labels.length > Math.max(1, input.minStops);

  return labels.map((label) => {
    const key = norm(label);
    const matched = coreByLabel.get(key) ?? choiceByLabel.get(key) ?? optionalByLabel.get(key);

    if (matched?.lock) return { label, removable: false, reason: "locked" as const };
    if (coreByLabel.has(key)) return { label, removable: false, reason: "core-anchor" as const };

    if (choiceByLabel.has(key)) {
      if (keptChoicePicks <= pickMin) {
        return { label, removable: false, reason: "choice-minimum" as const };
      }
      return {
        label,
        removable: aboveFloor,
        reason: aboveFloor ? ("choice-extra" as const) : ("minimum-day" as const),
      };
    }

    const reason: MomentOptionalityReason = optionalByLabel.has(key)
      ? "optional-extension"
      : "traveller-added";

    return {
      label,
      removable: aboveFloor,
      reason: aboveFloor ? reason : ("minimum-day" as const),
    };
  });
}

/**
 * May the traveller be offered ONE more moment right now?
 *
 * No count ceiling and no new arithmetic: the answer comes from the existing
 * timing truth (remaining minutes in the day, already computed by
 * `summarizeDay`) and the existing itinerary validation state. Anything
 * unresolved fails closed.
 */
export function canOfferAdditionalMoment(input: {
  /** Approved replacement/extension candidates from the existing pool. */
  poolSize: number;
  /** `summarizeDay(...).remainingMin`. Null while unresolved/loading. */
  remainingMinutes: number | null | undefined;
  /** Existing `validateItinerary` status for the current day. */
  validationStatus: "approved" | "review" | "reject" | "incomplete";
}): boolean {
  if (input.poolSize <= 0) return false;
  if (input.remainingMinutes === null || input.remainingMinutes === undefined) return false;
  if (input.remainingMinutes <= 0) return false;
  return input.validationStatus === "approved";
}
