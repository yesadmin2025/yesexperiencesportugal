/**
 * FINAL CERTIFICATION — cumulative add-on time budget.
 *
 * The catalogue's own `fitsBudget` answers "does this add-on fit an otherwise
 * empty day?". It knows nothing about the add-ons the traveller has ALREADY
 * selected, so three 45-minute extensions could each look affordable while
 * together overflowing the day.
 *
 * This module makes the budget CUMULATIVE: each unselected add-on is judged
 * against the minutes that are genuinely still free.
 *
 * Pure, deterministic, euro-free.
 */

export interface AddOnBudgetItem {
  readonly id: string;
  readonly durationMinutes?: number | null;
  /** The catalogue's static structural verdict. A veto, never an override. */
  readonly fitsBudget?: boolean;
}

export interface AddOnBudget {
  /** Minutes already committed by the current selection. */
  readonly selectedMinutes: number;
  /** Minutes still free. Null when the day's remaining time is unknown. */
  readonly freeMinutes: number | null;
  /** Per-add-on verdict, cumulative-aware. */
  readonly fitsById: Readonly<Record<string, boolean>>;
}

export function resolveAddOnBudget(input: {
  pool: ReadonlyArray<AddOnBudgetItem>;
  selectedIds: ReadonlyArray<string>;
  /** Day minutes left BEFORE add-ons. Null/undefined ⇒ unknown. */
  remainingMinutes: number | null | undefined;
}): AddOnBudget {
  const selected = new Set(input.selectedIds);
  const selectedMinutes = input.pool
    .filter((item) => selected.has(item.id))
    .reduce((sum, item) => sum + Math.max(0, item.durationMinutes ?? 0), 0);

  const remaining =
    typeof input.remainingMinutes === "number" && Number.isFinite(input.remainingMinutes)
      ? input.remainingMinutes
      : null;
  const freeMinutes = remaining === null ? null : remaining - selectedMinutes;

  const fitsById: Record<string, boolean> = {};
  for (const item of input.pool) {
    const staticFits = item.fitsBudget !== false;
    if (selected.has(item.id)) {
      // Already chosen: keeping it is always allowed — deselecting is the
      // traveller's own action, never a silent removal.
      fitsById[item.id] = true;
      continue;
    }
    if (!staticFits) {
      fitsById[item.id] = false;
      continue;
    }
    if (freeMinutes === null) {
      // Remaining time unknown: keep the existing structural verdict.
      fitsById[item.id] = true;
      continue;
    }
    fitsById[item.id] = Math.max(0, item.durationMinutes ?? 0) <= freeMinutes;
  }

  return { selectedMinutes, freeMinutes, fitsById };
}
