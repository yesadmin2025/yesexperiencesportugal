// Bokun REST helper — HMAC-SHA1 signing.
// Docs: https://bokun.dev/api/
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const BOKUN_HOST = "https://api.bokun.io";

function bokunDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

async function sign(
  secretKey: string,
  date: string,
  accessKey: string,
  method: string,
  path: string,
): Promise<string> {
  const message = `${date}${accessKey}${method.toUpperCase()}${path}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return encodeBase64(new Uint8Array(sig));
}

export async function bokunFetch(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<unknown> {
  const accessKey = Deno.env.get("BOKUN_ACCESS_KEY");
  const secretKey = Deno.env.get("BOKUN_SECRET_KEY");
  if (!accessKey || !secretKey) throw new Error("Bokun keys not configured");
  const date = bokunDate();
  const signature = await sign(secretKey, date, accessKey, method, path);
  const headers: Record<string, string> = {
    "X-Bokun-Date": date,
    "X-Bokun-AccessKey": accessKey,
    "X-Bokun-Signature": signature,
  };
  let bodyStr: string | undefined;
  if (body !== undefined) {
    bodyStr = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BOKUN_HOST}${path}`, { method, headers, body: bodyStr });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bokun ${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export interface AvailabilitySlot {
  id: number;
  startTime: string;
  date: string;
  availabilityCount: number;
  pricingCategories?: Array<{ id: number; title: string; minAge?: number; maxAge?: number }>;
}

/**
 * Get availability slots for a given Bokun activity on a specific date.
 * Returns whatever Bokun gives back; caller decides how to choose a slot.
 */
export async function getActivityAvailabilities(
  productId: string | number,
  dateISO: string, // YYYY-MM-DD
): Promise<AvailabilitySlot[]> {
  const path = `/activity.json/${productId}/availabilities?start=${dateISO}&end=${dateISO}&lang=EN&currency=EUR`;
  const data = (await bokunFetch(path, "GET")) as unknown;
  if (Array.isArray(data)) return data as AvailabilitySlot[];
  return [];
}

export interface BokunActivity {
  id: number | string;
  title: string;
  summary?: string;
  durationText?: string;
  inclusions: string[];
  exclusions: string[];
  raw: unknown;
}

const activityCache = new Map<string, { at: number; data: BokunActivity }>();
const ACTIVITY_TTL_MS = 60 * 60 * 1000; // 1h

/**
 * Fetch Bokun product details and normalise to a small, safe-to-render shape.
 * Cached for 1h per worker instance so checkout stays fast.
 */
export async function getActivity(productId: string | number): Promise<BokunActivity | null> {
  const key = String(productId);
  const cached = activityCache.get(key);
  if (cached && Date.now() - cached.at < ACTIVITY_TTL_MS) return cached.data;

  try {
    const data = (await bokunFetch(
      `/activity.json/${productId}?lang=EN&currency=EUR`,
      "GET",
    )) as Record<string, unknown> | null;
    if (!data) return null;

    const pickString = (v: unknown): string => (typeof v === "string" ? v : "");
    const pickArray = (v: unknown): string[] => {
      if (!Array.isArray(v)) return [];
      return v
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const o = item as Record<string, unknown>;
            return (
              pickString(o.title) ||
              pickString(o.name) ||
              pickString(o.item) ||
              pickString(o.description)
            );
          }
          return "";
        })
        .filter((s): s is string => Boolean(s && s.length));
    };

    // Bokun field names vary by tenant. Probe the common ones.
    const title =
      pickString(data.title) ||
      pickString(data.name) ||
      pickString(data.externalId) ||
      `Activity ${productId}`;
    const summary = pickString(data.summary) || pickString(data.shortDescription);
    const durationText =
      pickString(data.durationText) ||
      pickString(data.duration) ||
      (typeof data.durationMinutes === "number"
        ? `${Math.round((data.durationMinutes as number) / 60)} h`
        : "");
    const inclusions = pickArray(data.includedItems ?? data.included ?? data.inclusions);
    const exclusions = pickArray(data.excludedItems ?? data.excluded ?? data.exclusions);

    const normalised: BokunActivity = {
      id: productId,
      title,
      summary: summary || undefined,
      durationText: durationText || undefined,
      inclusions,
      exclusions,
      raw: data,
    };
    activityCache.set(key, { at: Date.now(), data: normalised });
    return normalised;
  } catch (e) {
    console.error("getActivity failed for", productId, e instanceof Error ? e.message : e);
    return null;
  }
}

// ---------- Category-aware pricing helpers ---------------------------------

export interface BokunRawCategory {
  id: number | string;
  title: string;
  minAge?: number;
  maxAge?: number;
  /** Base price when Bókun exposes one on the activity itself. */
  price?: number;
  defaultPrice?: number;
  pricePerGroup?: { amount?: number };
}

/** Extract category list from a fetched activity payload (Bókun tenants vary). */
export function extractActivityCategories(activity: unknown): BokunRawCategory[] {
  if (!activity || typeof activity !== "object") return [];
  const raw = (activity as Record<string, unknown>).pricingCategories;
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => c as BokunRawCategory);
}

/**
 * Resolve the unit price per Bókun category for one specific availability slot.
 * Prefers slot-level price → category-level price → activity default. Missing =
 * `null` (caller must NOT invent a value).
 */
export function pickSlotUnitPrice(
  slotCategory: Record<string, unknown> | undefined,
  activityCategory: BokunRawCategory | undefined,
): number | null {
  const candidates: unknown[] = [
    slotCategory?.price,
    slotCategory?.amount,
    (slotCategory?.pricePerGroup as Record<string, unknown> | undefined)?.amount,
    activityCategory?.price,
    (activityCategory as Record<string, unknown> | undefined)?.amount,
    activityCategory?.defaultPrice,
    activityCategory?.pricePerGroup?.amount,
  ];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 100) / 100;
  }
  return null;
}

/**
 * Probe multiple dates to detect whether a product's prices vary across dates
 * or across slots. Returns a `pricingMode` classification the sync writer can
 * store; callers with `date-dependent`+ MUST always request a live quote.
 */
export function detectPricingMode(
  perDate: Array<{ dateISO: string; slotUnitPrices: Array<Map<string /*catId*/, number>> }>,
): "flat" | "date-dependent" | "slot-dependent" | "inconsistent" {
  if (perDate.length === 0) return "inconsistent";

  // Slot variance within any single date → slot-dependent.
  for (const d of perDate) {
    for (const cat of catIds(d.slotUnitPrices)) {
      const uniq = new Set<number>();
      for (const slot of d.slotUnitPrices) {
        const v = slot.get(cat);
        if (typeof v === "number") uniq.add(v);
      }
      if (uniq.size > 1) return "slot-dependent";
    }
  }

  // Cross-date variance → date-dependent.
  const firstByCat = new Map<string, number>();
  let dateVaries = false;
  for (const d of perDate) {
    const flat = new Map<string, number>();
    for (const slot of d.slotUnitPrices) for (const [k, v] of slot) flat.set(k, v);
    for (const [cat, v] of flat) {
      if (!firstByCat.has(cat)) firstByCat.set(cat, v);
      else if (firstByCat.get(cat) !== v) dateVaries = true;
    }
  }
  if (dateVaries) return "date-dependent";
  return firstByCat.size ? "flat" : "inconsistent";
}
function catIds(slots: Array<Map<string, number>>): Set<string> {
  const s = new Set<string>();
  for (const slot of slots) for (const k of slot.keys()) s.add(k);
  return s;
}

// ---------- Reservation ----------------------------------------------------

export interface ReserveCategoryQty {
  pricingCategoryId: number;
  quantity: number;
}

export interface ReserveInput {
  productId: string | number;
  availabilityId: number;
  startTime: string;
  date: string;
  /** One entry per non-zero category. Infants included even at €0. */
  pricingCategoryBookings: ReserveCategoryQty[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    language?: string;
  };
  externalBookingReference?: string;
  notes?: string;
}

/**
 * Provisional reserve only — Bókun holds inventory but does NOT charge or
 * mark the booking as confirmed. Follow with `confirmReservation()` after
 * successful payment. Never collapses mixed-band parties into one line.
 */
export async function reserveActivity(input: ReserveInput): Promise<{
  reservationId: string;
  confirmationCode?: string;
  raw: unknown;
}> {
  if (!input.pricingCategoryBookings.length) {
    throw new Error("reserveActivity requires at least one pricingCategoryBookings entry");
  }
  const reserveBody = {
    activityBookings: [
      {
        activityId: Number(input.productId),
        startTimeId: input.availabilityId,
        startTime: input.startTime,
        date: input.date,
        pricingCategoryBookings: input.pricingCategoryBookings
          .filter((b) => b.quantity > 0)
          .map((b) => ({
            pricingCategoryId: Number(b.pricingCategoryId),
            quantity: b.quantity,
          })),
      },
    ],
    customer: {
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      email: input.customer.email,
      ...(input.customer.phoneNumber && { phoneNumber: input.customer.phoneNumber }),
      ...(input.customer.language && { language: input.customer.language }),
    },
    ...(input.externalBookingReference && {
      externalBookingReference: input.externalBookingReference,
    }),
    ...(input.notes && { note: input.notes }),
    source: "API",
    paymentType: "RESERVE_FOR_EXTERNAL_PAYMENT",
    ...(Deno.env.get("BOKUN_CHANNEL_UUID")
      ? { bookingChannel: { uuid: Deno.env.get("BOKUN_CHANNEL_UUID") } }
      : {}),
  };

  const reserved = (await bokunFetch(
    "/booking.json/activity-booking/reserve",
    "POST",
    reserveBody,
  )) as { confirmationCode?: string; id?: number | string; bookingId?: number | string } | null;

  const reservationId = String(reserved?.id ?? reserved?.bookingId ?? "");
  if (!reservationId) throw new Error("Bokun reserve returned no booking id");

  return {
    reservationId,
    confirmationCode: reserved?.confirmationCode,
    raw: reserved,
  };
}

/**
 * Confirm a previously-reserved Bókun booking. Idempotent server-side —
 * repeated calls against an already-confirmed booking return the current
 * state without creating a second booking.
 */
export async function confirmReservation(reservationId: string): Promise<{
  bookingId: string;
  confirmationCode?: string;
  raw: unknown;
}> {
  if (!reservationId) throw new Error("confirmReservation requires reservationId");
  const raw = (await bokunFetch(
    `/booking.json/${reservationId}/confirm`,
    "POST",
    {},
  )) as { confirmationCode?: string } | null;
  return {
    bookingId: reservationId,
    confirmationCode: raw?.confirmationCode,
    raw,
  };
}

/**
 * Best-effort release of a provisional reservation (used when Stripe
 * session creation fails after Bókun reserve succeeded). Never throws —
 * Bókun typically expires unclaimed provisional holds automatically.
 */
export async function releaseReservation(reservationId: string): Promise<boolean> {
  if (!reservationId) return false;
  try {
    await bokunFetch(`/booking.json/${reservationId}/cancel`, "POST", { reason: "abandoned" });
    return true;
  } catch (e) {
    console.warn(
      "releaseReservation failed (letting hold expire):",
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/**
 * Legacy combined reserve+confirm. Kept for the pre-reservation-spine webhook
 * fallback (non-v3 bookings) and any external caller still on the old contract.
 * New v3 flow uses `reserveActivity` (pre-Stripe) + `confirmReservation`
 * (webhook) so the webhook never creates a second Bókun booking.
 */
export async function reserveAndConfirm(input: ReserveInput): Promise<{
  bookingId: string;
  confirmationCode?: string;
  raw: unknown;
}> {
  const reserved = await reserveActivity(input);
  try {
    const confirmed = await confirmReservation(reserved.reservationId);
    return {
      bookingId: reserved.reservationId,
      confirmationCode: confirmed.confirmationCode ?? reserved.confirmationCode,
      raw: reserved.raw,
    };
  } catch (e) {
    throw new Error(
      `Reserved ${reserved.reservationId} but confirm failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
