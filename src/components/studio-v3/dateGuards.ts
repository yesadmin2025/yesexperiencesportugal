// Date guards for Studio V3 / Builder.
//
// Dates that reach checkout must be valid operational dates. The current
// production Studio still uses the legacy past-date guards below; the Living
// Atlas additionally uses a Lisbon-based three-calendar-day booking window and
// date-aware stop rules.

import type { DateMode } from "./types";

export const STUDIO_BUSINESS_TIME_ZONE = "Europe/Lisbon";
export const STUDIO_MIN_ADVANCE_DAYS = 3;
export const MERCADO_DO_LIVRAMENTO_STOP_ID = "mercado-do-livramento";

/** Today's ISO yyyy-mm-dd in the user's local timezone. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ISO yyyy-mm-dd in the YES operational timezone. */
export function studioTodayIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function isIsoCalendarDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function addCalendarDaysIso(iso: string, days: number): string {
  if (!isIsoCalendarDate(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/** First date that may enter Studio checkout. The UI does not explain the rule. */
export function minimumStudioBookingDateIso(now: Date = new Date()): string {
  return addCalendarDaysIso(studioTodayIso(now), STUDIO_MIN_ADVANCE_DAYS);
}

export function isStudioBookingDateAllowed(
  iso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return isIsoCalendarDate(iso) && iso >= minimumStudioBookingDateIso(now);
}

export function isoWeekday(iso: string): number | null {
  if (!isIsoCalendarDate(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/** Mercado do Livramento is a morning stop and is closed on Mondays. */
export function isMercadoDoLivramentoOpenOn(iso: string | null | undefined): boolean {
  return Boolean(iso && isIsoCalendarDate(iso) && isoWeekday(iso) !== 1);
}

/** True when `iso` is a well-formed yyyy-mm-dd that is strictly before today. */
export function isPastIsoDate(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso) return false;
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

/** Sanitise (dateExact, dateMode) pair for use in the reveal / price card. */
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
