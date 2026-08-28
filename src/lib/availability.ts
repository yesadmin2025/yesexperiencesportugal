/**
 * Tour operating rules — client-side availability helpers.
 *
 * Fetches from public.tour_operating_rules (RLS: public SELECT).
 * Falls back to safe defaults (all weekdays, 24h lead, no blackouts)
 * when a tour has no explicit row — no regression vs current behavior.
 */
import { supabase } from "@/integrations/supabase/client";

export interface OperatingRule {
  tourId: string;
  weekdays: number[]; // 0=Sun .. 6=Sat
  blackoutDates: string[]; // ISO yyyy-mm-dd
  minLeadHours: number;
  cutoffLocalTime: string | null; // HH:mm:ss
}

const DEFAULT_RULE = (tourId: string): OperatingRule => ({
  tourId,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  blackoutDates: [],
  minLeadHours: 24,
  cutoffLocalTime: null,
});

const cache = new Map<string, Promise<OperatingRule>>();

export function getOperatingRule(tourId: string): Promise<OperatingRule> {
  const existing = cache.get(tourId);
  if (existing) return existing;
  const p = (async () => {
    try {
      const { data, error } = await supabase
        .from("tour_operating_rules")
        .select("tour_id,weekdays,blackout_dates,min_lead_hours,cutoff_local_time")
        .eq("tour_id", tourId)
        .maybeSingle();
      if (error || !data) return DEFAULT_RULE(tourId);
      return {
        tourId,
        weekdays: (data.weekdays as number[]) ?? DEFAULT_RULE(tourId).weekdays,
        blackoutDates: (data.blackout_dates as string[]) ?? [],
        minLeadHours: (data.min_lead_hours as number) ?? 24,
        cutoffLocalTime: (data.cutoff_local_time as string | null) ?? null,
      };
    } catch {
      return DEFAULT_RULE(tourId);
    }
  })();
  cache.set(tourId, p);
  return p;
}

/** YES operational timezone — must match the server operating-rule gate. */
export const OPERATING_TIME_ZONE = "Europe/Lisbon";

const lisbonDateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: OPERATING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Minimum bookable ISO date given lead-hours from now.
 *
 * Parity with `supabase/functions/_shared/tour-operating-rules.ts`:
 * `min_lead_hours` is an actual elapsed-hours instant (`now + leadHours`),
 * floored to the resulting calendar date in Europe/Lisbon — never UTC,
 * so dates near local midnight cannot drift a day early.
 */
export function computeMinDateISO(leadHours: number, now: Date = new Date()): string {
  const d = new Date(now.getTime() + leadHours * 3_600_000);
  const parts = lisbonDateParts.formatToParts(d);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

export type DateInvalidReason = "before_min" | "weekday_closed" | "blackout";

export function validateDateISO(
  dateISO: string,
  rule: OperatingRule,
): { ok: true } | { ok: false; reason: DateInvalidReason } {
  if (!dateISO) return { ok: false, reason: "before_min" };
  const min = computeMinDateISO(rule.minLeadHours);
  if (dateISO < min) return { ok: false, reason: "before_min" };
  const dow = new Date(dateISO + "T00:00:00").getDay();
  if (!rule.weekdays.includes(dow)) return { ok: false, reason: "weekday_closed" };
  if (rule.blackoutDates.includes(dateISO)) return { ok: false, reason: "blackout" };
  return { ok: true };
}
