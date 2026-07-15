/**
 * Shared route-leg sanity helpers.
 *
 * Extracted so the Studio composer and the runtime `getStudioV3RouteLegs`
 * server function use identical geographic reasoning:
 *   - haversine (great-circle) distance in km
 *   - a haversine-based drive-minute estimate for a leg
 *   - a "looks wrong" guard for legs that exceed haversine × factor
 *     or a hard single-leg ceiling (both used to reject OSRM ghosts).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** OSRM readings above `haversine × OSRM_SANITY_FACTOR` are treated as corrupt. */
export const OSRM_SANITY_FACTOR = 3;

/** Hard ceiling for any single leg in a day tour (km). */
export const MAX_SINGLE_LEG_KM = 250;

/** Composer-time guard: reject a candidate leg above this haversine distance.
 *  A day tour that hops more than ~60 km straight-line between two stops is
 *  never the right composition — it means the pool was misfiltered. */
export const COMPOSER_MAX_LEG_KM = 60;

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Drive-minute estimate from a haversine km reading. Matches the fallback
 *  used inside `getStudioV3RouteLegs`. */
export function haversineDriveMinutes(km: number): number {
  return Math.max(1, Math.round(((km * 1.12) / 55) * 60));
}

/** True when an OSRM (or cached) leg reading is likely wrong given the
 *  straight-line distance between the two endpoints. */
export function legLooksWrong(osrmKm: number, havKm: number): boolean {
  if (osrmKm > MAX_SINGLE_LEG_KM) return true;
  if (havKm > 0.2 && osrmKm > havKm * OSRM_SANITY_FACTOR) return true;
  return false;
}

/** Composer-side check: is a candidate hop geographically plausible for a
 *  single day-tour leg? */
export function isPlausibleComposerLeg(a: LatLng, b: LatLng): boolean {
  return haversineKm(a, b) <= COMPOSER_MAX_LEG_KM;
}
