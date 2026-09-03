/**
 * STUDIO V3 — DETERMINISTIC DAY REPAIR.
 *
 * Studio is an instant-bookable product designer: it must never hand a
 * traveller a day it cannot sell and then ask THEM to solve the operational
 * problem. When a composed day fails certification, this module repairs the
 * DAY — never the standard the day must meet.
 *
 * It owns NO timing, pricing, commercial or availability rules. Every verdict
 * comes from the caller's existing authorities, injected as predicates:
 *   - `certify`  → the canonical booking gate (Time Authority et al.)
 *   - `isBlocked` → an operational fact about ONE moment (e.g. closed that day)
 *   - `substitute` → the caller's already-verified swap pool
 *
 * Repair order is fixed and bounded, so the same day always repairs the same
 * way:
 *   1. every blocked moment is substituted with a verified alternative, or
 *      removed when no alternative exists;
 *   2. while the day still fails, removable moments are dropped in ascending
 *      `dropPriority` (least-contributing first);
 *   3. the minimum-moment floor is never crossed.
 *
 * Fail closed: if the loop cannot certify the day, it returns the ORIGINAL
 * points untouched and `certified: false`. A half-repaired day is never shown.
 */

export type DayRepairKind = "substituted" | "removed";

export interface DayRepairStep {
  readonly kind: DayRepairKind;
  /** Canonical label of the moment that was repaired. */
  readonly label: string;
  /** Canonical label of the replacement, when one was found. */
  readonly replacementLabel?: string;
  /** Why the repair happened, in operational terms. */
  readonly cause: "blocked" | "over-budget";
}

export interface DayRepairInput<P> {
  readonly points: readonly P[];
  /** Fewest moments a real day may contain. */
  readonly minStops: number;
  /** The caller's canonical booking gate. Pure w.r.t. the given points. */
  readonly certify: (points: readonly P[]) => boolean;
  /** An operational blocker on ONE moment (closed on the date, etc.). */
  readonly isBlocked?: (point: P) => boolean;
  /** May this moment leave the day without breaking the product? */
  readonly isRemovable?: (point: P, index: number) => boolean;
  /** A verified replacement for a blocked moment, or null. */
  readonly substitute?: (point: P) => P | null;
  /** Lower drops first. Defaults to committed minutes (cheapest cut last). */
  readonly dropPriority?: (point: P) => number;
  /** Safety bound on the removal loop. */
  readonly maxRemovals?: number;
}

export interface DayRepairResult<P> {
  readonly points: readonly P[];
  readonly repairs: readonly DayRepairStep[];
  readonly certified: boolean;
}

function labelOf(point: unknown): string {
  return typeof (point as { label?: unknown })?.label === "string"
    ? ((point as { label: string }).label)
    : "";
}

function defaultDropPriority(point: unknown): number {
  const minutes = (point as { durationMinutes?: number | null })?.durationMinutes;
  return typeof minutes === "number" && Number.isFinite(minutes) ? minutes : 0;
}

export function repairDayToBookable<P>(input: DayRepairInput<P>): DayRepairResult<P> {
  const original = [...input.points];
  const repairs: DayRepairStep[] = [];
  const isBlocked = input.isBlocked ?? (() => false);
  const isRemovable = input.isRemovable ?? (() => true);
  const substitute = input.substitute ?? (() => null);
  const dropPriority = input.dropPriority ?? defaultDropPriority;
  const maxRemovals = input.maxRemovals ?? original.length;

  if (original.length === 0) {
    return { points: original, repairs: [], certified: false };
  }

  // 1) Operationally blocked moments — substitute, else remove.
  let working: P[] = [];
  for (const point of original) {
    if (!isBlocked(point)) {
      working.push(point);
      continue;
    }
    const replacement = substitute(point);
    if (replacement) {
      working.push(replacement);
      repairs.push({
        kind: "substituted",
        label: labelOf(point),
        replacementLabel: labelOf(replacement),
        cause: "blocked",
      });
    } else {
      repairs.push({ kind: "removed", label: labelOf(point), cause: "blocked" });
    }
  }

  // A blocked-moment removal may never take the day below the floor.
  if (working.length < input.minStops) {
    return { points: original, repairs: [], certified: false };
  }

  // 2) Still not certifiable → drop the least-contributing removable moments.
  let removals = 0;
  while (!input.certify(working) && removals < maxRemovals) {
    if (working.length <= input.minStops) break;
    let victimIndex = -1;
    let victimScore = Number.POSITIVE_INFINITY;
    working.forEach((point, index) => {
      if (!isRemovable(point, index)) return;
      const score = dropPriority(point);
      if (score < victimScore) {
        victimScore = score;
        victimIndex = index;
      }
    });
    if (victimIndex < 0) break;
    const [victim] = working.splice(victimIndex, 1) as [P];
    repairs.push({ kind: "removed", label: labelOf(victim), cause: "over-budget" });
    removals += 1;
  }

  if (!input.certify(working)) {
    // Fail closed: never show a partially repaired, uncertified day.
    return { points: original, repairs: [], certified: false };
  }

  return { points: working, repairs, certified: true };
}

/**
 * One calm, honest line describing what the day became. Never an apology,
 * never operational jargon, never a price claim.
 */
export function describeDayRepair(
  repairs: readonly DayRepairStep[],
  displayLabel: (label: string) => string = (l) => l,
): string | null {
  if (repairs.length === 0) return null;
  const first = repairs[0]!;
  if (repairs.length === 1) {
    if (first.kind === "substituted" && first.replacementLabel) {
      return `We shaped the day around ${displayLabel(first.replacementLabel)} so it stays comfortable.`;
    }
    return "We eased one moment out so the day stays comfortable.";
  }
  return "We reshaped a couple of moments so the day stays comfortable.";
}
