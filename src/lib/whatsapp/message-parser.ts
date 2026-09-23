/**
 * Deterministic reader for WhatsApp chat messages.
 *
 * WhatsApp is an operational evidence source, never a source of truth for
 * money. This parser reads only what a message actually states: a stated date
 * is read, an implied one is not. Questions, quotes, "maybe" and availability
 * checks are explicitly NOT confirmations, so a casual enquiry can never turn
 * into a booking.
 */
import { parseDateToken, parseMoney, parsePax } from "@/lib/ingestion/booking-email-parser";
import { findPhoneInText } from "./phone";

export type WhatsAppIntent =
  | "confirmation"
  | "cancellation"
  | "reschedule"
  | "refund"
  | "operational"
  | "inquiry";

export type WhatsAppFacts = {
  intent: WhatsAppIntent;
  /** Explicit confirmation / fully paid wording, with no hedging. */
  confirmed: boolean;
  /** Explicit cancellation of an agreed booking. */
  cancelled: boolean;
  /** Explicit refund or chargeback statement. */
  refund: boolean;
  /** Explicit request to move the date or time. */
  reschedule: boolean;
  date: string | null;
  /** Every date the message actually states, in the order written. */
  dates: string[];
  startTime: string | null;
  pickup: string | null;
  dropoff: string | null;
  tourTitle: string | null;
  pax: number | null;
  paxBreakdown: Record<string, number> | null;
  phone: string | null;
  language: string | null;
  extras: string[];
  occasion: string | null;
  dietary: string[];
  accessibility: string[];
  itineraryChange: boolean;
  amountCents: number | null;
  currency: string | null;
  notes: string | null;
  /** True when the message states at least one operational fact. */
  hasOperationalDetail: boolean;
};

const CONFIRM = [
  /\b(?:booking|reservation|tour|day)\s+(?:is\s+)?confirmed\b/i,
  /\bconfirmed\s*(?:&|and)\s*fully\s*paid\b/i,
  /\bfully\s+paid\b/i,
  /\bpayment\s+(?:received|completed|done|sent|went through)\b/i,
  /\b(?:i|we)\s+(?:just\s+)?(?:paid|have paid|completed the payment)\b/i,
  /\b(?:we(?:'| a)re|i(?:'m| am))\s+(?:all\s+)?(?:set|booked|confirmed)\b/i,
  /\b(?:yes,?\s+)?(?:please\s+)?(?:go ahead and\s+)?confirm(?:\s+(?:it|the booking|our booking|please))\b/i,
];

const HEDGED = [
  /\bmaybe\b/i,
  /\bperhaps\b/i,
  /\bthinking (?:about|of)\b/i,
  /\bwe might\b/i,
  /\bi might\b/i,
  /\bnot sure\b/i,
  /\bhow much\b/i,
  /\bprice list\b/i,
  /\bquote\b/i,
  /\bproposal\b/i,
  /\bavailab(?:le|ility)\b/i,
  /\bdo you have\b/i,
  /\bis it possible\b/i,
  /\bcould you (?:tell|send)\b/i,
  /\bwould like to know\b/i,
  /\bjust (?:wondering|asking|checking)\b/i,
];

const CANCEL = [
  /\bcancel(?:l(?:ed|ing))?\b/i,
  /\bwe (?:can'?t|cannot|won'?t be able to) (?:make it|come|join)\b/i,
  /\bnot coming\b/i,
  /\bcall (?:it|the tour) off\b/i,
];

const REFUND = [/\brefund(?:ed|ing)?\b/i, /\bchargeback\b/i, /\bmoney back\b/i];

const RESCHEDULE = [
  /\bresched(?:ule|uled|uling)\b/i,
  /\bpostpone\b/i,
  /\bmove (?:it|the tour|our tour|the booking) to\b/i,
  /\bchange (?:the )?(?:date|day|time)\b/i,
  /\bdifferent (?:date|day)\b/i,
];

const ITINERARY_CHANGE = [
  /\binstead of\b/i,
  /\bswap\b/i,
  /\breplace\b/i,
  /\badd (?:a |another )?stop\b/i,
  /\bskip (?:the )?\w+/i,
];

const LANGUAGES = ["english", "portuguese", "spanish", "french", "german", "italian", "dutch"];

const OCCASIONS = [
  "anniversary",
  "birthday",
  "honeymoon",
  "proposal",
  "wedding",
  "graduation",
  "babymoon",
];

const DIETARY =
  /\b(vegetarian|vegan|gluten[-\s]?free|lactose[-\s]?(?:free|intolerant)|nut allergy|shellfish allergy|allergic to [a-z ]{3,30}|pescatarian|halal|kosher)\b/gi;

const ACCESSIBILITY =
  /\b(wheelchair(?: user| access(?:ible)?)?|reduced mobility|walking difficult\w*|pram|stroller|hearing aid)\b/gi;

const hit = (patterns: RegExp[], text: string) => patterns.some((pattern) => pattern.test(text));

const clean = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim().replace(/[,;.]$/, "");
  return text.length >= 2 && text.length <= 200 ? text : null;
};

const TIME_ONLY = /^(?:at\s+)?(?:[01]?\d|2[0-3])[:h][0-5]\d\s*(?:am|pm)?$/i;

function capture(text: string, pattern: RegExp): string | null {
  const match = pattern.exec(text);
  return match ? clean(match[1] ?? null) : null;
}

/** Only a date the guest actually wrote, never "next Saturday". */
function statedDate(text: string): { date: string | null; time: string | null } {
  return parseDateToken(text);
}

function listFrom(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;]|\band\b|\+/i)
    .map((entry) => clean(entry))
    .filter((entry): entry is string => !!entry && entry.length >= 3)
    .slice(0, 8);
}

function uniqueMatches(text: string, pattern: RegExp): string[] {
  const out = new Set<string>();
  for (const match of text.matchAll(pattern)) {
    const value = clean(match[1] ?? match[0]);
    if (value) out.add(value.toLowerCase());
  }
  return [...out].slice(0, 8);
}

export function parseWhatsAppMessage(input: { body: string | null | undefined }): WhatsAppFacts {
  const body = (input.body ?? "").replace(/\u00a0/g, " ");
  const text = body.trim();

  const hedged = hit(HEDGED, text);
  const cancelled = hit(CANCEL, text) && !/\bcancellation policy\b/i.test(text);
  const refund = hit(REFUND, text);
  const reschedule = hit(RESCHEDULE, text);
  const confirmed = hit(CONFIRM, text) && !hedged && !cancelled && !refund;

  const { date, time } = statedDate(text);

  const pickupRaw =
    capture(text, /pick(?:\s|-)?up(?:\s+(?:is|at|from|point|location))?\s*:?\s*([^\n.!?]{3,140})/i) ??
    capture(text, /(?:collect|pick)\s+us\s+(?:up\s+)?(?:at|from)\s+([^\n.!?]{3,140})/i);
  const pickup = pickupRaw && !TIME_ONLY.test(pickupRaw) ? pickupRaw : null;

  const dropoffRaw = capture(
    text,
    /drop(?:\s|-)?off(?:\s+(?:is|at|point|location))?\s*:?\s*([^\n.!?]{3,140})/i,
  );
  const dropoff = dropoffRaw && !TIME_ONLY.test(dropoffRaw) ? dropoffRaw : null;

  const explicitTime =
    capture(text, /(?:start|pick(?:\s|-)?up|meet)\s*(?:time)?\s*(?:at|:)\s*((?:[01]?\d|2[0-3])[:h][0-5]\d)/i) ??
    (pickupRaw && TIME_ONLY.test(pickupRaw) ? pickupRaw.replace(/^at\s+/i, "") : null) ??
    time;
  const startTime = explicitTime ? explicitTime.replace("h", ":") : null;

  const paxSegment = capture(
    text,
    /(\d{1,2}\s*(?:adults?|children|child|kids?|infants?|teens?|seniors?|people|persons?|guests?|pax|travellers?|travelers?)(?:[^\n.!?]{0,60})?)/i,
  );
  const pax = parsePax(paxSegment);

  const amountSegment = capture(text, /((?:€|eur\s?)\s?[\d.,]+|[\d.,]+\s?(?:€|eur\b))/i);
  const money = parseMoney(amountSegment);

  const languageHit = LANGUAGES.find((language) => new RegExp(`\\b${language}\\b`, "i").test(text));
  const occasion = OCCASIONS.find((entry) => new RegExp(`\\b${entry}\\b`, "i").test(text)) ?? null;

  const extras = listFrom(
    capture(text, /(?:add(?:\s|-)?ons?|extras?|we(?:'| woul)d like to add)\s*:?\s*([^\n.!?]{3,180})/i),
  );

  const tourTitle = clean(
    capture(text, /(?:tour|experience|day)\s*:\s*([^\n]{6,90})/i) ??
      capture(text, /\bthe\s+((?:[A-Z][\w'&-]+\s+){1,5}(?:Tour|Day|Experience|Workshop|Wine Day))\b/),
  );

  const dietary = uniqueMatches(text, DIETARY);
  const accessibility = uniqueMatches(text, ACCESSIBILITY);

  const intent: WhatsAppIntent = refund
    ? "refund"
    : cancelled
      ? "cancellation"
      : reschedule
        ? "reschedule"
        : confirmed
          ? "confirmation"
          : hedged || text.trim().endsWith("?")
            ? "inquiry"
            : date || pickup || dropoff || pax.total || extras.length
              ? "operational"
              : "inquiry";

  const hasOperationalDetail = !!(
    date ||
    startTime ||
    pickup ||
    dropoff ||
    tourTitle ||
    pax.total ||
    extras.length ||
    occasion ||
    dietary.length ||
    accessibility.length
  );

  return {
    intent,
    confirmed,
    cancelled,
    refund,
    reschedule,
    date,
    dates,
    startTime,
    pickup,
    dropoff,
    tourTitle,
    pax: pax.total,
    paxBreakdown: pax.breakdown,
    phone: findPhoneInText(text),
    language: languageHit ? languageHit.charAt(0).toUpperCase() + languageHit.slice(1) : null,
    extras,
    occasion,
    dietary,
    accessibility,
    itineraryChange: hit(ITINERARY_CHANGE, text),
    amountCents: money.amount,
    currency: money.currency,
    notes: null,
    hasOperationalDetail,
  };
}

/** Evidence rules, strongest first. */
export type WhatsAppMatchRule =
  | "phone_date_amount"
  | "phone_date"
  | "phone_amount"
  | "phone_tour_date"
  | "phone_unique"
  | "cross_source_phone";

const RULE_SCORE: Record<WhatsAppMatchRule, number> = {
  phone_date_amount: 100,
  phone_date: 95,
  phone_amount: 90,
  phone_tour_date: 88,
  phone_unique: 70,
  cross_source_phone: 65,
};

export const whatsappRuleScore = (rule: WhatsAppMatchRule): number => RULE_SCORE[rule];

export type BookingCandidate = {
  id: string;
  preferred_date: string | null;
  tour_title: string | null;
  amount_total: number | null;
  amount_paid: number | null;
  created_at: string;
  status: string;
  /** True when the phone came from another source (a Gmail thread), not the row. */
  crossSource?: boolean;
};

/**
 * How strongly one chat message identifies one reservation. `soleCandidate`
 * means exactly one reservation exists for this phone number.
 */
export function classifyWhatsAppMatch(
  booking: BookingCandidate,
  facts: WhatsAppFacts,
  options: { soleCandidate: boolean },
): WhatsAppMatchRule | null {
  const amounts = [booking.amount_total, booking.amount_paid].filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  const amountMatches = facts.amountCents != null && amounts.includes(facts.amountCents);
  const dateMatches = !!facts.date && !!booking.preferred_date && facts.date === booking.preferred_date;
  const tourMatches =
    !!facts.tourTitle &&
    !!booking.tour_title &&
    booking.tour_title.toLowerCase().includes(facts.tourTitle.toLowerCase().slice(0, 12));

  if (booking.crossSource) return dateMatches || amountMatches ? "cross_source_phone" : null;
  if (dateMatches && amountMatches) return "phone_date_amount";
  if (dateMatches) return "phone_date";
  if (amountMatches) return "phone_amount";
  if (tourMatches && facts.date) return "phone_tour_date";
  if (options.soleCandidate) return "phone_unique";
  return null;
}
