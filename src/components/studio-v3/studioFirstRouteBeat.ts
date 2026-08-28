/**
 * Pass 2C (correction) — "first route reveal" is acknowledge-once.
 *
 * The first time a route-bearing map beat plays it is cinematic; every later
 * one is a repeat of something the Living Day already shows. A page refresh or
 * a saved-Signature hydration must NOT hand the traveller that first reveal
 * again, so we derive "already seen" from facts the restored state already
 * carries. Presentation only: nothing here is persisted, priced, curated or
 * routed, and no new state field is introduced.
 */
import type { StudioV3Phase, StudioV3State } from "./types";

/** Phases that only exist once a route has been composed and shown. */
const ROUTE_REVEALED_PHASES: ReadonlySet<StudioV3Phase> = new Set<StudioV3Phase>([
  "map",
  "storyboard",
  "confirmation",
  "guestDetails",
  "checkoutSummary",
]);

/**
 * Phases at or after the route-shaping part of the flow. Reaching one of them
 * with real taste inputs means the day has already resolved to a route.
 */
const ROUTE_SHAPING_PHASES: ReadonlySet<StudioV3Phase> = new Set<StudioV3Phase>([
  "rhythm",
  "refinement",
  "logistics",
  "investment",
  "date",
  "pickup",
  "guests",
  "occasion",
  "considerations",
  "language",
]);

/**
 * True when the restored state proves the traveller already reached (or passed)
 * the first route-bearing moment. Conservative by design: a brand-new session,
 * or a partial one without enough taste inputs to resolve a route, returns
 * false so it still earns exactly one cinematic reveal.
 */
export function hasSeenFirstRouteBeat(state: Pick<StudioV3State, "phase" | "feeling" | "companions" | "interests">): boolean {
  if (ROUTE_REVEALED_PHASES.has(state.phase)) return true;
  if (!ROUTE_SHAPING_PHASES.has(state.phase)) return false;
  // Enough real taste inputs for the existing resolver to produce a route
  // (rhythm may still be the presentation-only tentative balanced fallback).
  return Boolean(state.feeling && state.companions && (state.interests?.length ?? 0) > 0);
}
