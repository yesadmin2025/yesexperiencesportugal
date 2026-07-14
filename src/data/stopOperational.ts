// Studio V3 — Operational truth registry for Signature stops.
//
// Single source of truth for "when is this stop NOT bookable?".
// Used by `curateJourney` (src/components/studio-v3/curation.ts) to drop
// stops from the pool whenever the traveller has chosen a concrete date.
//
// Rules MUST be factual and cite a source. Never invent closures.
// Weekdays follow JS convention: 0 = Sunday, 1 = Monday … 6 = Saturday.

export interface StopOperationalRule {
  /** Case-insensitive regex matched against `${stop.label} ${stop.story}`. */
  match: RegExp;
  /** Weekdays the stop is closed (0–6). */
  closedOn?: ReadonlyArray<number>;
  /** Specific yyyy-mm-dd dates the stop is closed (holidays etc.). */
  closedDates?: ReadonlyArray<string>;
  /** Human-readable reason — surfaced in telemetry only, never to guests. */
  reason: string;
  /** Where this rule comes from (Viator page, official site, partner brief). */
  source: string;
}

export const STOP_OPERATIONAL_RULES: ReadonlyArray<StopOperationalRule> = [
  {
    match: /mercado\s+do\s+livramento/i,
    closedOn: [1],
    reason: "Mercado do Livramento closed on Mondays",
    source: "https://www.mun-setubal.pt/mercado-do-livramento/",
  },
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns the JS weekday (0=Sun…6=Sat) for an ISO yyyy-mm-dd, or null. */
export function weekdayFromIso(dateExact: string | null | undefined): number | null {
  if (!dateExact || !ISO_DATE_RE.test(dateExact)) return null;
  // Anchor at noon UTC to avoid timezone edge cases flipping the weekday.
  const d = new Date(`${dateExact}T12:00:00Z`);
  const day = d.getUTCDay();
  return Number.isFinite(day) ? day : null;
}

/**
 * True when the stop (matched by haystack `${label} ${story}`) is closed
 * on the given ISO date according to the operational registry.
 */
export function isStopClosedOn(haystack: string, dateExact: string | null | undefined): boolean {
  if (!dateExact) return false;
  const weekday = weekdayFromIso(dateExact);
  for (const rule of STOP_OPERATIONAL_RULES) {
    if (!rule.match.test(haystack)) continue;
    if (weekday != null && rule.closedOn?.includes(weekday)) return true;
    if (rule.closedDates?.includes(dateExact)) return true;
  }
  return false;
}
