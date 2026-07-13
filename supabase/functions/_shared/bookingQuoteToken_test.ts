import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  signBookingQuoteToken,
  verifyBookingQuoteToken,
  type BookingQuoteTokenPayload,
} from "./bookingQuoteToken.ts";

const SECRET = "booking-quote-token-regression-secret";

function payload(
  overrides: Partial<BookingQuoteTokenPayload> = {},
): BookingQuoteTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    v: 3,
    quoteId: "081cf12a-e8b4-4a80-bfb5-f9ed347c7dc9",
    flow: "signature",
    commercialProductKey: "arrabida-wine-allinclusive",
    commercialMappingId: "manual:signature:arrabida-wine-allinclusive",
    bokunProductId: "manual",
    availabilityId: "manual:2026-07-27:09:00",
    date: "2026-07-27",
    startTime: "09:00",
    pricingRevision: "pr_child_checkout",
    finalTotalEur: 537.5,
    iat: now,
    exp: now + 600,
    ...overrides,
  };
}

Deno.test("booking quote token omits absent optional fields and round-trips", async () => {
  const input = payload({
    bokunOptionId: undefined,
    bokunRateId: undefined,
    itineraryRevision: undefined,
  });
  const token = await signBookingQuoteToken(input, SECRET);
  const encodedBody = token.split(".")[1];
  const decodedBody = new TextDecoder().decode(
    Uint8Array.from(
      atob(encodedBody.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - encodedBody.length % 4) % 4)),
      (char) => char.charCodeAt(0),
    ),
  );

  assertEquals(decodedBody.includes("undefined"), false);
  assertEquals(JSON.parse(decodedBody).bokunOptionId, undefined);

  const verified = await verifyBookingQuoteToken(token, SECRET);
  assertEquals(verified.quoteId, input.quoteId);
  assertEquals(verified.finalTotalEur, 537.5);
  assertEquals(verified.bokunOptionId, undefined);
});

Deno.test("booking quote token preserves an itinerary revision", async () => {
  const token = await signBookingQuoteToken(
    payload({ flow: "tailor", itineraryRevision: "itinerary-r7" }),
    SECRET,
  );
  const verified = await verifyBookingQuoteToken(token, SECRET);
  assertEquals(verified.flow, "tailor");
  assertEquals(verified.itineraryRevision, "itinerary-r7");
});

Deno.test("booking quote token still rejects tampering", async () => {
  const token = await signBookingQuoteToken(payload(), SECRET);
  const [version, body, signature] = token.split(".");
  const tampered = `${version}.${body.slice(0, -1)}${body.endsWith("A") ? "B" : "A"}.${signature}`;
  await assertRejects(() => verifyBookingQuoteToken(tampered, SECRET));
});