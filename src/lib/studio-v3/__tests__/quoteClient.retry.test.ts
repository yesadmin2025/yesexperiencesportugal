/**
 * Retry & failure-mode contract for Studio V3 quoteClient.
 *
 * Studio's `handleStripeCheckout` surfaces `error.message` directly in the
 * toast — that message MUST be guest-safe for every failure mode
 * (timeout / abort, malformed non-JSON body, 5xx upstream, retryable vs
 * non-retryable envelope codes), and a retry after failure must fire
 * exactly one more request with an identical body.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type InvokeArgs = { fn: string; body: unknown };

const invokeCalls: InvokeArgs[] = [];
let nextInvokeImpls: Array<() => Promise<{ data: unknown; error: unknown }>> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async (fn: string, opts: { body: unknown }) => {
        invokeCalls.push({ fn, body: opts.body });
        const impl = nextInvokeImpls.shift();
        if (!impl) throw new Error(`No stub queued for supabase.functions.invoke(${fn})`);
        return impl();
      }),
    },
  },
}));

import {
  createStudioSession,
  fetchStudioQuote,
  type StudioQuoteSnapshot,
} from "@/lib/studio-v3/quoteClient";

const SNAPSHOT: StudioQuoteSnapshot = {
  commercialProductKey: "studio-v3-private-full-day",
  signatureId: "sintra-cascais",
  title: "Sintra & Cascais",
  destinationRegion: "Sintra",
  pickupCity: "Lisbon",
  date: "2099-05-01",
  startTime: "09:00",
  language: "en",
  guests: 2,
  routeStops: [{ id: "regaleira", label: "Quinta da Regaleira" }],
  selectedAddOns: [],
  routeStatus: "pending-review",
};

const SESSION_INPUT = {
  quoteToken: "qtok_studio",
  currentRevision: "rev_1",
  snapshot: SNAPSHOT,
  environment: "sandbox" as const,
  returnUrl: "https://example.test/return",
  uiMode: "embedded" as const,
  customerEmail: "guest@example.test",
};

function envelope(code: string, retryable: boolean, message = "server error") {
  return {
    error: `${code}:${message}`,
    code,
    message,
    retryable,
    requestId: `req_${code}`,
  };
}

function functionsHttpError(status: number, body: unknown) {
  return {
    name: "FunctionsHttpError",
    message: "Edge Function returned a non-2xx status code",
    context: {
      clone: () =>
        new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status,
          headers: {
            "content-type": typeof body === "string" ? "text/html" : "application/json",
          },
        }),
    },
  };
}

function goodQuote() {
  return {
    data: {
      quoteToken: "qtok_new",
      revision: "rev_1",
      snapshotHash: "hash",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      pricing: {
        status: "quoted",
        commercialProductKey: "studio-v3-private-full-day",
        guests: 2,
        unitEur: 160,
        baseSubtotalEur: 320,
        addOnsSubtotalEur: 0,
        totalEur: 320,
        currency: "EUR",
      },
      addOns: [],
      inclusions: [],
      routeStatus: "validated",
      availabilityStatus: "validated",
      itinerary: {
        title: "Sintra & Cascais",
        destinationRegion: "Sintra",
        pickupCity: "Lisbon",
        date: "2099-05-01",
        startTime: "09:00",
        language: "en",
        guests: 2,
        routeStops: SNAPSHOT.routeStops,
      },
    },
    error: null,
  };
}

function goodSession() {
  return {
    data: {
      url: null,
      clientSecret: "cs_test_secret",
      sessionId: "cs_test_1",
      publishableKey: "pk_test_1",
      uiMode: "embedded",
      pricing: goodQuote().data.pricing,
      routeStatus: "validated",
      availabilityStatus: "validated",
      idempotencyKey: "ik_1",
    },
    error: null,
  };
}

beforeEach(() => {
  invokeCalls.length = 0;
  nextInvokeImpls = [];
});
afterEach(() => {
  expect(nextInvokeImpls, "test queued more stubs than it consumed").toEqual([]);
});

describe("fetchStudioQuote — failure modes route through parseCheckoutError", () => {
  it("aborted fetch → guest-safe network copy", async () => {
    nextInvokeImpls.push(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    await expect(fetchStudioQuote(SNAPSHOT)).rejects.toThrow(/connection dropped|try again/i);
  });

  it("TypeError network failure → guest-safe network copy, never raw", async () => {
    nextInvokeImpls.push(async () => {
      throw Object.assign(new TypeError("Failed to fetch"), { name: "TypeError" });
    });
    let caught: Error | null = null;
    try {
      await fetchStudioQuote(SNAPSHOT);
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeTruthy();
    expect(caught!.message).not.toBe("Failed to fetch");
    expect(caught!.message).toMatch(/connection dropped|try again/i);
  });

  it("malformed non-JSON body → guest copy, no raw HTML leak", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(200, "<html>oops</html>"),
    }));
    let caught: Error | null = null;
    try {
      await fetchStudioQuote(SNAPSHOT);
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeTruthy();
    expect(caught!.message).not.toMatch(/<html/i);
    expect(caught!.message).not.toMatch(/non-2xx/i);
  });

  it("5xx bokun_unreachable envelope → partner-unreachable copy", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(502, envelope("bokun_unreachable", true)),
    }));
    await expect(fetchStudioQuote(SNAPSHOT)).rejects.toThrow(/booking partner|unreachable/i);
  });

  it("500 internal_error envelope → generic retryable copy", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(500, envelope("internal_error", true)),
    }));
    await expect(fetchStudioQuote(SNAPSHOT)).rejects.toThrow(/something went wrong|try again/i);
  });

  it("non-retryable config_missing → team-notified copy", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(500, envelope("config_missing", false)),
    }));
    await expect(fetchStudioQuote(SNAPSHOT)).rejects.toThrow(
      /temporarily unavailable|team has been notified/i,
    );
  });
});

describe("createStudioSession — failure modes route through parseCheckoutError", () => {
  it("timeout → guest-safe copy", async () => {
    nextInvokeImpls.push(async () => {
      throw Object.assign(new Error("timed out"), { name: "AbortError" });
    });
    await expect(createStudioSession(SESSION_INPUT)).rejects.toThrow(/connection|try again/i);
  });

  it("malformed body → guest copy", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(200, "<html/>"),
    }));
    let caught: Error | null = null;
    try {
      await createStudioSession(SESSION_INPUT);
    } catch (err) {
      caught = err as Error;
    }
    expect(caught!.message).not.toMatch(/<html/i);
  });

  it("bokun_unreachable → partner copy", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(502, envelope("bokun_unreachable", true)),
    }));
    await expect(createStudioSession(SESSION_INPUT)).rejects.toThrow(/booking partner/i);
  });
});

describe("retry semantics — quote + session pair", () => {
  it("retry after failed quote re-invokes with identical body, exactly once", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(500, envelope("internal_error", true)),
    }));
    nextInvokeImpls.push(async () => goodQuote());

    await expect(fetchStudioQuote(SNAPSHOT)).rejects.toThrow();
    expect(invokeCalls).toHaveLength(1);

    const ok = await fetchStudioQuote(SNAPSHOT);
    expect(ok.quoteToken).toBe("qtok_new");
    expect(invokeCalls).toHaveLength(2);
    expect(invokeCalls[1].body).toEqual(invokeCalls[0].body);
  });

  it("retry after failed create-session re-invokes with identical body", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(502, envelope("bokun_unreachable", true)),
    }));
    nextInvokeImpls.push(async () => goodSession());

    await expect(createStudioSession(SESSION_INPUT)).rejects.toThrow();
    const ok = await createStudioSession(SESSION_INPUT);
    expect(ok.sessionId).toBe("cs_test_1");
    expect(invokeCalls).toHaveLength(2);
    expect(invokeCalls[1].body).toEqual(invokeCalls[0].body);
  });

  it("three sequential failures each fire one request (no stale guard)", async () => {
    for (let i = 0; i < 3; i += 1) {
      nextInvokeImpls.push(async () => ({
        data: null,
        error: functionsHttpError(502, envelope("bokun_unreachable", true)),
      }));
      await expect(fetchStudioQuote(SNAPSHOT)).rejects.toThrow();
    }
    expect(invokeCalls).toHaveLength(3);
  });
});
