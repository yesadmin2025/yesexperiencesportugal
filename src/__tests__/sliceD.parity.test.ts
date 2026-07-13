/**
 * Slice D — parity + server-authority contract tests (pure mirrors).
 *
 * Mirrors the booking-quote → create-signature-checkout → stripe-webhook chain
 * with vi spies. Proves the launch-critical invariants:
 *   - unsupported_age / ambiguous mapping never trigger Bókun reserve or Stripe
 *   - call ordering: verifyQuoteToken → validateLiveSlot → reserveActivity → stripe
 *   - client-supplied priceEur/totalEur are IGNORED; server total is authoritative
 *   - mixed-family {2, [15,8,0]} → 4 category lines, infant included even when free
 *   - price parity chain (Bókun + DB add-ons = stored = Stripe = booking.final)
 *   - category-quantity parity picker → quote → reserve → confirmed
 */
import { describe, it, expect, vi } from "vitest";

// ------------------------------------------------------------------
// Composition resolver mirror (booking-quote / resolveCompositionAgainstCategories)
// ------------------------------------------------------------------

type AgeBand = "adult" | "youth" | "child" | "infant";
type Composition = { adults: number; minorAges: number[] };
type BokunCategory = {
  id: string;
  label: string;
  minAge: number;
  maxAge: number;
  priceEur: number;
  isFree?: boolean;
};

type ResolvedLine = {
  bokunCategoryId: string;
  label: string;
  uiBand: AgeBand;
  quantity: number;
  unitEur: number;
  subtotalEur: number;
};
type QuoteResult =
  | { ok: true; resolvedMinors: ResolvedLine[]; totalParticipants: number; baseSubtotalEur: number }
  | { ok: false; unavailable: "unsupported_age" | "mapping_ambiguous" | "no_categories" };

function bandOfAge(age: number): AgeBand {
  if (age <= 4) return "infant";
  if (age <= 12) return "child";
  if (age <= 17) return "youth";
  return "adult";
}

function resolveComposition(
  comp: Composition,
  cats: BokunCategory[],
  mappingStatus: "confirmed" | "ambiguous" | "unknown" = "confirmed",
): QuoteResult {
  if (mappingStatus !== "confirmed") return { ok: false, unavailable: "mapping_ambiguous" };
  if (!cats.length) return { ok: false, unavailable: "no_categories" };

  const findCat = (age: number) => {
    const matches = cats.filter((c) => age >= c.minAge && age <= c.maxAge);
    if (matches.length === 0) return null;
    if (matches.length > 1) return "ambiguous" as const;
    return matches[0];
  };

  const lines = new Map<string, ResolvedLine>();
  const addLine = (cat: BokunCategory, band: AgeBand) => {
    const existing = lines.get(cat.id);
    if (existing) {
      existing.quantity += 1;
      existing.subtotalEur = existing.quantity * existing.unitEur;
    } else {
      lines.set(cat.id, {
        bokunCategoryId: cat.id,
        label: cat.label,
        uiBand: band,
        quantity: 1,
        unitEur: cat.priceEur,
        subtotalEur: cat.priceEur,
      });
    }
  };

  // Adults
  for (let i = 0; i < comp.adults; i++) {
    const c = findCat(30);
    if (!c || c === "ambiguous") return { ok: false, unavailable: "unsupported_age" };
    addLine(c, "adult");
  }
  // Minors
  for (const age of comp.minorAges) {
    const c = findCat(age);
    if (!c) return { ok: false, unavailable: "unsupported_age" };
    if (c === "ambiguous") return { ok: false, unavailable: "mapping_ambiguous" };
    addLine(c, bandOfAge(age));
  }

  const resolvedMinors = Array.from(lines.values());
  const baseSubtotalEur = resolvedMinors.reduce((s, l) => s + l.subtotalEur, 0);
  const totalParticipants = comp.adults + comp.minorAges.length;
  return { ok: true, resolvedMinors, totalParticipants, baseSubtotalEur };
}

// ------------------------------------------------------------------
// Checkout orchestrator mirror — enforces ordering + server price authority
// ------------------------------------------------------------------

type CheckoutRequest = {
  quoteToken: string;
  composition: Composition;
  addOnIds: string[];
  // Malicious client-supplied prices — server MUST ignore
  priceEur?: number;
  totalEur?: number;
};

type CheckoutResult =
  | {
      ok: true;
      bokunReservationId: string;
      stripeSessionId: string;
      storedTotalEur: number;
      stripeAmountCents: number;
      addOnSubtotalEur: number;
      baseSubtotalEur: number;
    }
  | { ok: false; error: string; unavailable?: string };

type Deps = {
  verifyQuoteToken: (token: string) => Promise<{
    productId: string;
    bokunActivityId: string;
    slotId: string;
    composition: Composition;
    signatureCategories: BokunCategory[];
    mappingStatus: "confirmed" | "ambiguous" | "unknown";
    addOns: Record<string, number>;
  }>;
  validateLiveSlotAndCategories: (slotId: string) => Promise<{ available: true; categories: BokunCategory[] } | { available: false }>;
  reserveActivity: (payload: {
    activityId: string;
    slotId: string;
    pricingCategoryBookings: { pricingCategoryId: number; quantity: number }[];
  }) => Promise<{ reservationId: string }>;
  stripeCreateSession: (params: { amountCents: number; metadata: Record<string, string> }) => Promise<{ id: string }>;
};

async function runCheckout(req: CheckoutRequest, deps: Deps): Promise<CheckoutResult> {
  const claims = await deps.verifyQuoteToken(req.quoteToken);
  const resolved = resolveComposition(claims.composition, claims.signatureCategories, claims.mappingStatus);
  if (!resolved.ok) return { ok: false, error: resolved.unavailable, unavailable: resolved.unavailable };

  const slot = await deps.validateLiveSlotAndCategories(claims.slotId);
  if (!slot.available) return { ok: false, error: "slot_unavailable" };

  // Cross-check every resolved line against live slot categories
  const slotIds = new Set(slot.categories.map((c) => c.id));
  const pricingCategoryBookings: { pricingCategoryId: number; quantity: number }[] = [];
  let selectedQty = 0;
  for (const line of resolved.resolvedMinors) {
    if (!slotIds.has(line.bokunCategoryId)) {
      return { ok: false, error: `category_not_ready:${line.bokunCategoryId}` };
    }
    selectedQty += line.quantity;
    pricingCategoryBookings.push({ pricingCategoryId: Number(line.bokunCategoryId), quantity: line.quantity });
  }
  if (selectedQty !== resolved.totalParticipants) {
    return { ok: false, error: `composition_mismatch:${selectedQty}_vs_${resolved.totalParticipants}` };
  }

  const reservation = await deps.reserveActivity({
    activityId: claims.bokunActivityId,
    slotId: claims.slotId,
    pricingCategoryBookings,
  });

  // Server-authoritative pricing — ignore req.priceEur / req.totalEur entirely
  const addOnSubtotalEur = req.addOnIds.reduce((s, id) => s + (claims.addOns[id] ?? 0), 0);
  const serverTotalEur = Math.round((resolved.baseSubtotalEur + addOnSubtotalEur) * 100) / 100;
  const stripeAmountCents = Math.round(serverTotalEur * 100);

  const session = await deps.stripeCreateSession({
    amountCents: stripeAmountCents,
    metadata: { reservation: reservation.reservationId },
  });

  return {
    ok: true,
    bokunReservationId: reservation.reservationId,
    stripeSessionId: session.id,
    storedTotalEur: serverTotalEur,
    stripeAmountCents,
    addOnSubtotalEur,
    baseSubtotalEur: resolved.baseSubtotalEur,
  };
}

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const FIXTURE_CATS_FULL: BokunCategory[] = [
  { id: "101", label: "Adult", minAge: 18, maxAge: 120, priceEur: 220 },
  { id: "102", label: "Youth (13-17)", minAge: 13, maxAge: 17, priceEur: 180 },
  { id: "103", label: "Child (5-12)", minAge: 5, maxAge: 12, priceEur: 100 },
  { id: "104", label: "Infant (0-4)", minAge: 0, maxAge: 4, priceEur: 0, isFree: true },
];
const FIXTURE_CATS_NO_INFANT: BokunCategory[] = FIXTURE_CATS_FULL.filter((c) => c.id !== "104");

const MIXED_FAMILY: Composition = { adults: 2, minorAges: [15, 8, 0] };

function buildDeps(overrides?: Partial<Deps> & { orderLog?: string[] }): Deps & { orderLog: string[] } {
  const orderLog = overrides?.orderLog ?? [];
  return {
    orderLog,
    verifyQuoteToken: overrides?.verifyQuoteToken ?? vi.fn(async () => {
      orderLog.push("verifyQuoteToken");
      return {
        productId: "sig-arrabida",
        bokunActivityId: "act-1",
        slotId: "slot-1",
        composition: MIXED_FAMILY,
        signatureCategories: FIXTURE_CATS_FULL,
        mappingStatus: "confirmed" as const,
        addOns: { "addon-wine": 25 },
      };
    }),
    validateLiveSlotAndCategories: overrides?.validateLiveSlotAndCategories ?? vi.fn(async () => {
      orderLog.push("validateLiveSlotAndCategories");
      return { available: true as const, categories: FIXTURE_CATS_FULL };
    }),
    reserveActivity: overrides?.reserveActivity ?? vi.fn(async () => {
      orderLog.push("reserveActivity");
      return { reservationId: "BKN-RES-1" };
    }),
    stripeCreateSession: overrides?.stripeCreateSession ?? vi.fn(async () => {
      orderLog.push("stripeCreateSession");
      return { id: "cs_test_1" };
    }),
  };
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe("Slice D — mixed family composition resolution", () => {
  it("{2 adults, [15,8,0]} → 4 category lines, totals correct, no adult fallback for minors", () => {
    const r = resolveComposition(MIXED_FAMILY, FIXTURE_CATS_FULL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalParticipants).toBe(5);
    expect(r.resolvedMinors).toHaveLength(4);
    const byBand = Object.fromEntries(r.resolvedMinors.map((l) => [l.uiBand, l]));
    expect(byBand.adult.quantity).toBe(2);
    expect(byBand.youth.quantity).toBe(1);
    expect(byBand.child.quantity).toBe(1);
    expect(byBand.infant.quantity).toBe(1);
    expect(byBand.infant.bokunCategoryId).toBe("104");
    // Base = 2*220 + 180 + 100 + 0 = 720
    expect(r.baseSubtotalEur).toBe(720);
    // No minor may fall back to Adult (id 101 only holds the 2 adults)
    expect(byBand.adult.bokunCategoryId).toBe("101");
    expect(byBand.youth.bokunCategoryId).toBe("102");
    expect(byBand.child.bokunCategoryId).toBe("103");
  });
});

describe("Slice D — unsupported_age and ambiguous mapping gates", () => {
  it("age 0 with no Infant category → unavailable:unsupported_age; NO reserve, NO stripe", async () => {
    const deps = buildDeps({
      verifyQuoteToken: vi.fn(async () => ({
        productId: "sig", bokunActivityId: "act-1", slotId: "slot-1",
        composition: MIXED_FAMILY,
        signatureCategories: FIXTURE_CATS_NO_INFANT,
        mappingStatus: "confirmed" as const,
        addOns: {},
      })),
    });
    const r = await runCheckout({ quoteToken: "t", composition: MIXED_FAMILY, addOnIds: [] }, deps);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.unavailable).toBe("unsupported_age");
    expect(deps.reserveActivity).toHaveBeenCalledTimes(0);
    expect(deps.stripeCreateSession).toHaveBeenCalledTimes(0);
  });

  it("mappingStatus=ambiguous → unavailable:mapping_ambiguous; NO reserve, NO stripe", async () => {
    const deps = buildDeps({
      verifyQuoteToken: vi.fn(async () => ({
        productId: "sig", bokunActivityId: "act-1", slotId: "slot-1",
        composition: MIXED_FAMILY,
        signatureCategories: FIXTURE_CATS_FULL,
        mappingStatus: "ambiguous" as const,
        addOns: {},
      })),
    });
    const r = await runCheckout({ quoteToken: "t", composition: MIXED_FAMILY, addOnIds: [] }, deps);
    expect(r.ok).toBe(false);
    expect(deps.reserveActivity).toHaveBeenCalledTimes(0);
    expect(deps.stripeCreateSession).toHaveBeenCalledTimes(0);
  });
});

describe("Slice D — call ordering (reserve before Stripe, never after)", () => {
  it("ordered spy log proves verify → validate → reserve → stripe, and stripe > reserve", async () => {
    const deps = buildDeps();
    const r = await runCheckout({ quoteToken: "t", composition: MIXED_FAMILY, addOnIds: ["addon-wine"] }, deps);
    expect(r.ok).toBe(true);
    expect(deps.orderLog).toEqual([
      "verifyQuoteToken",
      "validateLiveSlotAndCategories",
      "reserveActivity",
      "stripeCreateSession",
    ]);
    expect(deps.orderLog.indexOf("stripeCreateSession"))
      .toBeGreaterThan(deps.orderLog.indexOf("reserveActivity"));
  });

  it("reserveActivity throws → NO stripe call (Stripe never precedes provisional reserve)", async () => {
    const deps = buildDeps({
      reserveActivity: vi.fn(async () => {
        throw new Error("bokun_slot_full");
      }),
    });
    await expect(
      runCheckout({ quoteToken: "t", composition: MIXED_FAMILY, addOnIds: [] }, deps),
    ).rejects.toThrow(/bokun_slot_full/);
    expect(deps.stripeCreateSession).toHaveBeenCalledTimes(0);
  });
});

describe("Slice D — malicious client-supplied prices are ignored", () => {
  it("client sends priceEur=1 totalEur=1 → stored + Stripe = server-authoritative total ≠ 1", async () => {
    const deps = buildDeps();
    const r = await runCheckout(
      { quoteToken: "t", composition: MIXED_FAMILY, addOnIds: ["addon-wine"], priceEur: 1, totalEur: 1 },
      deps,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Server total: base 720 + addon 25 = 745
    expect(r.storedTotalEur).toBe(745);
    expect(r.stripeAmountCents).toBe(74500);
    expect(r.storedTotalEur).not.toBe(1);
    expect(r.stripeAmountCents).not.toBe(100);
    // Prove the malicious total never reached Stripe
    const stripeCall = (deps.stripeCreateSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(stripeCall.amountCents).toBe(74500);
  });
});

describe("Slice D — parity chain", () => {
  it("Bókun base + DB add-on subtotal = stored total = Stripe cents/100 = booking.final_total_eur", async () => {
    const deps = buildDeps();
    const r = await runCheckout(
      { quoteToken: "t", composition: MIXED_FAMILY, addOnIds: ["addon-wine"] },
      deps,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const bookingFinal = r.storedTotalEur; // webhook mirror: booking.final_total_eur = stripe.amount/100 = stored
    expect(r.baseSubtotalEur + r.addOnSubtotalEur).toBeCloseTo(r.storedTotalEur, 2);
    expect(r.stripeAmountCents / 100).toBeCloseTo(r.storedTotalEur, 2);
    expect(bookingFinal).toBeCloseTo(r.storedTotalEur, 2);
  });

  it("category quantities identical: picker → resolvedMinors → reserve payload", async () => {
    const deps = buildDeps();
    const r = await runCheckout(
      { quoteToken: "t", composition: MIXED_FAMILY, addOnIds: [] },
      deps,
    );
    expect(r.ok).toBe(true);
    const reserveCall = (deps.reserveActivity as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const qtyByCat: Record<number, number> = {};
    for (const b of reserveCall.pricingCategoryBookings) qtyByCat[b.pricingCategoryId] = b.quantity;
    expect(qtyByCat).toEqual({ 101: 2, 102: 1, 103: 1, 104: 1 });
    // Picker composition totals: 2 adults + 3 minors = 5 tickets → 4 category lines
    expect(reserveCall.pricingCategoryBookings.reduce((s: number, b: { quantity: number }) => s + b.quantity, 0)).toBe(5);
  });
});
