/**
 * studioRouteAuthority — ONE projection of route-shaping state, and ONE
 * authority chain for the traveller's itinerary.
 *
 * P8 hardening. Two problems this module removes:
 *
 *  1. Every downstream surface used to hand-build its own object for
 *     `resolveStudioV3Route`, and each one forgot a different field
 *     (`dateExact` here, `refinement` there, the reshape seed everywhere).
 *     The day the traveller saw could therefore differ from the day the
 *     snapshot, CurtainRise or the resolved journey computed.
 *  2. The composed route is the product; the Signature (`tourId`) is only the
 *     technical pricing / geographic / operational anchor. A resolved or
 *     changed `tourId` must NEVER overwrite a composed or edited route.
 *
 * Pure, side-effect free. Pricing-only fields (guests, adults, minorAges,
 * add-ons) and PII (names, email, phone, pickup address) stay out by design.
 */

import { resolveStudioV3Route, type ResolvedStudioV3Route } from "./curation";
import type { StudioV3State } from "./types";

/** Exact input shape `resolveStudioV3Route` consumes. */
export type StudioRouteShapingInput = Parameters<typeof resolveStudioV3Route>[0];

/** A single itinerary moment as every guest-facing surface consumes it. */
export interface StudioRouteStop {
  readonly label: string;
  readonly story: string;
}

/**
 * Project ALL route-shaping state — and nothing else — into the resolver.
 * Every call site must use this so no surface silently loses a signal.
 */
export function studioRouteShapingInput(
  state: Pick<
    StudioV3State,
    | "feeling"
    | "companions"
    | "rhythm"
    | "interests"
    | "pickup"
    | "occasion"
    | "considerations"
    | "investment"
    | "destinationIntent"
    | "dateExact"
    | "refinement"
    | "rerollCount"
  >,
): StudioRouteShapingInput {
  return {
    feeling: state.feeling,
    companions: state.companions,
    rhythm: state.rhythm,
    interests: state.interests ?? [],
    pickup: state.pickup,
    occasion: state.occasion ?? null,
    considerations: state.considerations ?? [],
    investment: state.investment ?? null,
    destinationIntent: state.destinationIntent ?? null,
    dateExact: state.dateExact ?? null,
    refinement: state.refinement ?? null,
    seed: state.rerollCount ?? 0,
  };
}

/** Resolve the route from the complete projection. */
export function resolveStudioRouteFromState(state: StudioV3State): ResolvedStudioV3Route {
  return resolveStudioV3Route(studioRouteShapingInput(state));
}

/**
 * The non-negotiable itinerary authority chain:
 *
 *   editedRoutePoints  >  FULL composed route  >  compact legacy route
 *   >  catalog Signature stops (final fallback only)
 *
 * `tourId` is deliberately absent from the first three links: it anchors
 * pricing, region and source truth, and can never replace custom moments.
 */
export function resolveAuthoritativeRouteStops(args: {
  editedRoutePoints?: ReadonlyArray<{ label: string; story?: string | null }> | null;
  resolved?: {
    composedRoutePoints?: ReadonlyArray<{ label: string; story?: string | null }>;
    routePoints?: ReadonlyArray<{ label: string; story?: string | null }>;
  } | null;
  catalogStops?: ReadonlyArray<{ label: string; story?: string | null }> | null;
}): StudioRouteStop[] {
  const normalize = (
    points: ReadonlyArray<{ label: string; story?: string | null }>,
  ): StudioRouteStop[] => points.map((p) => ({ label: p.label, story: p.story ?? "" }));

  const edited = args.editedRoutePoints ?? null;
  if (edited && edited.length > 0) return normalize(edited);

  const composed = args.resolved?.composedRoutePoints ?? null;
  if (composed && composed.length > 0) return normalize(composed);

  const compact = args.resolved?.routePoints ?? null;
  if (compact && compact.length > 0) return normalize(compact);

  const catalog = args.catalogStops ?? null;
  if (catalog && catalog.length > 0) return normalize(catalog);

  return [];
}
