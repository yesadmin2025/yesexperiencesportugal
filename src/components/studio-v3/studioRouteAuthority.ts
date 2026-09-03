import type { DwellSource } from "@/lib/studio-v3/timeDomain";
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
import { projectAuthoredAnchorStops } from "./authoredAnchorProjection";
import { attachStructuralDwell } from "@/lib/studio-v3/attachStructuralDwell";

import type { StudioV3State } from "./types";

/** Exact input shape `resolveStudioV3Route` consumes. */
export type StudioRouteShapingInput = Parameters<typeof resolveStudioV3Route>[0];

/** A single itinerary moment as every guest-facing surface consumes it. */
export interface StudioRouteStop {
  readonly label: string;
  readonly story: string;
  /** Structural identity when the source knew it. Never invented here. */
  readonly inventoryStopId?: string | null;
  readonly blueprintStopId?: string | null;
  /** Stable media identity when the source knew it. Never invented here. */
  readonly image?: string | null;
  readonly focal?: string | null;
  /** Operational geography known upstream. Never invented here. */
  readonly lat?: number | null;
  readonly lng?: number | null;
  /** Structural dwell truth known upstream. Never inferred here. */
  readonly durationMinutes?: number | null;
  readonly durationSource?: DwellSource | null;
}

/** The optional identity fields a route point may carry through the chain. */
interface RoutePointLike {
  label: string;
  story?: string | null;
  inventoryStopId?: string | null;
  blueprintStopId?: string | null;
  image?: string | null;
  focal?: string | null;
  lat?: number | null;
  lng?: number | null;
  durationMinutes?: number | null;
  durationSource?: DwellSource | null;
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
  > &
    Partial<Pick<StudioV3State, "questionHistory" | "eligibleTourIds">>,
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
    questionHistory: state.questionHistory ?? [],
    seed: state.rerollCount ?? 0,
    eligibleTourIds: state.eligibleTourIds ?? null,
  };
}

/** Resolve the route from the complete projection. */
export function resolveStudioRouteFromState(state: StudioV3State): ResolvedStudioV3Route {
  return resolveStudioV3Route(studioRouteShapingInput(state));
}

/**
 * The non-negotiable itinerary authority chain:
 *
 *   editedRoutePoints  >  committedRoutePoints (the day actually SHOWN)
 *   >  FULL composed route  >  compact legacy route
 *   >  catalog Signature stops (final fallback only)
 *
 * `tourId` is deliberately absent from the first links: it anchors
 * pricing, region and source truth, and can never replace custom moments.
 *
 * PASS 4: `committedRoutePoints` is the snapshot taken once, on the first
 * reveal of Your Day. It sits BELOW traveller edits and ABOVE any fresh
 * resolver output, so logistics facts (date/pickup/party) can never cause a
 * second composition to replace the itinerary the traveller was shown.
 */
export function resolveAuthoritativeRouteStops(args: {
  editedRoutePoints?: ReadonlyArray<RoutePointLike> | null;
  committedRoutePoints?: ReadonlyArray<RoutePointLike> | null;
  resolved?: {
    composedRoutePoints?: ReadonlyArray<RoutePointLike>;
    routePoints?: ReadonlyArray<RoutePointLike>;
  } | null;
  catalogStops?: ReadonlyArray<RoutePointLike> | null;
  /**
   * P0-A — when the anchor is known, the RAW catalogue fallback is projected
   * down to the anchor's canonical pool cardinality before it can become an
   * itinerary. Omit it and the fallback stays byte-identical to today.
   */
  anchorTourId?: string | null;
}): StudioRouteStop[] {

  // Identity passes through UNTOUCHED — a moment that knew its structural or
  // media identity must never lose it by travelling through the chain.
  const normalize = (points: ReadonlyArray<RoutePointLike>): StudioRouteStop[] =>
    points.map((p) => ({
      label: p.label,
      story: p.story ?? "",
      inventoryStopId: p.inventoryStopId ?? null,
      blueprintStopId: p.blueprintStopId ?? null,
      image: p.image ?? null,
      focal: p.focal ?? null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      durationMinutes: p.durationMinutes ?? null,
      durationSource: p.durationSource ?? null,
    }));

  const edited = args.editedRoutePoints ?? null;
  if (edited && edited.length > 0) return normalize(edited);

  const committed = args.committedRoutePoints ?? null;
  if (committed && committed.length > 0) return normalize(committed);

  const composed = args.resolved?.composedRoutePoints ?? null;
  if (composed && composed.length > 0) return normalize(composed);

  const compact = args.resolved?.routePoints ?? null;
  if (compact && compact.length > 0) return normalize(compact);

  const catalog = args.catalogStops ?? null;
  if (catalog && catalog.length > 0) {
    // The raw catalogue fallback carries no dwell truth of its own, which
    // made every day built from it `not-evaluable` at the booking gate.
    // Recover ONLY the verified inventory dwell those exact stops already
    // publish; unresolved moments stay untouched and keep failing closed.
    return attachStructuralDwell(
      args.anchorTourId ?? null,
      normalize(projectAuthoredAnchorStops(args.anchorTourId ?? null, catalog).points),
    );
  }


  return [];
}


/**
 * Is the EXACT current route provably the untouched canonical anchor?
 *
 * This is the only question the commercial layer may ask before granting the
 * legacy "no blueprint" authored-fallback exception. It fails closed: it
 * returns TRUE only when the current authoritative route is provably the
 * unchanged canonical Signature route.
 *
 * FALSE whenever:
 *  - the traveller manually edited the route (`editedRoutePoints`), OR
 *  - Living Atlas explicitly reports `liveResolution === "composed"`, OR
 *  - the authoritative route differs in membership or order from the catalog
 *    Signature stops (this covers automatic legacy composition, replacement,
 *    addition and removal while `editedRoutePoints` is still null), OR
 *  - equality simply cannot be proven (thin/unknown data).
 *
 * Structural ids are preferred whenever BOTH sides genuinely carry them.
 * Where legacy catalog stops have no structural ids, exact normalized
 * label/order equality proves equality WITH THE CANONICAL ANCHOR ONLY. It is
 * not commercial identity inference and must never be reused to infer a
 * price action.
 */
export function isProvablyUntouchedCanonicalAnchor(args: {
  editedRoutePoints?: ReadonlyArray<RoutePointLike> | null;
  /**
   * PASS 4 — the frozen day actually shown. A snapshot is NOT a manual edit,
   * so it does not disqualify on its own; it simply becomes the current route
   * that must still prove exact equality with the canonical anchor. A
   * committed composed/different route therefore fails closed.
   */
  committedRoutePoints?: ReadonlyArray<RoutePointLike> | null;
  resolved?: {
    composedRoutePoints?: ReadonlyArray<RoutePointLike>;
    routePoints?: ReadonlyArray<RoutePointLike>;
    livingAtlasLive?: { liveResolution?: string | null } | null;
    skeletonTourKey?: string | null;
  } | null;
  catalogStops?: ReadonlyArray<RoutePointLike> | null;
  anchorTourId?: string | null;
}): boolean {
  // 1. Any manual edit disqualifies immediately.
  if ((args.editedRoutePoints?.length ?? 0) > 0) return false;

  // 2. PASS 4.1 — a NONEMPTY committed snapshot is the frozen itinerary the
  // traveller was shown, so it is the current authority. A resolver run AFTER
  // the freeze can no longer overrule it; its "composed" signal is only
  // sovereign while no snapshot exists.
  const hasCommitted = (args.committedRoutePoints?.length ?? 0) > 0;
  if (!hasCommitted && args.resolved?.livingAtlasLive?.liveResolution === "composed") return false;


  // 3. Prove equality with the real catalog Signature stops.
  //    P0-A: the canonical anchor is the PROJECTED catalogue (surplus pool
  //    candidates removed) — the same day the fallback actually emits — not
  //    the raw candidate list, which is never sellable.
  const rawCatalog = args.catalogStops ?? null;
  const catalog = rawCatalog
    ? projectAuthoredAnchorStops(
        args.anchorTourId ?? args.resolved?.skeletonTourKey ?? null,
        rawCatalog,
      ).points
    : null;
  if (!catalog || catalog.length === 0) return false;

  const current = resolveAuthoritativeRouteStops({
    editedRoutePoints: null,
    committedRoutePoints: args.committedRoutePoints ?? null,
    resolved: args.resolved ?? null,
    catalogStops: catalog,
    anchorTourId: args.anchorTourId ?? args.resolved?.skeletonTourKey ?? null,
  });

  if (current.length === 0) return false;
  if (current.length !== catalog.length) return false;

  for (let i = 0; i < current.length; i += 1) {
    const a = current[i]!;
    const b = catalog[i]!;
    const aStructural = a.inventoryStopId ?? a.blueprintStopId ?? null;
    const bStructural = b.inventoryStopId ?? b.blueprintStopId ?? null;
    if (aStructural && bStructural) {
      // Both sides genuinely have identity — structural equality is required.
      if (a.inventoryStopId && b.inventoryStopId) {
        if (a.inventoryStopId !== b.inventoryStopId) return false;
        continue;
      }
      if (a.blueprintStopId && b.blueprintStopId) {
        if (a.blueprintStopId !== b.blueprintStopId) return false;
        continue;
      }
      // Mixed identity kinds — equality cannot be proven structurally.
      return false;
    }
    // Legacy boundary: canonical-anchor equality by exact normalized label.
    const aLabel = normalizeCanonicalRouteLabel(a.label);
    const bLabel = normalizeCanonicalRouteLabel(b.label);
    if (!aLabel || !bLabel) return false;
    if (aLabel !== bLabel) return false;
  }

  return true;
}

/**
 * Canonical INTERNAL label normalization, used only to prove equality with the
 * untouched canonical anchor. Never a commercial identity.
 */
function normalizeCanonicalRouteLabel(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

