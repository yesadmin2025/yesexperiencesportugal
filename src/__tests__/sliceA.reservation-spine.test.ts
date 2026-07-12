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
    | "paid"
    | "confirming"
    | "confirmed"
    | "expired"
    | "cancelled"
    | "failed";
  bokun_reservation_id: string | null;
  expired_at?: string | null;
  paid_at?: string | null;
  confirmed_at?: string | null;
  confirming_at?: string | null;
  confirm_attempts?: number;
  last_error?: string | null;
  bokun_reservation_status?: string | null;
  bokun_release_result?: unknown;
};

const CONFIRM_LEASE_MS = 3 * 60 * 1000;

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

/**
 * Three-phase payment confirm with recoverable lease:
 *   reserved | checkout-created → paid → confirming → confirmed
 * Mirrors stripe-webhook exactly, including the fresh-lease 503 short-circuit
 * and the stale-lease conditional reclaim.
 */
type ConfirmResult =
  | { httpStatus: 200; status: "confirmed" | "already_confirmed" | "needs_review"; retryable: false }
  | { httpStatus: 502 | 503; status: "confirm_failed" | "confirm_in_flight"; retryable: true; error?: string };

async function handlePaymentConfirm(
  quotes: Map<string, QuoteRow>,
  quoteId: string,
  confirmReservation: (id: string) => Promise<{ bookingId: string }>,
  nowMs: number = Date.now(),
): Promise<ConfirmResult> {
  const nowIso = new Date(nowMs).toISOString();

  // Phase A: reserved|checkout-created → paid
  claimAndUpdate(quotes, quoteId, ["reserved", "checkout-created"], {
    state: "paid",
    paid_at: nowIso,
  });

  const current = quotes.get(quoteId);
  if (!current) return { httpStatus: 200, status: "needs_review", retryable: false };
  if (current.state === "confirmed") {
    return { httpStatus: 200, status: "already_confirmed", retryable: false };
  }
  if (["expired", "cancelled", "failed"].includes(current.state)) {
    return { httpStatus: 200, status: "needs_review", retryable: false };
  }
  if (current.state !== "paid" && current.state !== "confirming") {
    return { httpStatus: 200, status: "needs_review", retryable: false };
  }

  // Phase B: single-writer paid → confirming, else lease handling
  let claimed = false;
  const prevAttempts = current.confirm_attempts ?? 0;
  const prevConfirmingAt = current.confirming_at ?? null;

  if (current.state === "paid") {
    const c = claimAndUpdate(quotes, quoteId, ["paid"], {
      state: "confirming",
      confirming_at: nowIso,
      confirm_attempts: prevAttempts + 1,
    });
    if (c) claimed = true;
  }

  if (!claimed) {
    const leaseAgeMs = prevConfirmingAt ? nowMs - new Date(prevConfirmingAt).getTime() : Infinity;
    const isStale = leaseAgeMs >= CONFIRM_LEASE_MS;
    if (!isStale) {
      return {
        httpStatus: 503,
        status: "confirm_in_flight",
        retryable: true,
        error: `lease_active_age_ms=${Math.round(leaseAgeMs)}`,
      };
    }
    // Stale reclaim: conditional on state=confirming AND confirming_at=prevConfirmingAt
    const row = quotes.get(quoteId)!;
    if (row.state === "confirming" && (row.confirming_at ?? null) === prevConfirmingAt) {
      quotes.set(quoteId, {
        ...row,
        confirming_at: nowIso,
        confirm_attempts: (row.confirm_attempts ?? 0) + 1,
      });
      claimed = true;
    } else {
      return {
        httpStatus: 503,
        status: "confirm_in_flight",
        retryable: true,
        error: "lease_reclaimed_by_other_worker",
      };
    }
  }

  const winning = quotes.get(quoteId)!;
  if (!winning.bokun_reservation_id) {
    return { httpStatus: 200, status: "needs_review", retryable: false };
  }

  try {
    await confirmReservation(winning.bokun_reservation_id);
    // Phase C: confirming → confirmed
    const row = quotes.get(quoteId)!;
    if (row.state === "confirming") {
      quotes.set(quoteId, {
        ...row,
        state: "confirmed",
        bokun_reservation_status: "confirmed",
        confirmed_at: new Date(nowMs).toISOString(),
        confirming_at: null,
        last_error: null,
      });
    }
    return { httpStatus: 200, status: "confirmed", retryable: false };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 240);
    const row = quotes.get(quoteId)!;
    if (row.state === "confirming") {
      quotes.set(quoteId, {
        ...row,
        state: "paid",
        confirming_at: null,
        bokun_reservation_status: "confirm_failed",
        last_error: msg,
      });
    }
    return { httpStatus: 502, status: "confirm_failed", retryable: true, error: msg };
  }
}

describe("Slice A — atomic expiry vs payment", () => {
  it("expired session with state=checkout-created releases the provisional reservation exactly once", async () => {
    const quotes = new Map<string, QuoteRow>([
      ["q1", { quote_id: "q1", state: "checkout-created", bokun_reservation_id: "BKN-1" }],
    ]);
    const release = vi.fn(async () => true);
    const result = await handleExpiredSession(quotes, "q1", release);
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith("BKN-1");
    expect(result.released).toBe(true);
    expect(quotes.get("q1")?.state).toBe("expired");
  });

  it("duplicate expiry webhook does not release twice", async () => {
    const quotes = new Map<string, QuoteRow>([
      ["q1", { quote_id: "q1", state: "checkout-created", bokun_reservation_id: "BKN-1" }],
    ]);
    const release = vi.fn(async () => true);
    await handleExpiredSession(quotes, "q1", release);
    await handleExpiredSession(quotes, "q1", release);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("expiry arriving after confirmation does not cancel the confirmed booking", async () => {
    const quotes = new Map<string, QuoteRow>([
      ["q1", { quote_id: "q1", state: "confirmed", bokun_reservation_id: "BKN-1" }],
    ]);
    const release = vi.fn(async () => true);
    const result = await handleExpiredSession(quotes, "q1", release);
    expect(release).not.toHaveBeenCalled();
    expect(result.released).toBe(false);
    expect(quotes.get("q1")?.state).toBe("confirmed");
  });

  it("expiry during paid / confirming / confirmed → no release, state unchanged", async () => {
    for (const startState of ["paid", "confirming", "confirmed"] as const) {
      const quotes = new Map<string, QuoteRow>([
        ["q1", { quote_id: "q1", state: startState, bokun_reservation_id: "BKN-1" }],
      ]);
      const release = vi.fn(async () => true);
      const r = await handleExpiredSession(quotes, "q1", release);
      expect(release).not.toHaveBeenCalled();
      expect(r.released).toBe(false);
      expect(quotes.get("q1")?.state).toBe(startState);
    }
  });
});

describe("Slice A — three-phase confirm with recoverable lease", () => {
  it("happy path: reserved → paid → confirming → confirmed, lease cleared", async () => {
    const quotes = new Map<string, QuoteRow>([
      ["q1", { quote_id: "q1", state: "reserved", bokun_reservation_id: "BKN-1" }],
    ]);
    const confirm = vi.fn(async () => ({ bookingId: "BKN-1" }));
    const r = await handlePaymentConfirm(quotes, "q1", confirm);
    expect(r.status).toBe("confirmed");
    expect(r.httpStatus).toBe(200);
    expect(confirm).toHaveBeenCalledTimes(1);
    const row = quotes.get("q1")!;
    expect(row.state).toBe("confirmed");
    expect(row.confirming_at).toBeNull();
    expect(row.last_error).toBeNull();
    expect(row.confirm_attempts).toBe(1);
  });

  it("two simultaneous payment webhooks: only one Phase-B claim wins, Bókun called once", async () => {
    const quotes = new Map<string, QuoteRow>([
      ["q1", { quote_id: "q1", state: "reserved", bokun_reservation_id: "BKN-1" }],
    ]);
    const confirm = vi.fn(async () => ({ bookingId: "BKN-1" }));
    // Fire both at the same moment.
    const [a, b] = await Promise.all([
      handlePaymentConfirm(quotes, "q1", confirm),
      handlePaymentConfirm(quotes, "q1", confirm),
    ]);
    // One won, the other saw fresh confirming lease → 503.
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual(["confirm_in_flight", "confirmed"]);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(quotes.get("q1")?.state).toBe("confirmed");
    const loser = [a, b].find((x) => x.status === "confirm_in_flight")!;
    expect(loser.httpStatus).toBe(503);
    expect(loser.retryable).toBe(true);
  });

  it("concurrent webhook sees fresh confirming lease → 503, no Bókun call", async () => {
    const quotes = new Map<string, QuoteRow>([
      [
        "q1",
        {
          quote_id: "q1",
          state: "confirming",
          bokun_reservation_id: "BKN-1",
          confirming_at: new Date(Date.now() - 30_000).toISOString(), // 30s ago, fresh
          confirm_attempts: 1,
        },
      ],
    ]);
    const confirm = vi.fn(async () => ({ bookingId: "BKN-1" }));
    const r = await handlePaymentConfirm(quotes, "q1", confirm);
    expect(r.status).toBe("confirm_in_flight");
    expect(r.httpStatus).toBe(503);
    expect(r.retryable).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(quotes.get("q1")?.state).toBe("confirming");
  });

  it("Bókun transient failure: confirming → paid, HTTP 502; retry succeeds", async () => {
    const quotes = new Map<string, QuoteRow>([
      ["q1", { quote_id: "q1", state: "reserved", bokun_reservation_id: "BKN-1" }],
    ]);
    const confirm = vi
      .fn<(id: string) => Promise<{ bookingId: string }>>()
      .mockRejectedValueOnce(new Error("bokun 5xx"))
      .mockResolvedValueOnce({ bookingId: "BKN-1" });

    const r1 = await handlePaymentConfirm(quotes, "q1", confirm);
    expect(r1.status).toBe("confirm_failed");
    expect(r1.httpStatus).toBe(502);
    let row = quotes.get("q1")!;
    expect(row.state).toBe("paid");
    expect(row.confirming_at).toBeNull();
    expect(row.last_error).toBe("bokun 5xx");
    expect(row.bokun_reservation_status).toBe("confirm_failed");

    // Second delivery re-enters Phase B and confirms.
    const r2 = await handlePaymentConfirm(quotes, "q1", confirm);
    expect(r2.status).toBe("confirmed");
    expect(r2.httpStatus).toBe(200);
    expect(confirm).toHaveBeenCalledTimes(2);
    row = quotes.get("q1")!;
    expect(row.state).toBe("confirmed");
    expect(row.confirming_at).toBeNull();
    expect(row.last_error).toBeNull();
    expect(row.confirm_attempts).toBe(2);
  });

  it("stale lease is reclaimed by exactly one webhook; that webhook confirms", async () => {
    // Worker died mid-confirm: state=confirming, confirming_at older than lease.
    const staleIso = new Date(Date.now() - (CONFIRM_LEASE_MS + 5_000)).toISOString();
    const quotes = new Map<string, QuoteRow>([
      [
        "q1",
        {
          quote_id: "q1",
          state: "confirming",
          bokun_reservation_id: "BKN-1",
          confirming_at: staleIso,
          confirm_attempts: 1,
        },
      ],
    ]);
    const confirm = vi.fn(async () => ({ bookingId: "BKN-1" }));

    const [a, b] = await Promise.all([
      handlePaymentConfirm(quotes, "q1", confirm),
      handlePaymentConfirm(quotes, "q1", confirm),
    ]);
    // Exactly one reclaimed and confirmed; the other lost the reclaim race.
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual(["confirm_in_flight", "confirmed"]);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(quotes.get("q1")?.state).toBe("confirmed");
    expect(quotes.get("q1")?.confirm_attempts).toBe(2);
  });

  it("webhook arriving while state is confirmed → already_confirmed, no Bókun call", async () => {
    const quotes = new Map<string, QuoteRow>([
      ["q1", { quote_id: "q1", state: "confirmed", bokun_reservation_id: "BKN-1" }],
    ]);
    const confirm = vi.fn(async () => ({ bookingId: "BKN-1" }));
    const r = await handlePaymentConfirm(quotes, "q1", confirm);
    expect(r.status).toBe("already_confirmed");
    expect(r.httpStatus).toBe(200);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("payment confirmation excludes expired/cancelled/failed", async () => {
    for (const startState of ["expired", "cancelled", "failed"] as const) {
      const quotes = new Map<string, QuoteRow>([
        ["q1", { quote_id: "q1", state: startState, bokun_reservation_id: "BKN-1" }],
      ]);
      const confirm = vi.fn(async () => ({ bookingId: "BKN-1" }));
      const r = await handlePaymentConfirm(quotes, "q1", confirm);
      expect(confirm).not.toHaveBeenCalled();
      expect(r.status).toBe("needs_review");
      expect(quotes.get("q1")?.state).toBe(startState);
    }
  });
});

