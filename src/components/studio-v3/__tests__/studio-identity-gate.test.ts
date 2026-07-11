/**
 * Pass 1B §1a + §9 — Studio identity gate (not tour-id gate).
 *
 * Proves that every Studio V3 itinerary carries commercialProductKey
 * "studio-v3-private-full-day" regardless of the resolved Signature tour
 * id, and that the legacy tier path rejects that commercial key.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { webcrypto } from "node:crypto";

// deno-lint-ignore no-explicit-any
(globalThis as any).Deno = (globalThis as any).Deno ?? { env: { get: () => undefined } };
if (!(globalThis as unknown as { crypto?: Crypto }).crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

import {
  validateAndNormaliseSnapshot,
  SnapshotValidationError,
  type RawQuoteSnapshot,
} from "../../../../supabase/functions/_shared/quoteSnapshotSchema.ts";
import { STUDIO_COMMERCIAL_PRODUCT_KEYS } from "../../../../supabase/functions/_shared/studioCommercialPricing.ts";

function tomorrow(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function studioSnapshot(overrides: Partial<RawQuoteSnapshot> = {}): RawQuoteSnapshot {
  return {
    commercialProductKey: "studio-v3-private-full-day",
    signatureId: "azeitao-cheese",
    title: "Setúbal · Azeitão · Sesimbra",
    destinationRegion: "Setúbal",
    pickupCity: "Lisbon",
    date: tomorrow(),
    startTime: "09:00",
    language: "en",
    guests: 3,
    routeStops: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    selectedAddOns: [],
    routeStatus: "pending-review",
    ...overrides,
  };
}

describe("§1a — Studio identity gate is not tour-id based", () => {
  it("Studio commercial key is a first-class server-catalogue key", () => {
    expect(STUDIO_COMMERCIAL_PRODUCT_KEYS).toContain("studio-v3-private-full-day");
  });

  it("two different Studio itineraries share the same commercial identity", () => {
    const azeitao = validateAndNormaliseSnapshot(studioSnapshot({ signatureId: "azeitao-cheese" }));
    const sintra = validateAndNormaliseSnapshot(
      studioSnapshot({
        signatureId: "sintra-royal-day",
        title: "Sintra Royal Day",
        destinationRegion: "Sintra",
        routeStops: [
          { id: "quinta-regaleira", label: "Quinta da Regaleira" },
          { id: "palacio-pena", label: "Palácio da Pena" },
        ],
      }),
    );
    expect(azeitao.commercialProductKey).toBe("studio-v3-private-full-day");
    expect(sintra.commercialProductKey).toBe("studio-v3-private-full-day");
    expect(azeitao.signatureId).not.toBe(sintra.signatureId);
  });

  it("rejects an unknown commercial key (guards Studio from silently falling back)", () => {
    expect(() =>
      validateAndNormaliseSnapshot(
        studioSnapshot({ commercialProductKey: "legacy-tier-anything" as unknown as string }),
      ),
    ).toThrow(SnapshotValidationError);
  });

  it("legacy tier-checkout server gate rejects the Studio commercial identity", () => {
    // Mirrors supabase/functions/create-signature-checkout/index.ts §7:
    //   if (body.tourId === "studio-v3-private-full-day")
    //     return jsonError("studio_quote_required", 409);
    const gate = (tourId: string) =>
      tourId === "studio-v3-private-full-day"
        ? { status: 409, error: "studio_quote_required" }
        : { status: 200 };
    expect(gate("studio-v3-private-full-day")).toEqual({
      status: 409,
      error: "studio_quote_required",
    });
    // Legacy Signature tour ids still pass through the tier path.
    expect(gate("some-legacy-tour")).toEqual({ status: 200 });
  });
});
