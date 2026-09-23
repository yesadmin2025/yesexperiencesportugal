/**
 * Deterministic reader for YES's own internal "New booking" notification
 * emails (the message the site sends to the team when a Stripe checkout
 * completes, including copies relayed by Resend).
 *
 * These messages are trusted for operational detail only. Payment truth stays
 * with Stripe, and nothing is inferred: a field that is not written in the
 * email stays null.
 */
import { labelled, listAfter, parseDateToken, parseMoney, parsePax } from "./booking-email-parser";
import { cleanTourTitle, collectStripeRefs, type VoucherBlock } from "./voucher-reconcile-parser";

/** Senders that are allowed to carry an internal booking notification. */
export const INTERNAL_SENDERS: RegExp[] = [
  /@notify\.yesexperiences\.pt/i,
  /@yesexperiences\.pt/i,
  /@yesexperiencesportugal\.com/i,
  /onboarding@resend\.dev/i,
  /@resend\.dev/i,
  /yesexperiences@gmail\.com/i,
];

const SUBJECT_MARKER = /^\s*(?:re\s*:\s*|fwd\s*:\s*)*new booking\b/i;
const BODY_MARKERS = [/new booking confirmed/i, /stripe payment confirmed/i];
const NOT_A_BOOKING = /\b(refund|refunded|cancellation|cancelled|canceled|chargeback|dispute)\b/i;

export function isInternalSender(from: string): boolean {
  return INTERNAL_SENDERS.some((re) => re.test(from ?? ""));
}

/** True only for our own new-booking notification (never a receipt or refund). */
export function isInternalBookingNotification(
  from: string,
  subject: string,
  body: string,
): boolean {
  if (NOT_A_BOOKING.test(subject ?? "")) return false;
  const subjectHit = SUBJECT_MARKER.test(subject ?? "");
  const bodyHit = BODY_MARKERS.some((re) => re.test(body ?? ""));
  if (!subjectHit && !bodyHit) return false;
  // A checkout receipt on its own is not a booking notification.
  if (!subjectHit && /your (?:receipt|payment)/i.test(subject ?? "")) return false;
  return isInternalSender(from) || subjectHit;
}

export type InternalNotificationBlock = VoucherBlock & {
  /** Guest address stated inside the notification. */
  customerEmail: string | null;
  /** "signature" | "tailored" | free text as written under "Type". */
  bookingType: string | null;
  productCode: string | null;
  /** Stable identity of the booking this notification describes. */
  dedupeKey: string;
  /** True when the message states real operational detail (not just a payment line). */
  structured: boolean;
};

const BOOKING_TYPE_PREFIX = /^YES\s+(Signature|Tailored|Studio|Moments|Corporate)\s*[—–-]\s*/i;

/** "New booking · YES Signature — Title · 2026-11-29" */
export function parseInternalSubject(subject: string): {
  tourTitle: string | null;
  date: string | null;
  bookingType: string | null;
} {
  const cleaned = (subject ?? "").replace(/^\s*(?:re\s*:\s*|fwd\s*:\s*)*/i, "").trim();
  const afterMarker = cleaned.replace(/^new booking\s*[·|:-]\s*/i, "");
  const parts = afterMarker.split(/\s+·\s+/).map((part) => part.trim()).filter(Boolean);

  let date: string | null = null;
  if (parts.length > 1) {
    const tail = parts[parts.length - 1]!;
    const token = parseDateToken(tail);
    if (token.date) {
      date = token.date;
      parts.pop();
    }
  }

  let head = parts.join(" · ");
  let bookingType: string | null = null;
  const typeMatch = BOOKING_TYPE_PREFIX.exec(head);
  if (typeMatch) {
    bookingType = typeMatch[1]!.toLowerCase();
    head = head.slice(typeMatch[0].length).trim();
  }
  if (/^a\s+yes\s+experience$/i.test(head)) head = "";

  return { tourTitle: specificTitle(head), date, bookingType };
}

/** Our own template writes these when nothing specific was recorded. */
const GENERIC_TITLE = /^(?:a\s+)?yes\s+experience$|^yes\s+experiences?$|^experience$/i;

const specificTitle = (value: string | null): string | null => {
  const title = cleanTourTitle(value);
  if (!title || GENERIC_TITLE.test(title.trim())) return null;
  return title;
};

const firstLabel = (body: string, labels: string[]): string | null => {
  for (const label of labels) {
    const value = labelled(body, label);
    if (value) return value;
  }
  return null;
};

const EMAIL_IN_TEXT = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

function guestEmail(body: string): string | null {
  const explicit = firstLabel(body, ["Email", "Guest email", "Customer email"]);
  const candidate = explicit && EMAIL_IN_TEXT.test(explicit) ? EMAIL_IN_TEXT.exec(explicit)![0] : null;
  if (candidate && !isInternalSender(candidate)) return candidate.toLowerCase();
  return null;
}

/**
 * Parses one internal notification. Returns null when the message is not one
 * of ours or states no guest address (we never guess the reservation owner).
 */
export function parseInternalNotification(input: {
  from?: string;
  subject: string;
  body: string;
}): InternalNotificationBlock | null {
  const subject = input.subject ?? "";
  const body = input.body ?? "";
  if (!isInternalBookingNotification(input.from ?? "", subject, body)) return null;

  const customerEmail = guestEmail(body);
  if (!customerEmail) return null;

  const fromSubject = parseInternalSubject(subject);
  const money = parseMoney(firstLabel(body, ["Total paid", "Total", "Amount paid"]));
  const paxValue = firstLabel(body, ["Guests", "Pax", "Travellers"]);
  const pax = parsePax(paxValue);

  const bodyDateRaw = firstLabel(body, ["Booking date", "Date", "Trip date", "Experience date"]);
  const bodyDate = bodyDateRaw ? parseDateToken(bodyDateRaw) : { date: null, time: null };

  const bodyTitle = (firstLabel(body, ["Experience", "Tour", "Product"]) ?? "").replace(
    BOOKING_TYPE_PREFIX,
    "",
  );
  const tourTitle = specificTitle(bodyTitle) ?? fromSubject.tourTitle;
  const date = bodyDate.date ?? fromSubject.date;
  const notes = listAfter(body, "Customer notes");

  const dedupeBase = [
    customerEmail,
    date ?? "",
    money.amount != null ? String(money.amount) : "",
    (tourTitle ?? "").toLowerCase(),
  ].join("|");

  return {
    slot: 0,
    date,
    startTime: firstLabel(body, ["Start time", "Time"]) ?? bodyDate.time,
    tourTitle,
    selectedRate: firstLabel(body, ["Selected rate", "Rate", "Variant"]),
    pickup: firstLabel(body, ["Pickup", "Pick-up", "Pick up"]),
    dropoff: firstLabel(body, ["Drop-off", "Dropoff", "Drop off"]),
    pax: pax.total,
    paxBreakdown: pax.breakdown,
    language: firstLabel(body, ["Language"]),
    inclusions: listAfter(body, "Included"),
    exclusions: listAfter(body, "Not included"),
    extras: [...listAfter(body, "Add-ons"), ...listAfter(body, "Extras")],
    notes: notes.length ? notes.join("; ") : null,
    customerName: firstLabel(body, ["Guest", "Name", "Client", "Customer"]),
    customerPhone: firstLabel(body, ["Phone", "WhatsApp"]),
    amountCents: money.amount,
    currency: money.currency,
    confirmed: true,
    stripeRefs: collectStripeRefs(`${subject}\n${body}`),
    customerEmail,
    bookingType: firstLabel(body, ["Type"]) ?? fromSubject.bookingType,
    productCode: firstLabel(body, ["Product code", "Source tour id", "Tour id"]),
    dedupeKey: dedupeBase,
    structured: !!(date || tourTitle || firstLabel(body, ["Pickup", "Pick-up", "Pick up"])),
  };
}

/** Collapses repeated copies (team inbox + relay) of the same notification. */
export function dedupeInternalNotifications<T extends { block: InternalNotificationBlock }>(
  items: T[],
): { unique: T[]; ignoredCopies: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let ignoredCopies = 0;
  for (const item of items) {
    if (seen.has(item.block.dedupeKey)) {
      ignoredCopies += 1;
      continue;
    }
    seen.add(item.block.dedupeKey);
    unique.push(item);
  }
  return { unique, ignoredCopies };
}

/** Gmail search that finds our own recent booking notifications. */
export function internalNotificationQuery(days: number): string {
  const window = `newer_than:${Math.max(1, Math.min(365, days))}d`;
  return `${window} subject:"New booking" (from:notify.yesexperiences.pt OR from:yesexperiences.pt OR from:resend.dev OR from:yesexperiencesportugal.com OR to:yesexperiences@gmail.com OR to:info@yesexperiencesportugal.com)`;
}
