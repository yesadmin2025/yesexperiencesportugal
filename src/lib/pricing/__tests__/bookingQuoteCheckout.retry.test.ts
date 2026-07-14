/**
 * Retry & failure-mode contract for `createBookingQuoteSession`.
 *
 * Locks the behaviour Studio checkout depends on:
 *   • Every failure mode (timeout / abort, malformed non-JSON body, 5xx
 *     upstream, retryable vs non-retryable envelope codes) surfaces the
 *     guest-safe copy from src/lib/checkout/checkoutError.ts.
 *   • A retry after a failure invokes the edge function exactly once more,
 *     with the same input body — no stale in-flight guard blocks it, no
 *     duplicate concurrent requests.
 *   • The thrown `Error.message` is guest-friendly (never a raw HTML/JSON
 *     dump or "Edge Function returned a non-2xx status code").
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
        if (!impl) {
          throw new Error(`No stub queued for supabase.functions.invoke(${fn})`);
        }
        return impl();
      }),
    },
  },
}));

// Import AFTER the mock so the module wires to the mocked client.
import { createBookingQuoteSession } from "@/lib/pricing/bookingQuoteCheckout";

const BASE_INPUT = {
  quoteToken: "qtok_abc",
  environment: "sandbox" as const,
  returnUrl: "https://example.test/return",
  cancelUrl: "https://example.test/cancel",
  uiMode: "hosted" as const,
  customerEmail: "guest@example.test",
  tourTitle: "Sintra & Cascais",
  pickupLabel: "09:00",
  journeyTitle: "Sintra & Cascais",
};

function successResponse() {
  return {
    data: {
      url: "https://checkout.stripe.test/session/cs_test_1",
      clientSecret: null,
      sessionId: "cs_test_1",
      publishableKey: "pk_test_1",
      flow: "signature",
      productName: "Sintra & Cascais",
      submitMessage: "Reserve & pay",
      uiMode: "hosted",
      pricing: {
        baseLines: [],
        baseSubtotalEur: 320,
        addOnLines: [],
        addOnSubtotalEur: 0,
        finalTotalEur: 320,
      },
      idempotencyKey: "ik_1",
    },
    error: null,
  };
}

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

beforeEach(() => {
  invokeCalls.length = 0;
  nextInvokeImpls = [];
});
afterEach(() => {
  expect(nextInvokeImpls, "test queued more stubs than it consumed").toEqual([]);
});

describe("createBookingQuoteSession — failure modes", () => {
  it("timeout / aborted fetch → network_error copy, retryable", async () => {
    const abortErr = Object.assign(new Error("The operation was aborted"), {
      name: "AbortError",
    });
    nextInvokeImpls.push(async () => {
      throw abortErr;
    });

    await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow(
      /connection dropped|try again/i,
    );
    expect(invokeCalls).toHaveLength(1);
  });

  it("network TypeError (fetch failed) → network_error copy, retryable", async () => {
    nextInvokeImpls.push(async () => {
      throw Object.assign(new TypeError("Failed to fetch"), { name: "TypeError" });
    });
    await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow(
      /connection dropped|try again/i,
    );
    expect(invokeCalls).toHaveLength(1);
  });

  it("malformed non-JSON payload → generic guest copy, never raw HTML", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(200, "<html>gateway error</html>"),
    }));

    let caught: Error | null = null;
    try {
      await createBookingQuoteSession(BASE_INPUT);
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeTruthy();
    expect(caught!.message).not.toMatch(/<html/i);
    expect(caught!.message).not.toMatch(/non-2xx/i);
    expect(caught!.message.length).toBeGreaterThan(0);
  });

  it("5xx upstream (bokun_unreachable) → retryable, partner copy", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(502, envelope("bokun_unreachable", true)),
    }));

    await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow(
      /booking partner|unreachable/i,
    );
    expect(invokeCalls).toHaveLength(1);
  });

  it("500 internal_error → generic retryable copy", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(500, envelope("internal_error", true)),
    }));

    await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow(
      /something went wrong|try again/i,
    );
  });

  it("non-retryable config_missing → guest still sees actionable copy", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(500, envelope("config_missing", false)),
    }));

    await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow(
      /temporarily unavailable|team has been notified/i,
    );
  });

  it("success response returns the session unmodified", async () => {
    nextInvokeImpls.push(async () => successResponse());
    const resp = await createBookingQuoteSession(BASE_INPUT);
    expect(resp.sessionId).toBe("cs_test_1");
    expect(invokeCalls).toHaveLength(1);
  });
});

describe("createBookingQuoteSession — retry semantics", () => {
  it("retry after failure re-invokes with identical body, exactly once", async () => {
    nextInvokeImpls.push(async () => ({
      data: null,
      error: functionsHttpError(500, envelope("internal_error", true)),
    }));
    nextInvokeImpls.push(async () => successResponse());

    // 1st attempt fails
    await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow();
    expect(invokeCalls).toHaveLength(1);

    // Retry succeeds; body is byte-identical (proves no stale-input mutation)
    const resp = await createBookingQuoteSession(BASE_INPUT);
    expect(resp.sessionId).toBe("cs_test_1");
    expect(invokeCalls).toHaveLength(2);
    expect(invokeCalls[1].body).toEqual(invokeCalls[0].body);
    expect(invokeCalls[1].fn).toBe("create-signature-checkout");
  });

  it("multiple sequential failures each fire one request (no stale pending guard)", async () => {
    for (let i = 0; i < 3; i += 1) {
      nextInvokeImpls.push(async () => ({
        data: null,
        error: functionsHttpError(502, envelope("bokun_unreachable", true)),
      }));
      await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow();
    }
    expect(invokeCalls).toHaveLength(3);
  });

  it("retry after timeout → success on second try, only 2 total calls", async () => {
    nextInvokeImpls.push(async () => {
      throw Object.assign(new TypeError("Failed to fetch"), { name: "TypeError" });
    });
    nextInvokeImpls.push(async () => successResponse());

    await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow();
    const ok = await createBookingQuoteSession(BASE_INPUT);
    expect(ok.sessionId).toBe("cs_test_1");
    expect(invokeCalls).toHaveLength(2);
  });

  it("response missing sessionId is treated as an error, retry still succeeds", async () => {
    nextInvokeImpls.push(async () => ({
      data: { error: "unexpected shape" },
      error: null,
    }));
    nextInvokeImpls.push(async () => successResponse());

    await expect(createBookingQuoteSession(BASE_INPUT)).rejects.toThrow();
    const ok = await createBookingQuoteSession(BASE_INPUT);
    expect(ok.sessionId).toBe("cs_test_1");
    expect(invokeCalls).toHaveLength(2);
  });
});
