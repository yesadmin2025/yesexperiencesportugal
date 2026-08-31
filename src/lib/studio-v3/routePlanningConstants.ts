/**
 * Studio V3 — BUILD 1 / Pass 2: shared route-planning constants.
 *
 * Single source of truth for the geo planning estimate used by BOTH
 * `livingAtlasRoutePlanner.ts` (route geometry) and
 * `lib/studio-v3/timingProjection.ts` (composition planning timing).
 *
 * Values are UNCHANGED from the previous private duplicates in those two
 * modules. Centralizing them removes the silent-drift risk documented in
 * Pass 1: a retune of the route planner can no longer leave planning
 * estimates quietly disagreeing with routed reality.
 */

/** Straight-line km → estimated road km. */
export const ROAD_DISTANCE_FACTOR = 1.24;

/** Average planning speed in km/h for regional private transfers. */
export const PLANNING_SPEED_KMH = 44;

/** Floor for any transfer between two distinct moments. */
export const MIN_TRANSFER_MINUTES = 7;
