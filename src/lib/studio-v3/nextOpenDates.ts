import { isStopClosedOn } from "@/data/stopOperational";
import { isDateBookable } from "@/lib/booking-lead-time";

/**
 * Next dates after `fromIso` on which no moment of the day is closed and the
 * standard lead time is respected. Suggestions only — every booking gate
 * still re-judges the chosen date.
 */
export function nextOpenDatesForDay(
  fromIso: string,
  labels: readonly string[],
  count = 3,
  now: Date = new Date(),
): string[] {
  const out: string[] = [];
  const base = new Date(`${fromIso}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return out;
  for (let i = 1; i <= 21 && out.length < count; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (!isDateBookable(`${iso}T12:00:00`, now)) continue;
    if (labels.some((l) => isStopClosedOn(l, iso))) continue;
    out.push(iso);
  }
  return out;
}
