/**
 * Booking lead time — single source of truth.
 *
 * Sprint A v5: every booking surface (Studio date phase, Signature
 * date picker, Tailored date picker, pre-payment details form)
 * requires a minimum of MIN_LEAD_DAYS calendar days between "now"
 * and the experience date so the local team can prepare the day
 * properly.
 *
 * Pure functions only — safe to import from server functions, edge
 * functions and client components.
 */

export const MIN_LEAD_DAYS = 3;

/**
 * Public helper line shown next to disabled days in pickers.
 * Calm, single sentence. No exclamation, no "when available".
 */
export const MIN_LEAD_HELPER_TEXT =
  "We need at least three days before your experience to prepare it properly.";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Earliest bookable calendar date given `now`. */
export function earliestBookableDate(now: Date = new Date()): Date {
  const out = startOfDay(now);
  out.setDate(out.getDate() + MIN_LEAD_DAYS);
  return out;
}

/**
 * Returns true when `date` is on or after `earliestBookableDate(now)`.
 * Accepts a Date, an ISO string, or any value Date can parse.
 */
export function isDateBookable(
  date: Date | string | number,
  now: Date = new Date(),
): boolean {
  const candidate = startOfDay(new Date(date));
  if (Number.isNaN(candidate.getTime())) return false;
  return candidate.getTime() >= earliestBookableDate(now).getTime();
}
