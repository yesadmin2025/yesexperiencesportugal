import { describe, it, expect } from "vitest";
import { parseCheckoutError, parseCheckoutErrorSync } from "../checkoutError";

describe("parseCheckoutError", () => {
  it("uses the new envelope code when present", async () => {
    const p = await parseCheckoutError({
      error: "irrelevant",
      code: "quote_stale",
      message: "irrelevant",
      retryable: true,
      requestId: "abc123",
    });
    expect(p.code).toBe("quote_stale");
    expect(p.retryable).toBe(true);
    expect(p.supportId).toBe("abc123");
    expect(p.userMessage).toMatch(/quote/i);
  });

  it("maps legacy string error to a canonical code", async () => {
    const p = await parseCheckoutError({ error: "Quote is stale — please refresh" });
    expect(p.code).toBe("quote_stale");
  });

  it("maps bokun_unreachable slug to bokun_unreachable code", async () => {
    const p = await parseCheckoutError({ error: "bokun_unreachable:fetch failed" });
    expect(p.code).toBe("bokun_unreachable");
    expect(p.retryable).toBe(true);
  });

  it("recovers code from Supabase FunctionsHttpError context Response", async () => {
    const body = JSON.stringify({
      error: "…",
      code: "slot_unavailable",
      message: "…",
      retryable: true,
      requestId: "req-1",
    });
    const context = new Response(body, { status: 409, headers: { "Content-Type": "application/json" } });
    const p = await parseCheckoutError({ name: "FunctionsHttpError", message: "…", context });
    expect(p.code).toBe("slot_unavailable");
    expect(p.supportId).toBe("req-1");
  });

  it("classifies network TypeError as network_error", async () => {
    const p = await parseCheckoutError(new TypeError("Failed to fetch"));
    expect(p.code).toBe("network_error");
    expect(p.retryable).toBe(true);
  });

  it("falls back to internal_error for unknown shapes", async () => {
    const p = await parseCheckoutError({ nope: 1 });
    expect(p.code).toBe("internal_error");
  });

  it("sync variant mirrors async for object literals", () => {
    const p = parseCheckoutErrorSync({ code: "capacity_exceeded" });
    expect(p.code).toBe("capacity_exceeded");
  });
});
