/**
 * TURBO 1 — SHAPE: traveller-facing direct manipulation, PURE.
 *
 * No second router, no second pricing engine, no invented stop. This module
 * only decides WHICH truth-approved moments are in the day and in what order:
 *
 *   - remove: only a genuinely optional moment;
 *   - swap: only for a candidate the current composition already approves;
 *   - undo: reverses the last structural edit the traveller made;
 *   - routed validation may update travel/validation results but can NEVER
 *     change membership or order;
 *   - a truthful `TimingConflict` surfaces as an explicit or deferred
 *     tradeoff, never a silent drop.
 *
 * Real stop / inventory / commercial ids are preserved verbatim on every path.
 */

export type ShapeMoment = {
  /** Real stop id from the resolved composition. Never rewritten. */
  id: string;
  label: string;
  /** True when commercial/operational truth allows removing it. */
  optional: boolean;
  /** Real commercial identity, carried through untouched. */
  commercialId?: string;
  lat?: number | null;
  lng?: number | null;
};

export type ShapeEdit =
  | { kind: "remove"; momentId: string }
  | { kind: "swap"; momentId: string; candidateId: string };

export type ShapeState = {
  moments: ShapeMoment[];
  /** Truth-approved alternatives, keyed by the moment they may replace. */
  approvedSwaps: Readonly<Record<string, readonly ShapeMoment[]>>;
  /** Stack of applied structural edits, newest last. */
  history: Array<{ edit: ShapeEdit; before: ShapeMoment[] }>;
  /** Deferred tradeoffs the traveller has not resolved yet. */
  pendingTradeoffs: Array<{ id: string; summary: string; resolved: boolean }>;
};

export type ShapeResult = {
  state: ShapeState;
  /** Machine reason when nothing changed. Never traveller copy. */
  rejected?: "not-found" | "not-optional" | "candidate-not-approved" | "nothing-to-undo";
};

export function createShapeState(
  moments: readonly ShapeMoment[],
  approvedSwaps: Readonly<Record<string, readonly ShapeMoment[]>> = {},
): ShapeState {
  return {
    moments: moments.map((moment) => ({ ...moment })),
    approvedSwaps,
    history: [],
    pendingTradeoffs: [],
  };
}

/** Remove ONLY a genuinely optional moment. */
export function removeMoment(state: ShapeState, momentId: string): ShapeResult {
  const moment = state.moments.find((candidate) => candidate.id === momentId);
  if (!moment) return { state, rejected: "not-found" };
  if (!moment.optional) return { state, rejected: "not-optional" };
  return {
    state: {
      ...state,
      moments: state.moments.filter((candidate) => candidate.id !== momentId),
      history: [...state.history, { edit: { kind: "remove", momentId }, before: state.moments }],
    },
  };
}

/** Swap ONLY for a candidate the current composition already approves. */
export function swapMoment(
  state: ShapeState,
  momentId: string,
  candidateId: string,
): ShapeResult {
  const index = state.moments.findIndex((candidate) => candidate.id === momentId);
  if (index === -1) return { state, rejected: "not-found" };
  const approved = state.approvedSwaps[momentId] ?? [];
  const candidate = approved.find((option) => option.id === candidateId);
  if (!candidate) return { state, rejected: "candidate-not-approved" };

  const moments = [...state.moments];
  // Position is preserved: a swap changes what happens, not the day's order.
  moments[index] = { ...candidate };
  return {
    state: {
      ...state,
      moments,
      history: [
        ...state.history,
        { edit: { kind: "swap", momentId, candidateId }, before: state.moments },
      ],
    },
  };
}

/** Undo the last structural edit the traveller made. */
export function undoLastEdit(state: ShapeState): ShapeResult {
  const last = state.history[state.history.length - 1];
  if (!last) return { state, rejected: "nothing-to-undo" };
  return {
    state: {
      ...state,
      moments: last.before.map((moment) => ({ ...moment })),
      history: state.history.slice(0, -1),
    },
  };
}

/**
 * Apply an ASYNC routed validation result. It may enrich travel/validation
 * output; it may NEVER change membership or order. Anything it would have
 * dropped becomes an explicit deferred tradeoff instead.
 */
export function applyRoutedValidation(
  state: ShapeState,
  validation: { infeasibleMomentIds?: readonly string[]; summary?: string },
): { state: ShapeState; membershipChanged: false } {
  const infeasible = (validation.infeasibleMomentIds ?? []).filter((id) =>
    state.moments.some((moment) => moment.id === id),
  );
  if (infeasible.length === 0) return { state, membershipChanged: false };

  const existing = new Set(state.pendingTradeoffs.map((tradeoff) => tradeoff.id));
  const added = infeasible
    .filter((id) => !existing.has(`tradeoff:${id}`))
    .map((id) => ({
      id: `tradeoff:${id}`,
      summary:
        validation.summary ??
        `The day is tight around ${state.moments.find((m) => m.id === id)?.label ?? "one moment"}.`,
      resolved: false,
    }));

  return {
    // moments intentionally untouched — order and membership are unchanged.
    state: { ...state, pendingTradeoffs: [...state.pendingTradeoffs, ...added] },
    membershipChanged: false,
  };
}

/** A traveller decision on a surfaced tradeoff. Never silent. */
export function resolveTradeoff(state: ShapeState, tradeoffId: string): ShapeState {
  return {
    ...state,
    pendingTradeoffs: state.pendingTradeoffs.map((tradeoff) =>
      tradeoff.id === tradeoffId ? { ...tradeoff, resolved: true } : tradeoff,
    ),
  };
}

/** Real commercial identities currently in the day, in order. */
export function commercialIdentities(state: ShapeState): string[] {
  return state.moments.map((moment) => moment.commercialId ?? moment.id);
}
