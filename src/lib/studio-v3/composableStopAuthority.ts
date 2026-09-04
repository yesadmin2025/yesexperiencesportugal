/**
 * composableStopAuthority — owner-set prices for stops that may be COMPOSED
 * into a bespoke Studio day, wherever they belong in that day.
 *
 * WHY THIS EXISTS
 * The Signature is only a skeleton: it fixes region, corridor and logistics.
 * A client-designed day may legitimately hold a boat from one Signature, a
 * workshop from another and a market from a third. Until now the only pricing
 * authority for a borrowed moment was the add-on catalogue, which prices a
 * bolt-on as a percentage of the anchor tour — wrong for a stop that is a
 * core part of a bespoke day, and unavailable mid-day.
 *
 * The authority here is a small owner-maintained table
 * (`studio_composable_stops`): one row per inventory stop, with a real price.
 *
 * INVARIANTS
 *  - NOTHING is invented. A stop with no active, priced row is NOT composable.
 *  - The registry is a read-only catalogue projection. It never computes a
 *    checkout total: the server re-derives every euro at Reserve time.
 *  - Empty registry = fail closed (composer behaves exactly as before).
 */

export type ComposablePricingUnit = "per_person" | "per_group" | "per_vehicle" | "fixed";

export interface ComposableStopRow {
  readonly stopId: string;
  readonly region: string;
  /** Owner-set price in euro cents. Always > 0 for an active row. */
  readonly priceCents: number;
  readonly pricingUnit: ComposablePricingUnit;
  readonly minGuests: number;
  readonly active: boolean;
  readonly notes: string | null;
}

/** Guests per vehicle used for `per_vehicle` quantities. Matches add-on rules. */
export const COMPOSABLE_VEHICLE_CAPACITY = 8;

let registry: ReadonlyMap<string, ComposableStopRow> = new Map();

/**
 * Publish the catalogue for this runtime. Only active, priced rows are kept —
 * an unpriced or inactive row can never become bookable by accident.
 */
export function setComposableStopAuthority(rows: readonly ComposableStopRow[]): void {
  const next = new Map<string, ComposableStopRow>();
  for (const row of rows) {
    if (!row.active) continue;
    if (!Number.isFinite(row.priceCents) || row.priceCents <= 0) continue;
    next.set(row.stopId, row);
  }
  registry = next;
}

export function clearComposableStopAuthority(): void {
  registry = new Map();
}

export function getComposableStopRow(stopId: string): ComposableStopRow | null {
  return registry.get(stopId) ?? null;
}

/** True when an owner-priced, active row exists for this inventory stop. */
export function isComposableStop(stopId: string): boolean {
  return registry.has(stopId);
}

export function composableStopIds(): string[] {
  return [...registry.keys()].sort();
}

export interface ComposableStopLine {
  readonly stopId: string;
  readonly unitEurCents: number;
  readonly quantity: number;
  readonly totalEurCents: number;
  readonly pricingUnit: ComposablePricingUnit;
}

/**
 * Quantity for a pricing unit. Pure, and mirrored by the server so the
 * displayed line can never diverge from what Stripe charges.
 */
export function composableQuantity(unit: ComposablePricingUnit, guests: number): number {
  const heads = Math.max(1, Math.floor(guests));
  switch (unit) {
    case "per_person":
      return heads;
    case "per_vehicle":
      return Math.ceil(heads / COMPOSABLE_VEHICLE_CAPACITY);
    case "per_group":
    case "fixed":
      return 1;
  }
}

/**
 * Price one composed moment. Returns null when the stop is not composable or
 * the party is below the owner-declared minimum — both are fail-closed
 * outcomes, never a free stop.
 */
export function composableStopLine(stopId: string, guests: number): ComposableStopLine | null {
  const row = getComposableStopRow(stopId);
  if (!row) return null;
  const heads = Math.max(1, Math.floor(guests));
  if (heads < row.minGuests) return null;
  const quantity = composableQuantity(row.pricingUnit, heads);
  return {
    stopId,
    unitEurCents: row.priceCents,
    quantity,
    totalEurCents: row.priceCents * quantity,
    pricingUnit: row.pricingUnit,
  };
}

/** Indicative supplement total for a set of composed moments, in cents. */
export function composableSupplementTotalCents(
  stopIds: readonly string[],
  guests: number,
): number {
  let total = 0;
  for (const id of new Set(stopIds)) {
    const line = composableStopLine(id, guests);
    if (line) total += line.totalEurCents;
  }
  return total;
}
