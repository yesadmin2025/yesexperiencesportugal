// Server-side revalidation of a signed Bókun quote token.
//
// Runs immediately before Stripe session creation and (optionally) before the
// Bókun reservation call. Refetches the exact slot from Bókun, recomputes the
// unit price per requested pricing category, and compares against the signed
// token. Any drift beyond 1 cent per line ⇒ stale quote.
//
// This is the SINGLE authority. Never let the browser or Stripe be the source
// of price truth for banded checkouts.

import {
  bokunFetch,
  extractActivityCategories,
  getActivityAvailabilities,
  pickSlotUnitPrice,
  type AvailabilitySlot,
  type BokunRawCategory,
} from "./bokun.ts";
import {
  verifyBokunQuoteToken,
  type BokunQuoteLine,
  type BokunQuoteTokenPayload,
} from "./bokunQuoteToken.ts";

export interface RevalidatedQuote {
  ok: boolean;
  reason?: string;
  payload: BokunQuoteTokenPayload | null;
  slot: AvailabilitySlot | null;
  lines: BokunQuoteLine[];
  finalTotalEur: number;
  driftCents: number;
}

const CENT_TOLERANCE_PER_LINE = 1;

export async function revalidateBokunQuote(
  token: string,
  secret: string,
): Promise<RevalidatedQuote> {
  const empty = (reason: string, payload: BokunQuoteTokenPayload | null = null): RevalidatedQuote => ({
    ok: false,
    reason,
    payload,
    slot: null,
    lines: [],
    finalTotalEur: 0,
    driftCents: 0,
  });

  let payload: BokunQuoteTokenPayload;
  try {
    payload = await verifyBokunQuoteToken(token, secret);
  } catch (e) {
    return empty(`token_invalid: ${e instanceof Error ? e.message : String(e)}`);
  }

  const slots = await getActivityAvailabilities(payload.bokunProductId, payload.date);
  const wanted = payload.availabilityId ? String(payload.availabilityId) : null;
  const slot =
    (wanted ? slots.find((s) => String(s.id) === wanted) : null) ??
    (payload.startTime ? slots.find((s) => s.startTime === payload.startTime) : null) ??
    null;
  if (!slot) return empty("slot_missing", payload);
  if ((slot.availabilityCount ?? 0) < payload.totalParticipants) {
    return empty("slot_capacity_lost", payload);
  }

  // Fallback catalogue for infants that don't appear on the slot but do on activity.
  let activityCats: BokunRawCategory[] = [];
  try {
    const activity = await bokunFetch(
      `/activity.json/${payload.bokunProductId}?lang=EN&currency=EUR`,
      "GET",
    );
    activityCats = extractActivityCategories(activity);
  } catch { /* non-fatal */ }

  const slotCatById = new Map<string, Record<string, unknown>>();
  for (const c of slot.pricingCategories ?? []) {
    slotCatById.set(String(c.id), c as unknown as Record<string, unknown>);
  }

  const rebuilt: BokunQuoteLine[] = [];
  let totalDriftCents = 0;
  for (const line of payload.lines) {
    const slotCat = slotCatById.get(line.bokunCategoryId);
    const activityCat = activityCats.find((c) => String(c.id) === line.bokunCategoryId);
    let unit = pickSlotUnitPrice(slotCat, activityCat);
    if (unit == null) {
      // Infants can be missing on slot but effectively free.
      if (line.uiBand === "infant" && line.unitEur === 0) unit = 0;
      else return empty(`price_missing_${line.uiBand}`, payload);
    }
    const rebuiltLine: BokunQuoteLine = {
      ...line,
      unitEur: unit,
      subtotalEur: Math.round(unit * line.quantity * 100) / 100,
    };
    rebuilt.push(rebuiltLine);
    const drift = Math.abs(Math.round((unit - line.unitEur) * 100)) * line.quantity;
    totalDriftCents += drift;
    if (Math.abs(Math.round((unit - line.unitEur) * 100)) > CENT_TOLERANCE_PER_LINE) {
      return empty(`price_drift_${line.uiBand}`, payload);
    }
  }

  const finalTotalEur =
    Math.round(rebuilt.reduce((s, l) => s + l.subtotalEur, 0) * 100) / 100;
  const totalDrift = Math.abs(Math.round((finalTotalEur - payload.finalTotalEur) * 100));
  if (totalDrift > CENT_TOLERANCE_PER_LINE * rebuilt.length) {
    return { ok: false, reason: "total_drift", payload, slot, lines: rebuilt, finalTotalEur, driftCents: totalDrift };
  }

  return { ok: true, payload, slot, lines: rebuilt, finalTotalEur, driftCents: totalDriftCents };
}
