/**
 * Paid-reservation calendar feed (iCalendar).
 *
 * Reads confirmed bookings and renders them as VEVENTs so the operator can
 * subscribe from Google Calendar / Apple Calendar and see every reservation
 * with its date, start time and party size.
 *
 * Read-only: nothing here computes pricing or mutates a booking. Every value
 * comes from the frozen checkout snapshot — no invented times or durations.
 */

type AnyRec = Record<string, unknown>;

const CAL_NAME = "YES Experiences — reservations";

function snapshotOf(details: AnyRec | null): AnyRec {
  if (!details || typeof details !== "object") return {};
  const snap = details["snapshot"];
  return snap && typeof snap === "object" ? (snap as AnyRec) : {};
}

function pickString(...values: unknown[]): string | null {
  const hit = values.find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof hit === "string" ? hit.trim() : null;
}

/** "09:30" / "9:30 AM" → { h, m } when unambiguous, else null. */
function parseStartTime(raw: string | null): { h: number; m: number } | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})[:h.]?(\d{2})?\s*(am|pm)?$/i);
  if (!match) return null;
  let h = Number(match[1]);
  const m = Number(match[2] ?? 0);
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && h < 12) h += 12;
  if (suffix === "am" && h === 12) h = 0;
  if (!Number.isInteger(h) || h > 23 || !Number.isInteger(m) || m > 59) return null;
  return { h, m };
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** iCalendar lines must be folded at 75 octets. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  return parts.join("\r\n");
}

function ymd(date: string): string {
  return date.replace(/-/g, "");
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function stamp(iso: string): string {
  const d = new Date(iso);
  const value = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${value.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

export type CalendarBookingRow = {
  id: string;
  created_at: string;
  source_tour_id: string | null;
  customer_name: string | null;
  customer_email: string;
  customer_phone?: string | null;
  guests: number;
  preferred_date: string | null;
  status: string;
  stripe_session_id: string | null;
  booking_details: AnyRec | null;
};

export function buildBookingCalendar(rows: CalendarBookingRow[], siteUrl: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YES Experiences Portugal//Reservations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(CAL_NAME)}`,
    "X-WR-TIMEZONE:Europe/Lisbon",
  ];

  for (const row of rows) {
    if (!row.preferred_date) continue;
    const details = row.booking_details ?? {};
    const snapshot = snapshotOf(details);
    const guestDetails = (details["guestDetails"] ?? {}) as AnyRec;

    const experience =
      pickString(snapshot["experienceName"], row.source_tour_id) ?? "Private experience";
    const startTime = pickString(details["startTime"], snapshot["startTime"]);
    const parsed = parseStartTime(startTime);
    const durationMinutes = Number(snapshot["durationMinutes"]);
    const pickup = pickString(
      details["pickupAddress"],
      details["pickupLabel"],
      snapshot["pickup"],
      guestDetails["pickupAddress"],
    );
    const phone = pickString(
      row.customer_phone ?? null,
      details["customerPhone"],
      snapshot["customerPhone"],
      guestDetails["phone"],
    );

    const guestLabel = `${row.guests} guest${row.guests === 1 ? "" : "s"}`;
    const who = row.customer_name ?? row.customer_email;
    const summary = `${experience} — ${who} · ${guestLabel}`;

    const descriptionParts = [
      `Guests: ${guestLabel}`,
      startTime ? `Start: ${startTime}` : "Start time: to be confirmed",
      pickup ? `Pickup: ${pickup}` : null,
      `Email: ${row.customer_email}`,
      phone ? `Phone: ${phone}` : null,
      row.stripe_session_id ? `Reference: ${row.stripe_session_id}` : null,
      `Status: ${row.status}`,
      `Admin: ${siteUrl}/admin/bookings/${row.id}`,
    ].filter(Boolean) as string[];

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:booking-${row.id}@yesexperiencesportugal.com`);
    lines.push(`DTSTAMP:${stamp(row.created_at)}`);

    if (parsed) {
      const startLocal = `${ymd(row.preferred_date)}T${String(parsed.h).padStart(2, "0")}${String(
        parsed.m,
      ).padStart(2, "0")}00`;
      lines.push(`DTSTART;TZID=Europe/Lisbon:${startLocal}`);
      if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
        const total = parsed.h * 60 + parsed.m + Math.round(durationMinutes);
        const endDayOffset = Math.floor(total / (24 * 60));
        const endMinutes = total % (24 * 60);
        const endDate = new Date(`${row.preferred_date}T00:00:00Z`);
        endDate.setUTCDate(endDate.getUTCDate() + endDayOffset);
        const endLocal = `${endDate.toISOString().slice(0, 10).replace(/-/g, "")}T${String(
          Math.floor(endMinutes / 60),
        ).padStart(2, "0")}${String(endMinutes % 60).padStart(2, "0")}00`;
        lines.push(`DTEND;TZID=Europe/Lisbon:${endLocal}`);
      }
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(row.preferred_date)}`);
      lines.push(`DTEND;VALUE=DATE:${nextDay(row.preferred_date)}`);
    }

    lines.push(`SUMMARY:${escapeText(summary)}`);
    lines.push(`DESCRIPTION:${escapeText(descriptionParts.join("\n"))}`);
    if (pickup) lines.push(`LOCATION:${escapeText(pickup)}`);
    lines.push(`STATUS:${row.status === "paid" ? "CONFIRMED" : "TENTATIVE"}`);
    lines.push(`URL:${siteUrl}/admin/bookings/${row.id}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
