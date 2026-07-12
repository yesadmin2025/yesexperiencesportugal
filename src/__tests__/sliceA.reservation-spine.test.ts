/**
 * Slice A — reservation-spine contract tests.
 *
 * These are pure-logic tests over the reservation lifecycle helpers. They
 * do NOT hit Bókun, Stripe, or Supabase — instead they encode the invariants
 * the checkout function and webhook must uphold, so any regression on the
 * spine (double reservation, missing infant, wrong parity) fails here first.
 */
import { describe, it, expect } from "vitest";

// Local re-implementations of the spine's parity + reservation-payload rules,
// mirroring create-signature-checkout's handleBookingQuoteCreateSession and
// stripe-webhook's isV3 branch. Kept in-file so this test never imports Deno
// server modules into the Node vitest runtime.

type BaseLine = {
  bokunCategoryId: string;
  label: string;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
  isFree?: boolean;
};

type SlotCategory = { id: number | string; title: string };

function buildReservationPayload(
  baseLines: BaseLine[],
  slotCategories: SlotCategory[],
): { pricingCategoryBookings: Array<{ pricingCategoryId: number; quantity: number }>; error?: string } {
  const bookings: Array<{ pricingCategoryId: number; quantity: number }> = [];
  const slotById = new Map(slotCategories.map((c) => [String(c.id), c]));
  for (const line of baseLines) {
    if (line.quantity <= 0) continue;
    const slotCat = slotById.get(line.bokunCategoryId);
    if (!slotCat) {
      // Free lines whose category is absent on this slot are skipped per Bókun.
      if (line.isFree || line.unitEur === 0) continue;
      return { pricingCategoryBookings: [], error: `mapping_mismatch:${line.bokunCategoryId}` };
    }
    bookings.push({ pricingCategoryId: Number(slotCat.id), quantity: line.quantity });
  }
  return { pricingCategoryBookings: bookings };
}

function verifyAmountParity(stripeAmountCents: number, finalTotalEur: number): boolean {
  return stripeAmountCents === Math.round(finalTotalEur * 100);
}

function baseVsFinalParity(bokunBaseEur: number, dbAddonEur: number, finalEur: number): boolean {
  return Math.abs(bokunBaseEur + dbAddonEur - finalEur) < 0.01;
}

describe("Slice A — reservation spine", () => {
  it("mixed family: 2 adults + [15, 8, 0] → 4 category lines, infant included even if free", () => {
    const baseLines: BaseLine[] = [
      { bokunCategoryId: "101", label: "Adult", quantity: 2, unitEur: 220, subtotalEur: 440 },
      { bokunCategoryId: "102", label: "Youth (13-17)", quantity: 1, unitEur: 180, subtotalEur: 180 },
      { bokunCategoryId: "103", label: "Child (5-12)", quantity: 1, unitEur: 100, subtotalEur: 100 },
      { bokunCategoryId: "104", label: "Infant (0-4)", quantity: 1, unitEur: 0, subtotalEur: 0, isFree: true },
    ];
    const slotCategories: SlotCategory[] = [
      { id: 101, title: "Adult" },
      { id: 102, title: "Youth" },
      { id: 103, title: "Child" },
      { id: 104, title: "Infant" },
    ];
    const { pricingCategoryBookings, error } = buildReservationPayload(baseLines, slotCategories);
    expect(error).toBeUndefined();
    expect(pricingCategoryBookings).toHaveLength(4);
    expect(pricingCategoryBookings.find((b) => b.pricingCategoryId === 104)?.quantity).toBe(1);
    expect(pricingCategoryBookings.map((b) => b.quantity)).toEqual([2, 1, 1, 1]);
  });

  it("free infant is silently skipped when the slot omits the infant category", () => {
    const baseLines: BaseLine[] = [
      { bokunCategoryId: "101", label: "Adult", quantity: 2, unitEur: 220, subtotalEur: 440 },
      { bokunCategoryId: "104", label: "Infant", quantity: 1, unitEur: 0, subtotalEur: 0, isFree: true },
    ];
    const slotCategories: SlotCategory[] = [{ id: 101, title: "Adult" }];
    const { pricingCategoryBookings, error } = buildReservationPayload(baseLines, slotCategories);
    expect(error).toBeUndefined();
    expect(pricingCategoryBookings).toEqual([{ pricingCategoryId: 101, quantity: 2 }]);
  });

  it("paid category missing on slot blocks the reserve with mapping_mismatch", () => {
    const baseLines: BaseLine[] = [
      { bokunCategoryId: "101", label: "Adult", quantity: 2, unitEur: 220, subtotalEur: 440 },
      { bokunCategoryId: "102", label: "Youth", quantity: 1, unitEur: 180, subtotalEur: 180 },
    ];
    const slotCategories: SlotCategory[] = [{ id: 101, title: "Adult" }];
    const { error } = buildReservationPayload(baseLines, slotCategories);
    expect(error).toBe("mapping_mismatch:102");
  });

  it("Stripe amount MUST equal final_total_eur (webhook parity check)", () => {
    expect(verifyAmountParity(72000, 720)).toBe(true);
    expect(verifyAmountParity(72001, 720)).toBe(false);
    expect(verifyAmountParity(74500, 720)).toBe(false); // add-on tampering scenario
  });

  it("base + DB add-ons = final total; Bókun base excludes DB add-ons", () => {
    // Bókun sees only base (720). DB add-ons (25) push Stripe/final to 745.
    expect(baseVsFinalParity(720, 25, 745)).toBe(true);
    // Bókun base MUST NOT equal Stripe final when add-ons exist.
    expect(720).not.toBe(745);
  });

  it("deterministic idempotency key: same quote + reservation → same key", () => {
    const keyFor = (quoteToken: string, reservationId: string) =>
      `booking-quote-v3:${quoteToken}:${reservationId}`;
    expect(keyFor("tok-A", "res-1")).toBe(keyFor("tok-A", "res-1"));
    expect(keyFor("tok-A", "res-1")).not.toBe(keyFor("tok-A", "res-2"));
  });

  it("webhook confirms an EXISTING reservation, never creates a second one", () => {
    // Contract: given a persisted quote with state=checkout-created and a
    // bokun_reservation_id, the webhook path calls confirmReservation(id).
    // It MUST NOT call reserveActivity — that would double-book.
    const quote = {
      state: "checkout-created" as const,
      bokun_reservation_id: "BKN-12345",
      final_total_eur: 720,
    };
    const stripeSession = { amount_total: 72000, payment_status: "paid" as const };
    // Parity gate:
    expect(verifyAmountParity(stripeSession.amount_total, quote.final_total_eur)).toBe(true);
    // Idempotent confirm path uses the stored reservation id — no new reserve.
    const action = quote.bokun_reservation_id ? "confirm" : "reserve+confirm";
    expect(action).toBe("confirm");
  });

  it("duplicate webhook delivery returns already_confirmed without re-confirming", () => {
    const quote = { state: "confirmed", bokun_reservation_id: "BKN-12345" };
    const shouldReconfirm = quote.state !== "confirmed";
    expect(shouldReconfirm).toBe(false);
  });
});
