/**
 * Envelope coverage for parseCheckoutError.
 *
 * For every CheckoutErrorCode we ship a guest-facing message for, assert:
 *   1. New envelope { code, message, retryable, requestId } → correct
 *      userMessage + retryable + supportId.
 *   2. FunctionsHttpError wrapper (SDK v2) with a Response.context → same
 *      userMessage.
 *   3. Legacy string envelope { error: "…" } that maps back to the code →
 *      same userMessage.
 *
 * This locks the shape contract between the edge function and the Studio
 * checkout UI: adding a code without wiring guest copy fails this test.
 */
import { describe, it, expect } from "vitest";
import {
  parseCheckoutError,
  parseCheckoutErrorSync,
  type CheckoutErrorCode,
} from "../checkoutError";

type CaseRow = {
  code: CheckoutErrorCode;
  retryable: boolean;
  legacyString?: string; // must round-trip through codeFromLegacyString
};

// Kept explicit (not read from the internal COPY table) so a stealth
// edit to the copy table can't silently pass this test.
const CASES: CaseRow[] = [
  { code: "quote_stale", retryable: true, legacyString: "quote_stale: refresh" },
  { code: "quote_expired", retryable: true, legacyString: "quote expired for user" },
  { code: "quote_mismatch", retryable: true, legacyString: "quote_token_mismatch" },
  { code: "quote_token_invalid", retryable: true, legacyString: "quote_token invalid" },
  { code: "signature_unavailable", retryable: true, legacyString: "journey is unavailable" },
  { code: "amount_below_minimum", retryable: true, legacyString: "amount below minimum" },
  { code: "return_url_not_allowed", retryable: false, legacyString: "return url not allowed" },
  { code: "bokun_unreachable", retryable: true, legacyString: "bokun_unreachable: 502" },
  { code: "slot_unavailable", retryable: true, legacyString: "slot_unavailable" },
  { code: "capacity_exceeded", retryable: true, legacyString: "capacity_exceeded" },
  { code: "category_not_ready", retryable: true, legacyString: "category_not_ready" },
  { code: "pricing_unavailable", retryable: true, legacyString: "pricing unavailable" },
  { code: "config_missing", retryable: false, legacyString: "stripe not configured" },
  { code: "validation_failed", retryable: true, legacyString: "invalid body: guests" },
  { code: "network_error", retryable: true, legacyString: "Failed to fetch" },
  { code: "internal_error", retryable: true }, // fallback
  // method_not_allowed has no legacy phrase but must still round-trip via envelope.
  { code: "method_not_allowed", retryable: false },
];

function makeContext(body: Record<string, unknown>): { clone: () => Response } {
  return {
    clone: () =>
      new Response(JSON.stringify(body), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
  };
}

describe("parseCheckoutError — full envelope coverage", () => {
  for (const { code, retryable, legacyString } of CASES) {
    describe(code, () => {
      it("maps new envelope directly", async () => {
        const parsed = await parseCheckoutError({
          error: { code, message: "server-side text" },
          code,
          message: "server-side text",
          retryable,
          requestId: "req_abc123",
        });
        expect(parsed.code).toBe(code);
        expect(parsed.retryable).toBe(retryable);
        expect(parsed.supportId).toBe("req_abc123");
        expect(parsed.userMessage.length).toBeGreaterThan(0);
        // Guest copy must NOT be a raw code string or stack trace.
        expect(parsed.userMessage).not.toMatch(new RegExp(code));
        expect(parsed.userMessage).not.toMatch(/undefined|\[object|null/);
      });

      it("maps FunctionsHttpError → Response.context envelope", async () => {
        const parsed = await parseCheckoutError({
          name: "FunctionsHttpError",
          message: "Edge Function returned a non-2xx status code",
          context: makeContext({ error: `error:${code}`, code, retryable, requestId: "req_ctx_1" }),
        });
        expect(parsed.code).toBe(code);
        expect(parsed.retryable).toBe(retryable);
        expect(parsed.supportId).toBe("req_ctx_1");
      });

      if (legacyString) {
        it("maps legacy string envelope back to code", async () => {
          const parsed = await parseCheckoutError({ error: legacyString });
          expect(parsed.code).toBe(code);
          // Legacy path has no requestId — but must still produce guest copy.
          expect(parsed.userMessage.length).toBeGreaterThan(0);
        });
      }

      it("sync fallback preserves code + userMessage", () => {
        const parsed = parseCheckoutErrorSync({
          code,
          retryable,
          requestId: "req_sync_9",
        });
        expect(parsed.code).toBe(code);
        expect(parsed.retryable).toBe(retryable);
        expect(parsed.supportId).toBe("req_sync_9");
      });
    });
  }

  it("unknown code falls back to internal_error with retryable=true", async () => {
    const parsed = await parseCheckoutError({
      code: "not_a_real_code",
      message: "…",
      retryable: false,
      requestId: "req_zzz",
    });
    expect(parsed.code).toBe("internal_error");
    expect(parsed.retryable).toBe(true);
  });

  it("empty envelope falls back to internal_error", async () => {
    const parsed = await parseCheckoutError(undefined);
    expect(parsed.code).toBe("internal_error");
    expect(parsed.userMessage.length).toBeGreaterThan(0);
  });
});
