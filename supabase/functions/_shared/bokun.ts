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
            return pickString(o.title) || pickString(o.name) || pickString(o.item) || pickString(o.description);
          }
          return "";
        })
        .filter((s): s is string => Boolean(s && s.length));
    };

    // Bokun field names vary by tenant. Probe the common ones.
    const title =
      pickString(data.title) || pickString(data.name) || pickString(data.externalId) || `Activity ${productId}`;
    const summary = pickString(data.summary) || pickString(data.shortDescription);
    const durationText =
      pickString(data.durationText) ||
      pickString(data.duration) ||
      (typeof data.durationMinutes === "number" ? `${Math.round((data.durationMinutes as number) / 60)} h` : "");
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

export interface ReserveInput {
  productId: string | number;
  availabilityId: number;
  startTime: string;
  date: string;
  guests: number;
  pricingCategoryId: number;
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
 * Best-effort: reserve + confirm an activity booking via Bokun REST.
 * Throws on any HTTP error so the caller can record the failure.
 */
export async function reserveAndConfirm(input: ReserveInput): Promise<{
  bookingId: string;
  confirmationCode?: string;
  raw: unknown;
}> {
  // Step 1: reserve
  const reserveBody = {
    activityBookings: [
      {
        activityId: Number(input.productId),
        startTimeId: input.availabilityId,
        startTime: input.startTime,
        date: input.date,
        pricingCategoryBookings: [
          { pricingCategoryId: input.pricingCategoryId, quantity: input.guests },
        ],
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
  };

  const reserved = (await bokunFetch(
    "/booking.json/activity-booking/reserve",
    "POST",
    reserveBody,
  )) as { confirmationCode?: string; id?: number | string; bookingId?: number | string } | null;

  const bookingId = String(reserved?.id ?? reserved?.bookingId ?? "");
  if (!bookingId) throw new Error("Bokun reserve returned no booking id");

  // Step 2: confirm
  try {
    await bokunFetch(`/booking.json/${bookingId}/confirm`, "POST", {});
  } catch (e) {
    // Reservation exists but confirm failed — surface to caller.
    throw new Error(
      `Reserved ${bookingId} but confirm failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  return {
    bookingId,
    confirmationCode: reserved?.confirmationCode,
    raw: reserved,
  };
}
