/**
 * Bókun API/webhook abstraction — the secondary ingestion path.
 *
 * Email is the operational safety net today; this module is the clean seam for
 * Bókun's own API and webhooks, reusing the same normalise + dedupe pipeline.
 * Without credentials it stays disabled and reports `configured: false` so the
 * admin surface shows a setup state instead of pretending to sync.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { ParsedBooking, SourceChannel } from "@/lib/ingestion/booking-email-parser";
import { channelFromText } from "@/lib/ingestion/booking-email-parser";

const BOKUN_API_BASE = "https://api.bokun.io";

export function bokunConfigured(): boolean {
  return Boolean(process.env["BOKUN_ACCESS_KEY"] && process.env["BOKUN_SECRET_KEY"]);
}

export function bokunWebhookConfigured(): boolean {
  return Boolean(process.env["BOKUN_WEBHOOK_SECRET"]);
}

/** Constant-time HMAC-SHA256 check of a Bókun webhook signature. */
export function verifyBokunSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env["BOKUN_WEBHOOK_SECRET"];
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.trim().replace(/^sha256=/i, "");
  if (received.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export type BokunBookingPayload = {
  confirmationCode?: string;
  productBookingRef?: string;
  externalBookingReference?: string;
  status?: string;
  action?: string;
  productTitle?: string;
  productCode?: string;
  rateTitle?: string;
  customer?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  startDate?: string;
  startTime?: string;
  totalParticipants?: number;
  pickupPlace?: { title?: string } | string;
  dropoffPlace?: { title?: string } | string;
  language?: string;
  soldBy?: string;
  channel?: string;
  extras?: Array<{ title?: string } | string>;
  notes?: string;
  totalPaid?: number;
  currency?: string;
};

const placeTitle = (place: BokunBookingPayload["pickupPlace"]): string | null => {
  if (!place) return null;
  if (typeof place === "string") return place.trim() || null;
  return place.title?.trim() || null;
};

/**
 * Maps a Bókun payload onto the same normalised shape the email parser emits,
 * so the dedupe and review rules are identical for both sources.
 */
export function mapBokunPayload(payload: BokunBookingPayload): ParsedBooking {
  const cancelled = /cancel/i.test(payload.status ?? payload.action ?? "");
  const channel: SourceChannel = channelFromText(payload.channel ?? payload.soldBy ?? null);
  const name = [payload.customer?.firstName, payload.customer?.lastName].filter(Boolean).join(" ").trim();
  const extras = (payload.extras ?? [])
    .map((extra) => (typeof extra === "string" ? extra : extra.title ?? ""))
    .map((title) => title.trim())
    .filter(Boolean);

  const booking: ParsedBooking = {
    slot: 0,
    intent: cancelled ? "cancel" : "create",
    parser: "bokun",
    sourceChannel: channel,
    externalBookingRef: payload.externalBookingReference?.trim() || payload.confirmationCode?.trim() || null,
    productBookingRef: payload.productBookingRef?.trim() || payload.confirmationCode?.trim() || null,
    externalProductRef: payload.productCode?.trim() || payload.productTitle?.trim() || null,
    tourTitle: payload.productTitle?.trim() || null,
    productCode: payload.productCode?.trim() || null,
    selectedRate: payload.rateTitle?.trim() || null,
    customerName: name || null,
    customerEmail: payload.customer?.email?.trim().toLowerCase() || null,
    customerPhone: payload.customer?.phoneNumber?.trim() || null,
    date: payload.startDate?.slice(0, 10) ?? null,
    startTime: payload.startTime?.trim() || null,
    pax: typeof payload.totalParticipants === "number" ? payload.totalParticipants : null,
    paxBreakdown: null,
    pickup: placeTitle(payload.pickupPlace),
    dropoff: placeTitle(payload.dropoffPlace),
    language: payload.language?.trim() || null,
    extras,
    inclusions: [],
    exclusions: [],
    notes: payload.notes?.trim() || null,
    amountPaid: typeof payload.totalPaid === "number" ? Math.round(payload.totalPaid * 100) : null,
    currency: payload.currency?.toUpperCase() ?? null,
    paymentStatus: cancelled ? "UNKNOWN" : "PAID",
    bookingStatus: cancelled ? "cancelled" : "paid",
    confidence: 0.95,
    missingFields: [],
    reviewRequired: false,
    reviewReason: null,
  };

  const missing: string[] = [];
  if (!booking.date) missing.push("date");
  if (!booking.tourTitle && !booking.externalProductRef) missing.push("tour");
  if (!booking.customerEmail) missing.push("customer");
  booking.missingFields = missing;
  if (booking.intent === "create" && (missing.includes("date") || missing.includes("tour"))) {
    booking.reviewRequired = true;
    booking.reviewReason = `Key fields missing: ${missing.join(", ")}`;
  }
  return booking;
}

/** Signed Bókun REST call. Throws when credentials are absent. */
export async function bokunRequest(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<unknown> {
  const accessKey = process.env["BOKUN_ACCESS_KEY"];
  const secretKey = process.env["BOKUN_SECRET_KEY"];
  if (!accessKey || !secretKey) throw new Error("bokun_not_configured");

  const date = new Date().toISOString().replace("T", " ").slice(0, 19);
  const signature = createHmac("sha1", secretKey)
    .update(`${date}${accessKey}${method}${path}`)
    .digest("base64");

  const response = await fetch(`${BOKUN_API_BASE}${path}`, {
    method,
    headers: {
      "X-Bokun-Date": date,
      "X-Bokun-AccessKey": accessKey,
      "X-Bokun-Signature": signature,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`bokun_request_failed [${response.status}]: ${detail.slice(0, 400)}`);
  }
  return response.json();
}
