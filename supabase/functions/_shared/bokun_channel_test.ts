// Integration test: reserveAndConfirm must include BOKUN_CHANNEL_UUID in the
// reserve request body on both success and failure paths.
import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("BOKUN_ACCESS_KEY", "test-access");
Deno.env.set("BOKUN_SECRET_KEY", "test-secret");
const CHANNEL_UUID = "c9ffc83a-9cc1-4221-a0ad-db1c1a6de000";
Deno.env.set("BOKUN_CHANNEL_UUID", CHANNEL_UUID);

const { reserveAndConfirm } = await import("./bokun.ts");

type Captured = { url: string; init: RequestInit; body: unknown };
const originalFetch = globalThis.fetch;

function installMockFetch(
  responder: (url: string, init: RequestInit) => Response | Promise<Response>,
): Captured[] {
  const captured: Captured[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const initSafe = init ?? {};
    let body: unknown = null;
    if (typeof initSafe.body === "string") {
      try {
        body = JSON.parse(initSafe.body);
      } catch {
        body = initSafe.body;
      }
    }
    captured.push({ url, init: initSafe, body });
    return await responder(url, initSafe);
  }) as typeof fetch;
  return captured;
}

const baseInput = {
  productId: 12345,
  availabilityId: 678,
  startTime: "09:00",
  date: "2026-08-15",
  pricingCategoryBookings: [{ pricingCategoryId: 111, quantity: 2 }],
  customer: {
    firstName: "Ana",
    lastName: "Silva",
    email: "ana@example.com",
    phoneNumber: "+351900000000",
    language: "en",
  },
  externalBookingReference: "ext-abc",
  notes: "test note",
};

Deno.test("reserveAndConfirm passes BOKUN_CHANNEL_UUID on success path", async () => {
  const captured = installMockFetch((url) => {
    if (url.endsWith("/activity-booking/reserve")) {
      return new Response(
        JSON.stringify({ id: 999, confirmationCode: "YES-999" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/booking.json/999/confirm")) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("unexpected", { status: 500 });
  });
  try {
    const result = await reserveAndConfirm(baseInput);
    assertEquals(result.bookingId, "999");
    assertEquals(result.confirmationCode, "YES-999");

    const reserveCall = captured.find((c) => c.url.endsWith("/activity-booking/reserve"));
    assert(reserveCall, "reserve call was not made");
    const body = reserveCall.body as { bookingChannel?: { uuid?: string }; source?: string };
    assertEquals(
      body.bookingChannel?.uuid,
      CHANNEL_UUID,
      "bookingChannel.uuid must match BOKUN_CHANNEL_UUID",
    );
    assertEquals(body.source, "API");

    const confirmCall = captured.find((c) => c.url.includes("/booking.json/999/confirm"));
    assert(confirmCall, "confirm call was not made");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("reserveAndConfirm still tags channel when confirm fails", async () => {
  const captured = installMockFetch((url) => {
    if (url.endsWith("/activity-booking/reserve")) {
      return new Response(JSON.stringify({ id: 1001 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/booking.json/1001/confirm")) {
      return new Response("boom", { status: 500 });
    }
    return new Response("unexpected", { status: 500 });
  });
  try {
    await assertRejects(
      () => reserveAndConfirm(baseInput),
      Error,
      "confirm failed",
    );
    const reserveCall = captured.find((c) => c.url.endsWith("/activity-booking/reserve"));
    assert(reserveCall, "reserve call was not made");
    const body = reserveCall.body as { bookingChannel?: { uuid?: string } };
    assertEquals(
      body.bookingChannel?.uuid,
      CHANNEL_UUID,
      "bookingChannel.uuid must be sent even on failure path",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("reserveAndConfirm omits bookingChannel when BOKUN_CHANNEL_UUID unset", async () => {
  Deno.env.delete("BOKUN_CHANNEL_UUID");
  const captured = installMockFetch((url) => {
    if (url.endsWith("/activity-booking/reserve")) {
      return new Response(JSON.stringify({ id: 2002 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  try {
    await reserveAndConfirm(baseInput);
    const reserveCall = captured.find((c) => c.url.endsWith("/activity-booking/reserve"));
    assert(reserveCall);
    const body = reserveCall.body as { bookingChannel?: unknown };
    assertEquals(body.bookingChannel, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.set("BOKUN_CHANNEL_UUID", CHANNEL_UUID);
  }
});
