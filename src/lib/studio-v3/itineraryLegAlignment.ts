/**
 * itineraryLegAlignment — P0-C ROUTE-LEG CONTRACT.
 *
 * The routing request and the validator speak two different geometries:
 *
 *   routing   :  [origin, stop0, stop1, … stopN-1]  (deduped consecutive
 *                identical coordinates)  ->  routeStops.length - 1 legs
 *   validator :  [stop0 … stopN-1]                  ->  stops.length - 1 legs
 *
 * Handing routing legs straight to `validateItinerary` therefore always
 * mismatched by the pickup leg (and by every deduped pair), which the
 * validator reports as `missing_leg_data` -> `incomplete` -> Reserve
 * permanently disabled even for a perfectly operable day.
 *
 * This module realigns the two: it drops the origin leg and sums the routing
 * legs that sit between two consecutive itinerary moments. Deduped moments
 * (identical coordinates) legitimately produce a 0-minute leg — no driving
 * happens between them. Pure, and FAIL CLOSED: it returns `null` whenever
 * alignment cannot be proven, so the day stays in review rather than being
 * approved on invented minutes.
 */

export interface AlignRouteLegsInput {
  /** Keys of the stops actually sent to routing, origin first, deduped. */
  routeStopKeys: ReadonlyArray<string>;
  /** Routing minutes, one per consecutive routing pair. */
  legMinutes?: ReadonlyArray<number> | null;
  /** Keys of the itinerary moments, in order, as the validator sees them. */
  itineraryStopKeys: ReadonlyArray<string>;
}

export function alignRouteLegsToItinerary(input: AlignRouteLegsInput): number[] | null {
  const { routeStopKeys, itineraryStopKeys } = input;
  const legs = input.legMinutes ?? null;
  if (!legs) return null;
  if (itineraryStopKeys.length < 2) return null;
  if (routeStopKeys.length < 2) return null;
  // The routing seam closes the loop (`[origin, …moments, origin]`), so it
  // returns ONE leg more than there are route keys minus one: the final
  // return-to-origin leg. That leg is real door-to-door time, but it sits
  // outside the itinerary geometry the validator scores, so it is dropped
  // here rather than misaligning every internal leg.
  const internalLegs =
    legs.length === routeStopKeys.length ? legs.slice(0, routeStopKeys.length - 1) : legs;
  if (internalLegs.length !== routeStopKeys.length - 1) return null;
  if (!internalLegs.every((m) => typeof m === "number" && Number.isFinite(m))) return null;

  const positionOf = new Map<string, number>();
  routeStopKeys.forEach((key, i) => {
    if (!positionOf.has(key)) positionOf.set(key, i);
  });

  const positions: number[] = [];
  for (let i = 0; i < itineraryStopKeys.length; i += 1) {
    const key = itineraryStopKeys[i]!;
    const found = positionOf.get(key);
    if (typeof found === "number") {
      positions.push(found);
      continue;
    }
    // A moment absent from the routing list can only be a deduped duplicate
    // of the previous moment's coordinate. Anything else is unprovable.
    if (i === 0) return null;
    positions.push(positions[i - 1]!);
  }

  // Order must be monotonic; a route that visits moments out of order cannot
  // be scored against this itinerary.
  for (let i = 1; i < positions.length; i += 1) {
    if (positions[i]! < positions[i - 1]!) return null;
  }

  const out: number[] = [];
  for (let i = 1; i < positions.length; i += 1) {
    let sum = 0;
    for (let p = positions[i - 1]!; p < positions[i]!; p += 1) sum += internalLegs[p]!;
    out.push(sum);
  }
  return out.length === itineraryStopKeys.length - 1 ? out : null;
}
