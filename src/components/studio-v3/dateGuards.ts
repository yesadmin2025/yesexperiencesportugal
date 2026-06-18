// Date guards for Studio V3 / Builder.
//
// The DatePhase input already prevents picking a past date (`min={todayIso}`
// + onChange guard), but persisted state can still hold a stale ISO from a
// previous session — e.g. someone composed a Signature on 12 Sep, returned
// 3 weeks later, and the saved `dateExact` is now in the past.
//
// `isPastIsoDate` and `safeDateForReveal` are the single source of truth
// the reveal, the Builder and the SignaturePriceCard import to render a
// safe fallback instead of a stale past date.

import type { DateMode } from "./types";

/** Today's ISO yyyy-mm-dd in the user's local timezone. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when `iso` is a well-formed yyyy-mm-dd that is strictly before today. */
export function isPastIsoDate(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso) return false;
  // yyyy-mm-dd comparison is lexicographic-safe.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return iso < todayIso(now);
}

export interface SafeDateResult {
  /** Safe ISO to display ("exact" only when not in the past). */
  dateExact: string | null;
  /** Safe DateMode — demoted from "exact" to "undecided" when the saved
   *  date is in the past, so downstream UIs never render a stale date. */
  dateMode: DateMode | null;
  /** True when the input was demoted because of a past date. */
  demoted: boolean;
}

/** Sanitise (dateExact, dateMode) pair for use in the reveal / price card.
 *  - Past `dateExact` → cleared and dateMode demoted to "undecided".
 *  - Non-exact modes pass through untouched. */
export function safeDateForReveal(
  dateExact: string | null,
  dateMode: DateMode | null,
  now: Date = new Date(),
): SafeDateResult {
  if (dateMode === "exact" && isPastIsoDate(dateExact, now)) {
    return { dateExact: null, dateMode: "undecided", demoted: true };
  }
  return { dateExact, dateMode, demoted: false };
}
