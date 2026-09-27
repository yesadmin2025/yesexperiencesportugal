import { describe, it, expect, vi, beforeEach } from "vitest";

const state = { verified: null as string | null, ip: "1.2.3.4" as string | null, counts: new Map<string, number>() };

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({ headers: new Headers(state.ip ? { "cf-connecting-ip": state.ip } : {}) }),
}));
vi.mock("@/lib/verifiedCaller.server", () => ({ getVerifiedUserId: async () => state.verified }));
vi.mock("@/lib/rateLimit.server", () => ({
  rateLimit: async (o: { sessionId: string; bucket: string; limit: number }) => {
    const k = `${o.sessionId}|${o.bucket}`;
    const c = (state.counts.get(k) ?? 0) + 1;
    state.counts.set(k, c);
    return { ok: c <= o.limit, remaining: 0, resetInSec: 1 };
  },
}));

import { allowAiCall, GUEST_IP_LIMIT } from "@/lib/aiGate.server";

describe("aiGate", () => {
  beforeEach(() => {
    state.verified = null;
    state.ip = "1.2.3.4";
    state.counts.clear();
    process.env.LOVABLE_API_KEY = "k";
  });

  it("allows guests under the IP cap", async () => {
    expect(await allowAiCall("t")).toBe("k");
  });

  it("falls back once a guest exceeds the IP cap", async () => {
    for (let i = 0; i < GUEST_IP_LIMIT; i++) await allowAiCall("t");
    expect(await allowAiCall("t")).toBeUndefined();
  });

  it("falls back when the global daily cap is reached", async () => {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    state.counts.set(`global-day-${day}|ai_day_t`, 10_000);
    state.verified = "user";
    expect(await allowAiCall("t")).toBeUndefined();
  });

  it("falls back without a client address or key", async () => {
    state.ip = null;
    expect(await allowAiCall("t")).toBeUndefined();
    state.ip = "1.2.3.4";
    delete process.env.LOVABLE_API_KEY;
    expect(await allowAiCall("t")).toBeUndefined();
  });
});
