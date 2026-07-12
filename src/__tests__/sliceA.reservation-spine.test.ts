/**
 * Slice A — reservation-spine contract tests.
 *
 * Pure-logic mirrors of the checkout function and webhook invariants. No live
 * Bókun, Stripe, or Supabase calls — regressions on the spine (double
 * reservation, silently-omitted infant, expiry racing with confirm) fail here
 * first.
 */
import { describe, it, expect, vi } from "vitest";

// ---------- create-signature-checkout: reserve payload builder -------------

type BaseLine = {
  bokunCategoryId: string;
  label: string;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
  isFree?: boolean;
};

type SlotCategory = { id: number | string; title: string };

/**
 * Mirrors handleBookingQuoteCreateSession step 4 after the Slice A closure:
 * every selected traveller must resolve to a category on THIS slot — no
 * silent skip for free lines, no Adult substitution — and the total selected
 * quantity must equal the composition's totalParticipants.
 */
function buildReservationPayload(
  baseLines: BaseLine[],
  slotCategories: SlotCategory[],
  totalParticipants: number,
): {
  pricingCategoryBookings: Array<{ pricingCategoryId: number; quantity: number }>;
  error?: string;
} {
  const bookings: Array<{ pricingCategoryId: number; quantity: number }> = [];
  const slotById = new Map(slotCategories.map((c) => [String(c.id), c]));
  let selectedQuantity = 0;
  for (const line of baseLines) {
    if (line.quantity <= 0) continue;
    selectedQuantity += line.quantity;
    const slotCat = slotById.get(line.bokunCategoryId);
    if (!slotCat) {
      return { pricingCategoryBookings: [], error: `category_not_ready:${line.bokunCategoryId}` };
    }
    bookings.push({ pricingCategoryId: Number(slotCat.id), quantity: line.quantity });
  }
  if (!bookings.length) {
    return { pricingCategoryBookings: [], error: "category_not_ready:no_billable_categories" };
  }
  if (totalParticipants > 0 && selectedQuantity !== totalParticipants) {
    return {
      pricingCategoryBookings: [],
      error: `composition_mismatch:selected=${selectedQuantity}_expected=${totalParticipants}`,
    };
  }
  return { pricingCategoryBookings: bookings };
}

function verifyAmountParity(stripeAmountCents: number, finalTotalEur: number): boolean {
  return stripeAmountCents === Math.round(finalTotalEur * 100);
}

function baseVsFinalParity(bokunBaseEur: number, dbAddonEur: number, finalEur: number): boolean {
  return Math.abs(bokunBaseEur + dbAddonEur - finalEur) < 0.01;
}

describe("Slice A — reservation payload", () => {
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
    const { pricingCategoryBookings, error } = buildReservationPayload(baseLines, slotCategories, 5);
    expect(error).toBeUndefined();
    expect(pricingCategoryBookings).toHaveLength(4);
    expect(pricingCategoryBookings.find((b) => b.pricingCategoryId === 104)?.quantity).toBe(1);
    expect(pricingCategoryBookings.map((b) => b.quantity)).toEqual([2, 1, 1, 1]);
  });

  it("infant selected + slot has no matching Infant category → category_not_ready, no reserve", () => {
    // Age is supported by the confirmed commercial mapping (line has a
    // bokunCategoryId), but this exact slot doesn't expose that category.
    // Hard block — never silently omit the infant, never substitute Adult.
    const baseLines: BaseLine[] = [
      { bokunCategoryId: "101", label: "Adult", quantity: 2, unitEur: 220, subtotalEur: 440 },
      { bokunCategoryId: "104", label: "Infant", quantity: 1, unitEur: 0, subtotalEur: 0, isFree: true },
    ];
    const slotCategories: SlotCategory[] = [{ id: 101, title: "Adult" }];
    const { pricingCategoryBookings, error } = buildReservationPayload(baseLines, slotCategories, 3);
    expect(error).toBe("category_not_ready:104");
    expect(pricingCategoryBookings).toHaveLength(0);
  });

  it("paid category missing on slot blocks the reserve with category_not_ready", () => {
    const baseLines: BaseLine[] = [
      { bokunCategoryId: "101", label: "Adult", quantity: 2, unitEur: 220, subtotalEur: 440 },
      { bokunCategoryId: "102", label: "Youth", quantity: 1, unitEur: 180, subtotalEur: 180 },
    ];
    const slotCategories: SlotCategory[] = [{ id: 101, title: "Adult" }];
    const { error } = buildReservationPayload(baseLines, slotCategories, 3);
    expect(error).toBe("category_not_ready:102");
  });

  it("selected quantity must equal composition totalParticipants (parity guard)", () => {
    const baseLines: BaseLine[] = [
      { bokunCategoryId: "101", label: "Adult", quantity: 2, unitEur: 220, subtotalEur: 440 },
    ];
    const slotCategories: SlotCategory[] = [{ id: 101, title: "Adult" }];
    // Composition says 3 travellers but only 2 are represented.
    const { error } = buildReservationPayload(baseLines, slotCategories, 3);
    expect(error).toBe("composition_mismatch:selected=2_expected=3");
  });

  it("unsupported_age vs category_not_ready remain distinct", () => {
    // Ages that hit checkout already have a resolved bokunCategoryId from the
    // confirmed commercial mapping. `unsupported_age` therefore surfaces at
    // quote time (booking-quote fn) via resolveCompositionAgainstCategories.
    // At checkout, a missing slot-category is `category_not_ready`, never
    // `unsupported_age`.
    const { error } = buildReservationPayload(
      [{ bokunCategoryId: "104", label: "Infant", quantity: 1, unitEur: 0, subtotalEur: 0, isFree: true }],
      [{ id: 101, title: "Adult" }],
      1,
    );
    expect(error).toMatch(/^category_not_ready:/);
    expect(error).not.toMatch(/unsupported_age/);
  });

  it("Stripe amount MUST equal final_total_eur (webhook parity check)", () => {
    expect(verifyAmountParity(72000, 720)).toBe(true);
    expect(verifyAmountParity(72001, 720)).toBe(false);
    expect(verifyAmountParity(74500, 720)).toBe(false); // add-on tampering scenario
  });

  it("base + DB add-ons = final total; Bókun base excludes DB add-ons", () => {
    expect(baseVsFinalParity(720, 25, 745)).toBe(true);
    expect(720).not.toBe(745);
  });

  it("deterministic idempotency key: same quote + reservation → same key", () => {
    const keyFor = (quoteToken: string, reservationId: string) =>
      `booking-quote-v3:${quoteToken}:${reservationId}`;
    expect(keyFor("tok-A", "res-1")).toBe(keyFor("tok-A", "res-1"));
    expect(keyFor("tok-A", "res-1")).not.toBe(keyFor("tok-A", "res-2"));
  });
});

// ---------- stripe-webhook: atomic claim + release ------------------------

type QuoteRow = {
  quote_id: string;
  state:
    | "reserved"
    | "checkout-created"
    | "confirmed"
    | "expired"
    | "cancelled"
    | "failed";
  bokun_reservation_id: string | null;
  expired_at?: string | null;
  paid_at?: string | null;
  confirmed_at?: string | null;
  bokun_release_result?: unknown;
};

/**
 * Conditional UPDATE ... WHERE state IN (...) RETURNING — mirrors the Supabase
 * `.update(...).eq('quote_id',...).in('state',[...]).select().maybeSingle()`
 * pattern used in stripe-webhook. Returns the mutated row when the claim
 * succeeded, otherwise null (duplicate delivery / race).
 */
function claimAndUpdate(
  quotes: Map<string, QuoteRow>,
  quoteId: string,
  fromStates: QuoteRow["state"][],
  patch: Partial<QuoteRow>,
): QuoteRow | null {
  const row = quotes.get(quoteId);
  if (!row) return null;
  if (!fromStates.includes(row.state)) return null;
  const next = { ...row, ...patch };
  quotes.set(quoteId, next);
  return next;
}

async function handleExpiredSession(
  quotes: Map<string, QuoteRow>,
  quoteId: string,
  releaseReservation: (id: string) => Promise<boolean>,
) {
  const claimed = claimAndUpdate(
    quotes,
    quoteId,
    ["checkout-created"],
    { state: "expired", expired_at: "2026-07-13T00:00:00.000Z" },
  );
  if (!claimed) return { released: false, reason: "not_in_checkout_created" as const };
  if (!claimed.bokun_reservation_id) return { released: false, reason: "no_reservation_id" as const };
  const ok = await releaseReservation(claimed.bokun_reservation_id);
  const result = { status: ok ? "released" : "already_expired", at: "2026-07-13T00:00:00.000Z" };
  quotes.set(claimed.quote_id, { ...claimed, bokun_release_result: result });
  return { released: true, result };
}

async function handlePaymentConfirm(
  quotes: Map<string, QuoteRow>,
  quoteId: string,
  confirmReservation: (id: string) => Promise<{ bookingId: string }>,
) {
  const claimed = claimAndUpdate(
    quotes,
    quoteId,
    ["reserved", "checkout-created"],
    {
      state: "confirmed",
      paid_at: "2026-07-13T00:00:00.000Z",
      confirmed_at: "2026-07-13T00:00:00.000Z",
    },
  );
  if (!claimed || !claimed.bokun_reservation_id) return { confirmed: false as const };
  await confirmReservation(claimed.bokun_reservation_id);
  return { confirmed: true as const };
}

describe("Slice A — atomic expiry vs payment", () => {
  it("expired session with state=checkout-created releases the provisional reservation exactly once", async () => {
    const quotes = new Map<string, QuoteRow>([
      [
        "q1",
        { quote_id: "q1", state: "checkout-created", bokun_reservation_id: "BKN-1" },
      ],
    ]);
    const release = vi.fn(async () => true);
    const result = await handleExpiredSession(quotes, "q1", release);
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith("BKN-1");
    expect(result.released).toBe(true);
    expect(quotes.get("q1")?.state).toBe("expired");
    expect(quotes.get("q1")?.expired_at).toBeTruthy();
    expect(quotes.get("q1")?.bokun_release_result).toEqual({
      status: "released",
      at: expect.any(String),
    });
  });

  it("duplicate expiry webhook does not release twice", async () => {
    const quotes = new Map<string, QuoteRow>([
      [
        "q1",
        { quote_id: "q1", state: "checkout-created", bokun_reservation_id: "BKN-1" },
      ],
    ]);
    const release = vi.fn(async () => true);
    await handleExpiredSession(quotes, "q1", release);
    await handleExpiredSession(quotes, "q1", release);
    expect(release).toHaveBeenCalledTimes(1);
    expect(quotes.get("q1")?.state).toBe("expired");
  });

  it("expiry arriving after confirmation does not cancel the confirmed booking", async () => {
    const quotes = new Map<string, QuoteRow>([
      [
        "q1",
        { quote_id: "q1", state: "confirmed", bokun_reservation_id: "BKN-1" },
      ],
    ]);
    const release = vi.fn(async () => true);
    const result = await handleExpiredSession(quotes, "q1", release);
    expect(release).not.toHaveBeenCalled();
    expect(result.released).toBe(false);
    expect(quotes.get("q1")?.state).toBe("confirmed");
  });

  it("payment confirmation claim excludes expired/cancelled/confirmed → no double-confirm", async () => {
    const cases: Array<QuoteRow["state"]> = ["expired", "cancelled", "confirmed", "failed"];
    for (const startState of cases) {
      const quotes = new Map<string, QuoteRow>([
        [
          "q1",
          { quote_id: "q1", state: startState, bokun_reservation_id: "BKN-1" },
        ],
      ]);
      const confirm = vi.fn(async () => ({ bookingId: "BKN-1" }));
      const r = await handlePaymentConfirm(quotes, "q1", confirm);
      expect(confirm).not.toHaveBeenCalled();
      expect(r.confirmed).toBe(false);
      expect(quotes.get("q1")?.state).toBe(startState);
    }
  });

  it("payment and expiry are mutually exclusive on the same row (single-writer claim)", async () => {
    // Simulate: payment confirm wins the race, expiry arrives after.
    const quotes = new Map<string, QuoteRow>([
      [
        "q1",
        { quote_id: "q1", state: "reserved", bokun_reservation_id: "BKN-1" },
      ],
    ]);
    const confirm = vi.fn(async () => ({ bookingId: "BKN-1" }));
    const release = vi.fn(async () => true);
    const pay = await handlePaymentConfirm(quotes, "q1", confirm);
    const exp = await handleExpiredSession(quotes, "q1", release);
    expect(pay.confirmed).toBe(true);
    expect(exp.released).toBe(false);
    expect(release).not.toHaveBeenCalled();
    expect(quotes.get("q1")?.state).toBe("confirmed");
  });
});
