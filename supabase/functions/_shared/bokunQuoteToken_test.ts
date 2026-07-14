// Phase B: revalidation drift detection for signed Bókun quote tokens.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  signBokunQuoteToken,
  verifyBokunQuoteToken,
  type BokunQuoteTokenPayload,
} from "./bokunQuoteToken.ts";

const SECRET = "test-secret-for-parity-only";

function payload(overrides: Partial<BokunQuoteTokenPayload> = {}): BokunQuoteTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    v: 2,
    source: "bokun-live",
    currency: "EUR",
    internalProductKey: "arrabida-boat",
    bokunProductId: "12345",
    availabilityId: "abc",
    date: "2026-08-01",
    startTime: "10:00",
    guestMix: { adults: 2, youths: 0, children: 1, infants: 1 },
    pricingPartySize: 3,
    totalParticipants: 4,
    lines: [
      { uiBand: "adult", bokunCategoryId: "A", label: "Adult", quantity: 2, unitEur: 120, subtotalEur: 240, countsTowardCapacity: true },
      { uiBand: "child", bokunCategoryId: "C", label: "Child", quantity: 1, unitEur: 60, subtotalEur: 60, countsTowardCapacity: true },
      { uiBand: "infant", bokunCategoryId: "I", label: "Infant", quantity: 1, unitEur: 0, subtotalEur: 0, countsTowardCapacity: true },
    ],
    addOnLines: [],
    finalTotalEur: 300,
    revision: "r0",
    iat: now,
    exp: now + 600,
    ...overrides,
  };
}

Deno.test("signed quote token round-trips and preserves multi-category lines", async () => {
  const p = payload();
  const token = await signBokunQuoteToken(p, SECRET);
  const verified = await verifyBokunQuoteToken(token, SECRET);
  assertEquals(verified.lines.length, 3);
  assertEquals(verified.finalTotalEur, 300);
  assertEquals(verified.guestMix.infants, 1);
});

Deno.test("expired token rejected", async () => {
  const now = Math.floor(Date.now() / 1000);
  const p = payload({ iat: now - 3600, exp: now - 60 });
  const token = await signBokunQuoteToken(p, SECRET);
  let threw = false;
  try { await verifyBokunQuoteToken(token, SECRET); } catch { threw = true; }
  assertEquals(threw, true);
});

Deno.test("tampered payload rejected", async () => {
  const token = await signBokunQuoteToken(payload(), SECRET);
  const [ver, body, sig] = token.split(".");
  // Flip a byte in body -> signature invalid.
  const tampered = `${ver}.${body.slice(0, -1)}${body.at(-1) === "A" ? "B" : "A"}.${sig}`;
  let threw = false;
  try { await verifyBokunQuoteToken(tampered, SECRET); } catch { threw = true; }
  assertEquals(threw, true);
});
