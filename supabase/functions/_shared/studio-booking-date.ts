export const STUDIO_CHECKOUT_TIME_ZONE = "Europe/Lisbon";
export const STUDIO_CHECKOUT_MIN_ADVANCE_DAYS = 3;

function isIsoCalendarDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function todayInLisbon(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_CHECKOUT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function minimumStudioCheckoutDate(now: Date = new Date()): string {
  return addCalendarDays(todayInLisbon(now), STUDIO_CHECKOUT_MIN_ADVANCE_DAYS);
}

export function isStudioCheckoutDateAllowed(
  iso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return isIsoCalendarDate(iso) && iso >= minimumStudioCheckoutDate(now);
}
