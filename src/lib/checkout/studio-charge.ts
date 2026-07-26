/**
 * Studio V3 add-on party math — shared by the Stripe reserve handler and
 * the "You'll be charged €X" quote shown before guest details, so the two
 * can never drift.
 */

export interface AddOnPartyItem {
  readonly unit: string;
  readonly perUnit: number;
  readonly amount: number;
}

/** Party amount for a single add-on line, unit-aware. */
export function addOnPartyAmount(item: AddOnPartyItem, guests: number): number {
  switch (item.unit) {
    case "per_person":
      return item.perUnit * guests;
    case "per_vehicle":
      return item.perUnit * Math.ceil(guests / 4);
    case "per_group":
    case "fixed":
      return item.perUnit;
    default:
      return item.amount;
  }
}

/** Rounded party total across every selected add-on. */
export function addOnsPartyTotal(
  items: readonly AddOnPartyItem[],
  guests: number,
): number {
  return Math.round(items.reduce((sum, i) => sum + addOnPartyAmount(i, guests), 0));
}
