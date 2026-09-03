/**
 * highSignalConflict — the LIVE-flow guard for explicit priorities.
 *
 * `pickPrimaryTourWithFit` already reports which explicitly-selected
 * high-signal interests (faith / hands-on / wine) NO currently-eligible
 * Signature can truthfully satisfy together. This module turns that
 * structural fact into the one decision Studio has to take:
 *
 *   a partially-matching day must NEVER be committed or revealed as YOUR DAY.
 *
 * When a conflict exists the traveller stays INSIDE Studio and is returned to
 * Interests with a precise message naming the priorities that cannot be
 * combined. Nothing is silently deleted — the traveller chooses. There is no
 * curator / lead-sheet exit on this path: Studio is instant-bookable only.
 *
 * Pure and side-effect free so both the live flow and the tests read the
 * same authority.
 */

import { pickPrimaryTourWithFit } from "./curation";
import { SIGNATURE_DIMENSION_AFFINITY } from "./livingAtlasTaxonomy";
import type { Interest, StudioV3State } from "./types";
import { exactDirectorObligations } from "@/lib/studio-v3/exactDirectorObligations";

/** Customer-facing name for each high-signal interest. */
const PRIORITY_LABEL: Partial<Record<Interest, string>> = {
  faith: "sacred heritage",
  "hands-on": "hands-on workshops",
  wine: "wine",
};

export function highSignalPriorityLabel(interest: Interest): string {
  return PRIORITY_LABEL[interest] ?? interest.replace(/-/g, " ");
}

export interface HighSignalConflict {
  /** Explicit priorities no eligible day can satisfy alongside the others. */
  readonly unsatisfied: readonly Interest[];
  /** Precise, non-generic copy naming those priorities. */
  readonly message: string;
}

/**
 * Resolve the conflict for the CURRENT answers, or `null` when every explicit
 * high-signal priority is truthfully covered (or the state cannot be scored
 * yet — taste questions are still unanswered).
 */
export function resolveHighSignalConflict(state: StudioV3State): HighSignalConflict | null {
  if (!state.feeling || !state.companions) return null;
  const interests = state.interests ?? [];
  if (interests.length === 0) return null;

  const exact = exactDirectorObligations(state.questionHistory ?? []);
  if (exact.preferredSignatureId) {
    const affinity = SIGNATURE_DIMENSION_AFFINITY[exact.preferredSignatureId];
    const incompatible = interests.filter(
      (interest) =>
        (interest === "faith" && affinity["faith-reflection"] === 0) ||
        (interest === "hands-on" && affinity["hands-on-traditions"] === 0) ||
        (interest === "wine" && affinity["wine-table"] === 0),
    );
    if (incompatible.length > 0) {
      const priorities = [...new Set([...incompatible, ...interests.filter((i) => i === "hands-on")])];
      const names = priorities.map(highSignalPriorityLabel);
      const list =
        names.length === 1
          ? names[0]
          : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
      return {
        unsatisfied: incompatible,
        message: `No single private day available on your date can genuinely deliver ${list} together. Choose which matters most and Studio will design an instantly bookable day around it.`,
      };
    }
  }

  const { unsatisfiedHighSignal } = pickPrimaryTourWithFit(
    state.feeling,
    state.companions,
    interests,
    state.pickup,
    state.destinationIntent ?? null,
    0,
    state.rhythm ?? null,
    null,
    state.eligibleTourIds ?? null,
  );

  if (unsatisfiedHighSignal.length === 0) return null;

  const names = unsatisfiedHighSignal.map(highSignalPriorityLabel);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  return {
    unsatisfied: unsatisfiedHighSignal,
    message:
      names.length === 1
        ? `No private day available on your date can genuinely deliver ${list}. Choose a different priority — or keep it and remove the others — and we will design around it.`
        : `No single private day available on your date can genuinely deliver ${list} together. Tell us which one matters most and we will design the day around it.`,
  };
}
