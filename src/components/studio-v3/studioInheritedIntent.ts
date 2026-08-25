/**
 * Studio V3 — P5 inherited intent (deterministic, state-only).
 *
 * When the traveller already stated a semantic theme in the Feeling phase,
 * the Interests phase must not offer that exact same theme again as a new
 * selectable interest. This is perceived intelligence only: it prunes the
 * grid and shows a one-line acknowledgement.
 *
 * Rules (non-negotiable):
 *   - Only EXACT Feeling → Interest equivalences are inherited. Nothing is
 *     inferred (no local-life from hidden, no gastronomy from wine-food, no
 *     photography, heritage or nature inference).
 *   - Nothing is ever written into `state.interests`. The feeling remains the
 *     authority; downstream curation, pricing and reveal behaviour are
 *     untouched.
 *   - Inherited themes never consume the selectable-interest cap.
 *   - Derived from state on every render, so back-navigation and feeling
 *     changes recompute with no stale state.
 *   - Never derived from AI output.
 */

import { deriveSemanticMemory, type StudioSemanticTheme } from "./studioSemanticMemory";
import type { Feeling, Interest } from "./types";

/** Exact Feeling → Interest equivalences. Intentionally tiny. */
export const INHERITED_FEELING_TO_INTEREST: Readonly<Partial<Record<Feeling, Interest>>> = {
  faith: "faith",
  "hands-on": "hands-on",
  coastal: "coast",
  "wine-food": "wine",
};

/** The semantic theme each inheritance corresponds to (documentation + guard). */
const INHERITED_INTEREST_THEME: Readonly<Record<Interest, StudioSemanticTheme | undefined>> = {
  faith: "theme.faith",
  "hands-on": "activity.hands-on",
  coast: "theme.coast",
  wine: "theme.wine",
  gastronomy: undefined,
  nature: undefined,
  heritage: undefined,
  photography: undefined,
  wellness: undefined,
  "local-life": undefined,
};

/** Short editorial labels for the acknowledgement row. Kept deliberately terse. */
export const INHERITED_INTEREST_LABEL: Readonly<Partial<Record<Interest, string>>> = {
  faith: "Faith",
  "hands-on": "Workshops",
  coast: "Coast",
  wine: "Wine",
};

export interface InheritedIntent {
  /** Interest ids to remove from the selectable grid. */
  readonly interestIds: ReadonlyArray<Interest>;
  /** Short labels, aligned with `interestIds`. */
  readonly labels: ReadonlyArray<string>;
}

const EMPTY: InheritedIntent = { interestIds: [], labels: [] };

/**
 * Inherited intent for the Interests phase. Explicit feeling only — an
 * interest the traveller picked themselves is never "inherited".
 */
export function deriveInheritedIntent(state: {
  readonly feeling?: Feeling | null;
  readonly interests?: ReadonlyArray<Interest> | null;
  readonly rhythm?: string | null;
}): InheritedIntent {
  const feeling = state.feeling ?? null;
  if (!feeling) return EMPTY;

  const interestId = INHERITED_FEELING_TO_INTEREST[feeling];
  if (!interestId) return EMPTY;

  // Guard: the semantic memory must already know this theme from the feeling
  // alone. Keeps this layer and studioSemanticMemory.ts from ever diverging.
  const theme = INHERITED_INTEREST_THEME[interestId];
  if (theme) {
    const known = deriveSemanticMemory({ feeling, interests: [], rhythm: null });
    if (!known.has(theme)) return EMPTY;
  }

  return {
    interestIds: [interestId],
    labels: [INHERITED_INTEREST_LABEL[interestId] ?? interestId],
  };
}

/** The selectable grid, with inherited duplicates removed. Order preserved. */
export function pruneInheritedInterests<T extends { id: Interest }>(
  options: ReadonlyArray<T>,
  inherited: InheritedIntent,
): T[] {
  if (inherited.interestIds.length === 0) return [...options];
  return options.filter((o) => !inherited.interestIds.includes(o.id));
}

/**
 * Selections that count toward the cap. Inherited themes are excluded, so a
 * stale selection carried in from a previous feeling can never eat a slot.
 */
export function countableInterests(
  interests: ReadonlyArray<Interest>,
  inherited: InheritedIntent,
): Interest[] {
  if (inherited.interestIds.length === 0) return [...interests];
  return interests.filter((id) => !inherited.interestIds.includes(id));
}
