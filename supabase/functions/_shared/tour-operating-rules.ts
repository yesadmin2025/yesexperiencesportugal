/**
 * Server-authoritative tour operating-rule gate (date-only bookings).
 *
 * Mirrors the semantics the client already understands in
 * `src/lib/availability.ts`: allowed weekdays, blackout dates and a
 * minimum lead time in hours. Nothing else.
 *
 * DELIBERATELY NOT ENFORCED: `cutoff_local_time`. The client does not
 * define its semantics today (it is stored and read, never validated), so
 * enforcing it server-side would silently invent a new rule. Any future
 * work must add it explicitly, with client parity.
 *
 * NOT IN SCOPE: supplier / guide / winery availability. Specific supplier
 * assignment stays an operational choice after booking.
 */

export const OPERATING_RULES_TIME_ZONE = "Europe/Lisbon";

export type OperatingRuleRejection = "weekday_closed" | "blackout" | "min_lead";

export interface OperatingRuleRow {
  weekdays?: unknown;
  blackout_dates?: unknown;
  min_lead_hours?: unknown;
  /** Read but intentionally ignored — see file header. */
  cutoff_local_time?: unknown;
}

export interface NormalizedOperatingRule {
  weekdays: number[];
  blackoutDates: string[];
  minLeadHours: number;
}

export type OperatingRuleCheck =
  | { ok: true }
  | { ok: false; reason: OperatingRuleRejection }
  | { ok: false; reason: "invalid_date" };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d
  );
}

/** yyyy-mm-dd for `now` in the YES operational timezone (no UTC drift). */
export function todayInLisbon(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATING_RULES_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

export function addCalendarDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Weekday (0=Sun..6=Sat) of a calendar date, timezone-independent: a
 * calendar date has the same weekday everywhere, so noon-UTC is exact.
 */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/**
 * Normalize a raw DB row. Returns null when the row is malformed enough
 * that we cannot reason about it — callers must fail closed on null.
 */
export function normalizeOperatingRuleRow(row: OperatingRuleRow | null | undefined) {
  if (!row || typeof row !== "object") return { status: "missing" as const };

  const weekdaysRaw = row.weekdays ?? [0, 1, 2, 3, 4, 5, 6];
  if (!Array.isArray(weekdaysRaw)) return { status: "malformed" as const };
  const weekdays = weekdaysRaw.map((w) => Number(w));
  if (weekdays.some((w) => !Number.isInteger(w) || w < 0 || w > 6))
    return { status: "malformed" as const };

  const blackoutRaw = row.blackout_dates ?? [];
  if (!Array.isArray(blackoutRaw)) return { status: "malformed" as const };
  const blackoutDates = blackoutRaw.map((d) => String(d).slice(0, 10));
  if (blackoutDates.some((d) => !isIsoCalendarDate(d))) return { status: "malformed" as const };

  const leadRaw = row.min_lead_hours ?? 24;
  const minLeadHours = Number(leadRaw);
  if (!Number.isFinite(minLeadHours) || minLeadHours < 0 || minLeadHours > 24 * 365)
    return { status: "malformed" as const };

  return {
    status: "ok" as const,
    rule: { weekdays, blackoutDates, minLeadHours } satisfies NormalizedOperatingRule,
  };
}

/**
 * Evaluate a normalized rule against an exact ISO date.
 * `min_lead_hours` mirrors the client rule: it is an actual elapsed-hours
 * instant (`now + leadHours`), floored to the resulting calendar date in
 * Europe/Lisbon. Date-only semantics: a requested date on or after that
 * Lisbon date passes (no start-time comparison is invented at this layer).
 */
export function evaluateOperatingRule(
  dateExact: string,
  rule: NormalizedOperatingRule,
  now: Date = new Date(),
): OperatingRuleCheck {
  if (!isIsoCalendarDate(dateExact)) return { ok: false, reason: "invalid_date" };

  const leadInstant = new Date(now.getTime() + rule.minLeadHours * 3_600_000);
  const minDate = todayInLisbon(leadInstant);
  if (dateExact < minDate) return { ok: false, reason: "min_lead" };
  if (!rule.weekdays.includes(isoWeekday(dateExact))) return { ok: false, reason: "weekday_closed" };
  if (rule.blackoutDates.includes(dateExact)) return { ok: false, reason: "blackout" };
  return { ok: true };
}

export type OperatingRuleGate =
  | { status: "allowed" }
  /** No row for this tour: preserve existing behaviour, add no restriction. */
  | { status: "no_rule" }
  | { status: "rejected"; reason: OperatingRuleRejection | "invalid_date" }
  /** Lookup/row problem: never create a Stripe session, retry later. */
  | { status: "unavailable" };

/**
 * Full gate for one checkout request.
 *
 * `lookup` returns `{ row }` on success (row may be null = no rule) or
 * `{ error }` when the availability lookup itself failed.
 */
export async function checkTourOperatingRule(params: {
  tourId: string;
  dateExact: string | null | undefined;
  lookup: (tourId: string) => Promise<{ row?: OperatingRuleRow | null; error?: unknown }>;
  now?: Date;
}): Promise<OperatingRuleGate> {
  const { tourId, dateExact, lookup, now = new Date() } = params;

  let result: { row?: OperatingRuleRow | null; error?: unknown };
  try {
    result = await lookup(tourId);
  } catch (error) {
    result = { error };
  }
  // Availability lookup failure is never treated as "allowed".
  if (result.error) return { status: "unavailable" };
  if (!result.row) return { status: "no_rule" };

  const normalized = normalizeOperatingRuleRow(result.row);
  if (normalized.status === "missing") return { status: "no_rule" };
  if (normalized.status === "malformed") return { status: "unavailable" };

  // A rule exists but the request carries no exact date: callsites that
  // legitimately have no date keep their current contract — we cannot
  // evaluate, and we do not invent a new date requirement here.
  if (!dateExact) return { status: "no_rule" };

  const check = evaluateOperatingRule(dateExact, normalized.rule, now);
  return check.ok ? { status: "allowed" } : { status: "rejected", reason: check.reason };
}
