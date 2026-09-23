/**
 * Deterministic booking-email parser.
 *
 * Pure functions only: no network, no database, no AI. Given a Gmail message
 * (subject, sender, plain-text body) it returns zero or more normalised
 * booking candidates. Nothing is invented — a field that is not written in the
 * email comes back null and is listed in `missingFields`, which is what pushes
 * a candidate into the Needs Review queue instead of straight into the diary.
 *
 * Two real patterns are supported:
 *  1. Bókun notifications (no-reply@bokun.io) — new bookings and cancellations.
 *  2. YES direct vouchers we send ourselves — pre-confirmation and fully paid,
 *     possibly several dated bookings in one message.
 */

export type SourceChannel = "VIATOR" | "GETYOURGUIDE" | "BOKUN" | "DIRECT" | "WEBSITE" | "OTHER";

export type ParsedIntent = "create" | "cancel";

export type ParsedBooking = {
  /** Position of this booking inside the message (0-based) — part of the dedupe key. */
  slot: number;
  intent: ParsedIntent;
  parser: "bokun" | "direct";
  sourceChannel: SourceChannel;
  externalBookingRef: string | null;
  productBookingRef: string | null;
  externalProductRef: string | null;
  tourTitle: string | null;
  productCode: string | null;
  selectedRate: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  /** ISO yyyy-mm-dd, only when the email states it. */
  date: string | null;
  startTime: string | null;
  pax: number | null;
  paxBreakdown: Record<string, number> | null;
  pickup: string | null;
  dropoff: string | null;
  language: string | null;
  extras: string[];
  inclusions: string[];
  exclusions: string[];
  notes: string | null;
  /** Cents. */
  amountPaid: number | null;
  currency: string | null;
  paymentStatus: "PAID" | "PENDING_PAYMENT" | "UNKNOWN";
  bookingStatus: "paid" | "pending" | "cancelled";
  confidence: number;
  missingFields: string[];
  reviewRequired: boolean;
  reviewReason: string | null;
};

export type ParseResult =
  | { kind: "ignored"; reason: string; bookings: [] }
  | { kind: "bokun" | "direct"; reason: null; bookings: ParsedBooking[] };

export type EmailInput = {
  subject: string;
  from: string;
  body: string;
  /** True when the message came from the SENT mailbox (written by YES). */
  sentByUs?: boolean;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

const clean = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** "Sat 24.Oct '26 @ 09:00" / "24 Oct 2026" / "2026-10-24" -> ISO date + time. */
export function parseDateToken(input: string): { date: string | null; time: string | null } {
  const text = input.replace(/\u00a0/g, " ");
  const time = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const timeValue = time ? `${pad(Number(time[1]))}:${time[2]}` : null;

  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, time: timeValue };

  // 24.Oct '26 | 24 Oct 2026 | 24 October 2026 | 24/Oct/2026
  const named = text.match(
    /\b(\d{1,2})[.\s/-]*([A-Za-z]{3,9})\.?[\s,'/-]*(?:'(\d{2})|(\d{4}))\b/,
  );
  if (named) {
    const month = MONTHS[named[2]!.slice(0, 4).toLowerCase()] ?? MONTHS[named[2]!.slice(0, 3).toLowerCase()];
    if (month) {
      const year = named[4] ? Number(named[4]) : 2000 + Number(named[3]);
      const day = Number(named[1]);
      if (day >= 1 && day <= 31 && year >= 2000 && year < 2100) {
        return { date: `${year}-${pad(month)}-${pad(day)}`, time: timeValue };
      }
    }
  }

  // Oct 24, 2026
  const monthFirst = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (monthFirst) {
    const month = MONTHS[monthFirst[1]!.slice(0, 4).toLowerCase()] ?? MONTHS[monthFirst[1]!.slice(0, 3).toLowerCase()];
    if (month) {
      return {
        date: `${monthFirst[3]}-${pad(month)}-${pad(Number(monthFirst[2]))}`,
        time: timeValue,
      };
    }
  }

  // dd/mm/yyyy — European order, matching how the operation writes dates.
  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { date: `${numeric[3]}-${pad(month)}-${pad(day)}`, time: timeValue };
    }
  }

  return { date: null, time: timeValue };
}

/** Maps Bókun's "Sold by" / "Booking channel" text onto our channel vocabulary. */
export function channelFromText(value: string | null | undefined): SourceChannel {
  const text = (value ?? "").toLowerCase();
  if (!text) return "BOKUN";
  if (text.includes("viator") || text.includes("tripadvisor")) return "VIATOR";
  if (text.includes("getyourguide") || text.includes("get your guide")) return "GETYOURGUIDE";
  if (text.includes("expedia") || text.includes("airbnb") || text.includes("musement")) return "OTHER";
  if (text.includes("yes experiences") || text.includes("direct") || text.includes("website")) return "DIRECT";
  return "BOKUN";
}

const normaliseBody = (body: string) =>
  body
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n");

/**
 * Reads a labelled value: "Customer email: a@b.com", "Customer email a@b.com"
 * or the label on its own line with the value underneath.
 */
function labelled(body: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const inline = body.match(new RegExp(`^[>\\s*]*${escaped}\\s*[:：-]?[ \\t]*(.+)$`, "im"));
  if (inline && clean(inline[1])) return clean(inline[1]);
  const block = body.match(new RegExp(`^[>\\s*]*${escaped}\\s*[:：-]?[ \\t]*\\n+\\s*(.+)$`, "im"));
  return block ? clean(block[1]) : null;
}

function listAfter(body: string, label: string): string[] {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^[>\\s*]*${escaped}\\s*[:：-]?[ \\t]*\\n?([\\s\\S]{0,900}?)(?=\\n\\s*\\n|\\n[>\\s*]*[A-Z][^\\n]{0,40}\\s*:|$)`, "im"));
  if (!match) return [];
  return match[1]!
    .split("\n")
    .map((line) => clean(line.replace(/^[-•*·–\s]+/, "")))
    .filter((line): line is string => !!line && line.length > 1 && !/^[A-Z][a-z]+ ?:$/.test(line))
    .slice(0, 20);
}

function parseMoney(value: string | null): { amount: number | null; currency: string | null } {
  if (!value) return { amount: null, currency: null };
  const currency = /eur|€/i.test(value) ? "EUR" : /usd|\$/.test(value) ? "USD" : /gbp|£/.test(value) ? "GBP" : null;
  const number = value.replace(/[^0-9.,]/g, "");
  if (!number) return { amount: null, currency };
  // 1.234,56 (EU) vs 1,234.56 (US)
  const normalised =
    number.lastIndexOf(",") > number.lastIndexOf(".")
      ? number.replace(/\./g, "").replace(",", ".")
      : number.replace(/,/g, "");
  const parsed = Number(normalised);
  if (!Number.isFinite(parsed) || parsed <= 0) return { amount: null, currency };
  return { amount: Math.round(parsed * 100), currency };
}

/** "2 adults, 1 child (age 7)" / "PAX: 4" -> total + breakdown when written. */
export function parsePax(value: string | null): { total: number | null; breakdown: Record<string, number> | null } {
  if (!value) return { total: null, breakdown: null };
  const breakdown: Record<string, number> = {};
  const pairs = value.matchAll(/(\d{1,2})\s*[x×]?\s*(adults?|children|child|kids?|infants?|teens?|seniors?|youths?|pax|guests?|travellers?|travelers?|people|persons?)/gi);
  for (const pair of pairs) {
    const key = pair[2]!.toLowerCase().replace(/s$/, "");
    const normalisedKey =
      key === "kid" || key === "child" ? "children"
      : key === "adult" ? "adults"
      : key === "infant" ? "infants"
      : key === "teen" ? "teens"
      : key === "senior" ? "seniors"
      : key === "youth" ? "youths"
      : "guests";
    breakdown[normalisedKey] = (breakdown[normalisedKey] ?? 0) + Number(pair[1]);
  }
  const labelled = Object.entries(breakdown).filter(([key]) => key !== "guests");
  if (labelled.length > 0) {
    const total = labelled.reduce((sum, [, n]) => sum + n, 0);
    return { total, breakdown };
  }
  if (breakdown["guests"]) return { total: breakdown["guests"], breakdown: null };
  const bare = value.match(/\b(\d{1,2})\b/);
  const total = bare ? Number(bare[1]) : null;
  return { total: total && total > 0 && total <= 60 ? total : null, breakdown: null };
}

const IGNORE_MARKERS = [
  /\bunsubscribe\b/i,
  /\bnewsletter\b/i,
  /\bquote request\b/i,
  /\bproposal\b/i,
  /\brefund (request|discussion)\b/i,
  /\bpayout\b/i,
  /\binvoice (reminder|overdue)\b/i,
];

const INQUIRY_MARKERS = [
  /\b(enquiry|inquiry|availability request|just wondering|would like to know|is it possible|can you tell me|asking about)\b/i,
];

const DIRECT_CONFIRM_MARKERS = [
  /confirmed\s*(&|and)\s*fully\s*paid/i,
  /confirmed\s*[–—-]\s*fully\s*paid/i,
  /\bbooking confirmed\b/i,
  /\bfully paid\b/i,
];

const DIRECT_PRECONFIRM_MARKERS = [
  /pre[-\s]?confirmation voucher/i,
  /\bpre[-\s]?confirmation\b/i,
  /\bprovisional booking\b/i,
  /awaiting payment/i,
];

function finalise(booking: Omit<ParsedBooking, "confidence" | "missingFields" | "reviewRequired" | "reviewReason">): ParsedBooking {
  const missing: string[] = [];
  if (!booking.date) missing.push("date");
  if (!booking.tourTitle && !booking.externalProductRef) missing.push("tour");
  if (booking.pax == null) missing.push("pax");
  if (!booking.pickup) missing.push("pickup");
  if (!booking.customerName && !booking.customerEmail) missing.push("customer");

  let confidence = 0.3;
  if (booking.externalBookingRef || booking.productBookingRef) confidence += 0.25;
  if (booking.date) confidence += 0.2;
  if (booking.tourTitle) confidence += 0.12;
  if (booking.pax != null) confidence += 0.08;
  if (booking.pickup) confidence += 0.05;
  if (booking.customerName || booking.customerEmail) confidence += 0.08;
  confidence = Math.min(1, Number(confidence.toFixed(2)));

  // A cancellation only needs to identify the reservation it cancels.
  const hardMissing = booking.intent === "cancel"
    ? !booking.externalBookingRef && !booking.productBookingRef && !booking.date
    : !booking.date || (!booking.tourTitle && !booking.externalProductRef);

  const reviewRequired = hardMissing || confidence < 0.7;
  const reviewReason = !reviewRequired
    ? null
    : hardMissing
      ? `Key fields missing: ${missing.join(", ") || "unidentifiable reservation"}`
      : `Low parser confidence (${confidence}). Missing: ${missing.join(", ") || "none"}`;

  return { ...booking, confidence, missingFields: missing, reviewRequired, reviewReason };
}

function emptyBooking(slot: number, parser: "bokun" | "direct", channel: SourceChannel): Omit<ParsedBooking, "confidence" | "missingFields" | "reviewRequired" | "reviewReason"> {
  return {
    slot,
    intent: "create",
    parser,
    sourceChannel: channel,
    externalBookingRef: null,
    productBookingRef: null,
    externalProductRef: null,
    tourTitle: null,
    productCode: null,
    selectedRate: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    date: null,
    startTime: null,
    pax: null,
    paxBreakdown: null,
    pickup: null,
    dropoff: null,
    language: null,
    extras: [],
    inclusions: [],
    exclusions: [],
    notes: null,
    amountPaid: null,
    currency: null,
    paymentStatus: "UNKNOWN",
    bookingStatus: "pending",
  };
}

/** Bókun notification emails. */
function parseBokun(input: EmailInput): ParseResult {
  const body = normaliseBody(input.body);
  const subject = input.subject;
  const cancelled = /\bcancel(led|ed|lation)\b/i.test(subject) || /\bbooking cancelled\b/i.test(body);
  const isBooking = /\b(new|updated|amended|cancelled)\s+booking\b/i.test(subject) || !!labelled(body, "Booking ref.");
  if (!isBooking) {
    return { kind: "ignored", reason: "bokun_message_without_booking_reference", bookings: [] };
  }

  const draft = emptyBooking(0, "bokun", "BOKUN");
  draft.intent = cancelled ? "cancel" : "create";

  const subjectRef = subject.match(/Ext\.\s*booking\s*ref[.:\s]*([A-Za-z0-9-]+)/i);
  const subjectProductRef = subject.match(/\(([A-Z]{2,6}-[A-Za-z0-9]+)\)/);

  draft.externalBookingRef =
    clean(labelled(body, "Ext. booking ref")) ?? clean(subjectRef?.[1] ?? null);
  draft.productBookingRef =
    clean(labelled(body, "Product booking ref.")) ??
    clean(labelled(body, "Product booking ref")) ??
    clean(subjectProductRef?.[1] ?? null);
  const bookingRef = clean(labelled(body, "Booking ref.")) ?? clean(labelled(body, "Booking ref"));
  if (!draft.externalBookingRef) draft.externalBookingRef = bookingRef;
  if (!draft.productBookingRef) draft.productBookingRef = bookingRef;

  draft.tourTitle = clean(labelled(body, "Product"));
  draft.externalProductRef = draft.tourTitle;
  draft.selectedRate = clean(labelled(body, "Rate"));
  draft.customerName = clean(labelled(body, "Customer"));
  draft.customerEmail = clean(labelled(body, "Customer email"))?.toLowerCase() ?? null;
  draft.customerPhone = clean(labelled(body, "Customer phone"));
  draft.pickup = clean(labelled(body, "Pick-up")) ?? clean(labelled(body, "Pickup"));
  draft.language = clean(labelled(body, "Guided languages")) ?? clean(labelled(body, "Guided language"));
  draft.notes = clean(labelled(body, "Notes"));

  const soldBy = clean(labelled(body, "Sold by"));
  const bookingChannel = clean(labelled(body, "Booking channel"));
  draft.sourceChannel = channelFromText(bookingChannel ?? soldBy);

  const dateLine = clean(labelled(body, "Date")) ?? subject;
  const parsedDate = parseDateToken(dateLine);
  draft.date = parsedDate.date;
  draft.startTime = parsedDate.time ?? parseDateToken(subject).time;

  const pax = parsePax(clean(labelled(body, "PAX")));
  draft.pax = pax.total;
  draft.paxBreakdown = pax.breakdown;

  draft.extras = listAfter(body, "Extras");

  const viatorAmount = clean(labelled(body, "Viator amount"));
  const money = parseMoney(viatorAmount ?? clean(labelled(body, "Total")));
  draft.amountPaid = money.amount;
  draft.currency = money.currency;

  if (cancelled) {
    draft.bookingStatus = "cancelled";
    draft.paymentStatus = "UNKNOWN";
  } else {
    // Reseller bookings are collected by the channel: treat as confirmed, and
    // record the channel as the payer rather than claiming a Stripe payment.
    draft.bookingStatus = "paid";
    draft.paymentStatus = "PAID";
  }

  return { kind: "bokun", reason: null, bookings: [finalise(draft)] };
}

const DIRECT_BLOCK_SPLIT = /^[>\s*]*date\s*[:：-]/gim;

/** YES direct vouchers and confirmations we send ourselves. */
function parseDirect(input: EmailInput): ParseResult {
  const body = normaliseBody(input.body);
  const haystack = `${input.subject}\n${body}`;

  const confirmed = DIRECT_CONFIRM_MARKERS.some((re) => re.test(haystack));
  const preConfirmed = DIRECT_PRECONFIRM_MARKERS.some((re) => re.test(haystack));
  if (!confirmed && !preConfirmed) {
    return { kind: "ignored", reason: "no_confirmation_marker", bookings: [] };
  }

  // Split into dated blocks so one voucher covering two days makes two bookings.
  const indices: number[] = [];
  DIRECT_BLOCK_SPLIT.lastIndex = 0;
  for (const match of body.matchAll(DIRECT_BLOCK_SPLIT)) {
    if (typeof match.index === "number") indices.push(match.index);
  }
  const blocks: string[] = [];
  if (indices.length === 0) {
    blocks.push(body);
  } else {
    if (indices[0]! > 0) {
      // Keep the preamble attached to the first block so the tour name survives.
      blocks.push(body.slice(0, indices[1] ?? body.length));
    } else {
      blocks.push(body.slice(0, indices[1] ?? body.length));
    }
    for (let i = 1; i < indices.length; i += 1) {
      blocks.push(body.slice(indices[i]!, indices[i + 1] ?? body.length));
    }
  }

  const preamble = indices.length > 0 ? body.slice(0, indices[0]!) : body;
  const sharedName =
    clean(labelled(body, "Name")) ??
    clean(labelled(body, "Guest")) ??
    clean(labelled(body, "Client")) ??
    clean(labelled(body, "Customer"));
  const sharedEmail = clean(labelled(body, "Email"))?.toLowerCase() ?? null;
  const sharedPhone = clean(labelled(body, "Phone")) ?? clean(labelled(body, "WhatsApp"));

  const bookings: ParsedBooking[] = [];
  blocks.forEach((block, index) => {
    const draft = emptyBooking(bookings.length, "direct", "DIRECT");
    const blockText = block;

    const dateValue = clean(labelled(blockText, "Date"));
    const parsedDate = parseDateToken(dateValue ?? "");
    if (!parsedDate.date) return; // never infer a date

    draft.date = parsedDate.date;
    draft.startTime = parsedDate.time ?? clean(labelled(blockText, "Start time")) ?? clean(labelled(blockText, "Time"));
    draft.pickup = clean(labelled(blockText, "Pick-up")) ?? clean(labelled(blockText, "Pickup")) ?? clean(labelled(blockText, "Pick up"));
    draft.dropoff = clean(labelled(blockText, "Drop-off")) ?? clean(labelled(blockText, "Dropoff"));
    draft.language = clean(labelled(blockText, "Language")) ?? clean(labelled(body, "Language"));
    draft.customerName = sharedName;
    draft.customerEmail = sharedEmail;
    draft.customerPhone = sharedPhone;

    const pax = parsePax(
      clean(labelled(blockText, "Guests")) ??
        clean(labelled(blockText, "Pax")) ??
        clean(labelled(blockText, "Travellers")),
    );
    draft.pax = pax.total;
    draft.paxBreakdown = pax.breakdown;

    draft.inclusions = listAfter(blockText, "Included");
    draft.exclusions = listAfter(blockText, "Not included");
    draft.extras = listAfter(blockText, "Extras");
    draft.notes = clean(labelled(blockText, "Notes")) ?? clean(labelled(blockText, "Special requests"));
    draft.selectedRate = clean(labelled(blockText, "Special rate")) ?? clean(labelled(blockText, "Rate"));

    const money = parseMoney(
      clean(labelled(blockText, "Total paid")) ??
        clean(labelled(blockText, "Total")) ??
        clean(labelled(blockText, "Special rate")),
    );
    draft.amountPaid = money.amount;
    draft.currency = money.currency;

    const statusLine = clean(labelled(blockText, "Status")) ?? clean(labelled(body, "Status")) ?? "";
    const blockConfirmed = DIRECT_CONFIRM_MARKERS.some((re) => re.test(`${statusLine}\n${blockText}`));
    const blockPre = DIRECT_PRECONFIRM_MARKERS.some((re) => re.test(`${statusLine}\n${blockText}`));
    if (blockConfirmed && !blockPre) {
      draft.bookingStatus = "paid";
      draft.paymentStatus = "PAID";
    } else {
      draft.bookingStatus = "pending";
      draft.paymentStatus = "PENDING_PAYMENT";
    }

    // Tour title: an explicit label, else the nearest heading-like line above.
    draft.tourTitle =
      clean(labelled(blockText, "Tour")) ??
      clean(labelled(blockText, "Experience")) ??
      clean(labelled(blockText, "Product")) ??
      headingAbove(index === 0 ? preamble : blockText) ??
      headingAbove(preamble);
    draft.externalProductRef = draft.tourTitle;

    bookings.push(finalise(draft));
  });

  if (bookings.length === 0) {
    return { kind: "ignored", reason: "confirmation_without_parsable_date", bookings: [] };
  }
  return { kind: "direct", reason: null, bookings };
}

const LABEL_LINE = /^[>\s*]*[A-Za-z][A-Za-z .'-]{0,28}\s*[:：]/;

/** Picks the last heading-like line in a chunk — used as the tour name. */
function headingAbove(chunk: string): string | null {
  const lines = chunk.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]!;
    if (LABEL_LINE.test(line)) continue;
    if (/^(hi|hello|dear|thank|thanks|best|kind regards|regards)\b/i.test(line)) continue;
    if (line.length < 6 || line.length > 120) continue;
    if (/@/.test(line) || /^https?:/i.test(line)) continue;
    return clean(line);
  }
  return null;
}

const BOKUN_SENDERS = [/no-?reply@bokun\.io/i, /bokun/i];

/**
 * Entry point. Returns `ignored` for anything that is not a real booking
 * notification or confirmation — enquiries, quotes, marketing, refund threads.
 */
export function parseBookingEmail(input: EmailInput): ParseResult {
  const subject = input.subject ?? "";
  const body = input.body ?? "";
  const haystack = `${subject}\n${body}`;

  if (IGNORE_MARKERS.some((re) => re.test(haystack))) {
    return { kind: "ignored", reason: "non_booking_message", bookings: [] };
  }

  const fromBokun = BOKUN_SENDERS.some((re) => re.test(input.from ?? ""));
  if (fromBokun) return parseBokun(input);

  const hasConfirmation =
    DIRECT_CONFIRM_MARKERS.some((re) => re.test(haystack)) ||
    DIRECT_PRECONFIRM_MARKERS.some((re) => re.test(haystack));

  if (!hasConfirmation) {
    const reason = INQUIRY_MARKERS.some((re) => re.test(haystack))
      ? "enquiry_not_a_booking"
      : "no_confirmation_marker";
    return { kind: "ignored", reason, bookings: [] };
  }

  return parseDirect(input);
}

/**
 * Dedupe ladder, strongest key first. `null` means no reliable key — the caller
 * must fall back to the cautious match or send the candidate to review.
 */
export function dedupeKeysFor(booking: ParsedBooking, gmailMessageId: string | null): string[] {
  const keys: string[] = [];
  if (booking.externalBookingRef) keys.push(`ext:${booking.externalBookingRef.toLowerCase()}`);
  if (booking.productBookingRef) keys.push(`prod:${booking.productBookingRef.toLowerCase()}`);
  if (gmailMessageId) keys.push(`msg:${gmailMessageId}:${booking.slot}`);
  if (booking.date && booking.tourTitle) {
    const tour = booking.tourTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (booking.customerEmail) keys.push(`cust:${booking.customerEmail}:${booking.date}:${tour}`);
    if (booking.customerName) {
      keys.push(`name:${booking.customerName.toLowerCase().replace(/[^a-z]+/g, "")}:${booking.date}:${tour}`);
    }
  }
  return keys;
}
