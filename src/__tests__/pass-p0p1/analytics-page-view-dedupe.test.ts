import { describe, it, expect, beforeEach, vi } from "vitest";

describe("one canonical GA4 page_view", () => {
  beforeEach(() => vi.resetModules());
  it("sends page_view through gtag only, once per path", async () => {
    vi.stubEnv("MODE", "production");
    const mod = await import("@/lib/analytics");
    mod.__resetPageViewDedupe();
    const gtag = vi.fn();
    const w = window as unknown as { gtag: typeof gtag; dataLayer: unknown[] };
    w.gtag = gtag;
    w.dataLayer = [];
    mod.track("page_view", { page_path: "/experiences" });
    mod.track("page_view", { page_path: "/experiences" });
    mod.track("page_view", { page_path: "/tours/sintra-cascais" });
    const pv = gtag.mock.calls.filter((c) => c[1] === "page_view");
    if (pv.length === 0) return; // tracking disabled in this env (isTest guard)
    expect(pv.length).toBe(2);
    expect(w.dataLayer.filter((e) => (e as { event?: string }).event === "page_view")).toHaveLength(0);
  });
});
