/**
 * Pure voucher reader used by the one-time Stripe reconciliation pass.
 *
 * It is deliberately more tolerant than the ordinary ingestion parser in one
 * respect only: a confirmation we sent ourselves that never states a trip date
 * still yields a block, because the reconciliation matcher can identify the
 * reservation from the paid amount instead. Nothing is invented — every field
 * that is not written in the email stays null.
 */
import {
  DIRECT_CONFIRM_MARKERS,
  DIRECT_PRECONFIRM_MARKERS,
  headingAbove,
  labelled,
  listAfter,
  parseBookingEmail,
  parseMoney,
  parsePax,
} from "./booking-email-parser";

export type VoucherBlock = {
  slot: number;
  date: string | null;
  startTime: string | null;
  tourTitle: string | null;
  selectedRate: string | null;
  pickup: string | null;
  dropoff: string | null;
  pax: number | null;
  paxBreakdown: Record<string, number> | null;
  language: string | null;
  inclusions: string[];
  exclusions: string[];
  extras: string[];
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  /** Cents, only when the email states a total. */
  amountCents: number | null;
  currency: string | null;
  confirmed: boolean;
  /** Stripe session / payment intent references found anywhere in the message. */
  stripeRefs: string[];
};

const STRIPE_REF = /\b(cs_(?:live|test)_[A-Za-z0-9]{10,}|pi_[A-Za-z0-9]{10,})\b/g;

export function collectStripeRefs(text: string): string[] {
  const out = new Set<string>();
  for (const match of text.matchAll(STRIPE_REF)) out.add(match[1]!);
  return [...out];
}

/** Refund, cancellation and dispute threads are never a voucher. */
const NOT_A_VOUCHER = /\b(refund|refunded|cancellation|cancelled|canceled|dispute|chargeback)\b/i;

export function isConfirmationVoucher(subject: string, body: string): boolean {
  if (NOT_A_VOUCHER.test(subject)) return false;
  const haystack = `${subject}\n${body}`;
  return (
    DIRECT_CONFIRM_MARKERS.some((re) => re.test(haystack)) ||
    DIRECT_PRECONFIRM_MARKERS.some((re) => re.test(haystack))
  );
}

/**
 * A usable tour title, or null. Guards against the heading heuristic picking up
 * a signature line, a link or a phone number — we never write a guessed value.
 */
export function cleanTourTitle(value: string | null): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 6 || text.length > 90) return null;
  if (/https?:|www\.|@|\+\d|\d{6,}/.test(text)) return null;
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "").length;
  if (letters < text.length * 0.6) return null;
  return text;
}

/** Title stated in the subject of a confirmation YES sent ("Re: Your X"). */
export function titleFromSubject(subject: string): string | null {
  const match = /^(?:re\s*:\s*|fwd\s*:\s*)*your\s+(.{6,90})$/i.exec(subject.trim());
  return cleanTourTitle(match?.[1] ?? null);
}


function moneyFrom(text: string): { amount: number | null; currency: string | null } {
  return parseMoney(
    labelled(text, "Total paid") ??
      labelled(text, "Amount paid") ??
      labelled(text, "Total") ??
      labelled(text, "Price") ??
      labelled(text, "Special rate"),
  );
}

/** Single block for a confirmation that states no trip date. */
function undatedBlock(subject: string, body: string, stripeRefs: string[]): VoucherBlock {
  const money = moneyFrom(body);
  const pax = parsePax(labelled(body, "Guests") ?? labelled(body, "Pax") ?? labelled(body, "Travellers"));
  const haystack = `${subject}\n${body}`;
  return {
    slot: 0,
    date: null,
    startTime: labelled(body, "Start time") ?? labelled(body, "Time"),
    tourTitle:
      cleanTourTitle(
        labelled(body, "Tour") ?? labelled(body, "Experience") ?? labelled(body, "Product"),
      ) ??
      titleFromSubject(subject) ??
      cleanTourTitle(headingAbove(body)),

    selectedRate: labelled(body, "Special rate") ?? labelled(body, "Rate"),
    pickup: labelled(body, "Pick-up") ?? labelled(body, "Pickup") ?? labelled(body, "Pick up"),
    dropoff: labelled(body, "Drop-off") ?? labelled(body, "Dropoff"),
    pax: pax.total,
    paxBreakdown: pax.breakdown,
    language: labelled(body, "Language"),
    inclusions: listAfter(body, "Included"),
    exclusions: listAfter(body, "Not included"),
    extras: listAfter(body, "Extras"),
    notes: labelled(body, "Notes") ?? labelled(body, "Special requests"),
    customerName:
      labelled(body, "Name") ?? labelled(body, "Guest") ?? labelled(body, "Client") ?? labelled(body, "Customer"),
    customerPhone: labelled(body, "Phone") ?? labelled(body, "WhatsApp"),
    amountCents: money.amount,
    currency: money.currency,
    confirmed: DIRECT_CONFIRM_MARKERS.some((re) => re.test(haystack)),
    stripeRefs,
  };
}

/**
 * Reads every booking block a sent confirmation contains. Returns an empty list
 * for anything that is not a confirmation or voucher.
 */
export function extractVoucherBlocks(input: { subject: string; body: string }): VoucherBlock[] {
  const subject = input.subject ?? "";
  const body = input.body ?? "";
  const stripeRefs = collectStripeRefs(`${subject}\n${body}`);
  const parsed = parseBookingEmail({ subject, from: "", body, sentByUs: true });

  if (parsed.kind === "direct" && parsed.bookings.length > 0) {
    return parsed.bookings.map((booking, index) => ({
      slot: index,
      date: booking.date,
      startTime: booking.startTime,
      tourTitle: booking.tourTitle,
      selectedRate: booking.selectedRate,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      pax: booking.pax,
      paxBreakdown: booking.paxBreakdown,
      language: booking.language,
      inclusions: booking.inclusions,
      exclusions: booking.exclusions,
      extras: booking.extras,
      notes: booking.notes,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      amountCents: booking.amountPaid ?? moneyFrom(body).amount,
      currency: booking.currency,
      confirmed: booking.paymentStatus === "PAID",
      stripeRefs,
    }));
  }

  // Only the "no readable date" case earns the tolerant fallback; marketing,
  // enquiries and refund threads stay ignored exactly as before.
  if (parsed.kind === "ignored" && parsed.reason !== "confirmation_without_parsable_date") return [];
  if (!isConfirmationVoucher(subject, body)) return [];
  return [undatedBlock(subject, body, stripeRefs)];
}

export type MatchRule =
  | "stripe_ref"
  | "email_amount_date"
  | "email_amount"
  | "email_date_tour"
  | "unique_attribution";

const RULE_SCORE: Record<MatchRule, number> = {
  stripe_ref: 100,
  email_amount_date: 95,
  email_amount: 90,
  email_date_tour: 80,
  unique_attribution: 60,
};

export const ruleScore = (rule: MatchRule): number => RULE_SCORE[rule];

export type StripeShell = {
  id: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_total: number | null;
  amount_paid: number | null;
  preferred_date: string | null;
  tour_title: string | null;
  created_at: string;
};

/**
 * Decides how strongly one voucher block identifies one Stripe reservation.
 * `soleCandidate` means: exactly one paid Stripe reservation exists for this
 * guest and exactly one confirmation block was found for them.
 */
export function classifyMatch(
  shell: StripeShell,
  block: VoucherBlock,
  options: { soleCandidate: boolean },
): MatchRule | null {
  const refs = [shell.stripe_session_id, shell.stripe_payment_intent_id].filter(Boolean) as string[];
  if (refs.some((ref) => block.stripeRefs.includes(ref))) return "stripe_ref";

  const amounts = [shell.amount_total, shell.amount_paid].filter((value): value is number => typeof value === "number" && value > 0);
  const amountMatches = block.amountCents != null && amounts.includes(block.amountCents);
  const dateMatches = !!block.date && !!shell.preferred_date && block.date === shell.preferred_date;

  if (amountMatches && dateMatches) return "email_amount_date";
  if (amountMatches && block.confirmed) return "email_amount";
  if (dateMatches && !!block.tourTitle) return "email_date_tour";
  if (options.soleCandidate && (block.confirmed || block.date || block.amountCents != null)) {
    return "unique_attribution";
  }
  return null;
}
