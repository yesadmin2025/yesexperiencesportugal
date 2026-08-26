/**
 * studioDelegation — P10 premium delegation mode ("Let YES design the rest").
 *
 * The Studio used to offer a per-question "Let YES decide" shortcut on
 * Feeling, Interests and Rhythm. Being asked three times to delegate reads as
 * a survey escape hatch, not as concierge trust. P10 replaces that with ONE
 * coherent delegation moment: once the traveller has personally answered
 * FEELING and WHO, they may hand the remaining *taste* layer to YES.
 *
 * Hard rules:
 *   - eligibility requires BOTH feeling and companions — we never offer to
 *     design a day before the traveller has told us how it should feel and
 *     who it is for.
 *   - explicit guest choices ALWAYS beat delegated defaults. Interests the
 *     traveller picked themselves are preserved verbatim.
 *   - only the deterministic taxonomy primitives in `letYesDecide.ts` decide
 *     anything. No LLM, no randomness, no invented ids. Wine stays governed
 *     by the existing wine-intent rule inside `decideInterests`.
 *   - OPERATIONAL FACTS ARE NEVER DELEGATED: date/dateExact/dateMode, pickup,
 *     guests/adults/minorAges, private-event flag, considerations, language.
 *     This module copies them through untouched, by construction.
 *   - the adaptive Refinement question is SKIPPED, never fabricated:
 *     `refinement` is left exactly as it was (usually null).
 *
 * Pure and side-effect free: `applyDelegation` returns a new state object and
 * never mutates its input, so the same explicit state always produces the
 * same delegated day (and re-applying after a Back-edit recomputes from the
 * new explicit answers rather than keeping a stale value).
 */

import { decideInterests, decideRhythm, type DecidedForMeKey } from "./letYesDecide";
import type { StudioV3State } from "./types";

/** The single delegation mode. Additive, defaults to null. */
export const DELEGATION_MODE = "yes-designs" as const;
export type DelegationMode = typeof DELEGATION_MODE;

/** Taste dimensions that may be delegated. Nothing operational is listed. */
export type DelegatableDimension = Extract<DecidedForMeKey, "interests" | "rhythm">;

/** The traveller must personally answer Feeling and Who first. */
export function isDelegationEligible(
  state: Pick<StudioV3State, "feeling" | "companions">,
): boolean {
  return Boolean(state.feeling) && Boolean(state.companions);
}

/** True once the traveller has handed the taste layer to YES. */
export function isDelegationActive(
  state: Pick<StudioV3State, "delegationMode">,
): boolean {
  return state.delegationMode === DELEGATION_MODE;
}

/**
 * Where the one concierge affordance may appear. Interests is the primary
 * moment; Rhythm shows it once more for travellers who picked their own
 * tastes first. It is never offered on Feeling, Who, Refinement, Logistics
 * or Your Day, and never twice once delegation is active.
 */
export function isDelegationOffered(
  state: Pick<StudioV3State, "feeling" | "companions" | "delegationMode" | "rhythm">,
  phase: "interests" | "rhythm",
): boolean {
  if (!isDelegationEligible(state)) return false;
  if (isDelegationActive(state)) return false;
  if (phase === "rhythm") return state.rhythm == null;
  return true;
}

export interface DelegationResult {
  /** New state with the remaining taste layer completed. */
  readonly state: StudioV3State;
  /** Exactly the dimensions YES decided in this call. */
  readonly delegated: DelegatableDimension[];
}

/**
 * Complete the remaining taste layer deterministically.
 *
 * Interests are inferred only when the traveller has none; Rhythm only when
 * unset — and always from the forward state that already contains the
 * (explicit or inferred) interests, so pacing matches the real tastes.
 */
export function applyDelegation(state: StudioV3State): DelegationResult {
  if (!isDelegationEligible(state)) return { state, delegated: [] };

  const delegated: DelegatableDimension[] = [];

  const explicitInterests = state.interests ?? [];
  const interests =
    explicitInterests.length > 0 ? explicitInterests : (delegated.push("interests"), decideInterests(state));

  const rhythm = state.rhythm ?? (delegated.push("rhythm"), decideRhythm({ ...state, interests }));

  return {
    state: {
      ...state,
      interests,
      rhythm,
      // Refinement is skipped, never fabricated.
      refinement: state.refinement,
      delegationMode: DELEGATION_MODE,
      decidedForMe: [...new Set([...(state.decidedForMe ?? []), ...delegated])],
    },
    delegated,
  };
}

/**
 * Clear values YES decided so a Back-edit of an explicit answer cannot leave
 * a stale delegated taste behind. Explicit choices are untouched: only the
 * dimensions recorded in `decidedForMe` are released.
 */
export function releaseDelegatedTaste(state: StudioV3State): StudioV3State {
  if (!isDelegationActive(state) && (state.decidedForMe ?? []).length === 0) return state;
  const decided = new Set(state.decidedForMe ?? []);
  if (!decided.has("interests") && !decided.has("rhythm")) {
    return { ...state, delegationMode: null };
  }
  return {
    ...state,
    interests: decided.has("interests") ? [] : state.interests,
    rhythm: decided.has("rhythm") ? null : state.rhythm,
    decidedForMe: (state.decidedForMe ?? []).filter(
      (k) => k !== "interests" && k !== "rhythm",
    ),
    delegationMode: null,
  };
}

/** One short, human acknowledgement. Never a second Director's Read. */
export function delegationAcknowledgement(
  delegated: ReadonlyArray<DelegatableDimension>,
): string {
  if (delegated.length === 0) return "We have enough to shape it.";
  if (delegated.length === 1 && delegated[0] === "rhythm") {
    return "Your tastes stay. We'll set the pace.";
  }
  return "Leave the rest with us.";
}
