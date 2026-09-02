/**
 * FINAL CLOSURE — ONE PARTY-SIZE PRODUCT TRUTH.
 *
 * The Studio can COMPOSE a day for up to 14 people. Self-service payment,
 * however, is only supported by the server for 1–12. Rather than capping the
 * experience or letting a 13–14 party reach a checkout that cannot complete,
 * those parties fail closed to the existing curator / private-group path.
 *
 * Pure and deterministic. No pricing, no tiers, no server constants changed.
 */

/** Largest party the existing self-service checkout can complete. */
export const SELF_SERVICE_MAX_PARTY = 12;

/** Largest party the Studio may compose for. Instant-bookable product truth:
 *  the Studio never composes a day it cannot sell, so this equals the
 *  self-service ceiling. Larger groups use the site-wide support channel. */
export const STUDIO_MAX_PARTY = SELF_SERVICE_MAX_PARTY;

/** True when the party must be confirmed by a curator instead of Stripe. */
export function requiresCuratorParty(total: number | null | undefined): boolean {
  if (typeof total !== "number" || !Number.isFinite(total)) return false;
  return Math.round(total) > SELF_SERVICE_MAX_PARTY;
}

/** Concise, premium message for a private group above self-service size. */
export function curatorPartyMessage(total: number): string {
  return `A private group of ${Math.round(total)} is confirmed personally by a YES curator — we'll shape the vehicles, the table and the timing with you, rather than take payment before the day is right.`;
}
