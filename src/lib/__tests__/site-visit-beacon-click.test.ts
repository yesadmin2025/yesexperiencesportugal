import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveClickCta } from "@/lib/site-visit-beacon";

describe("resolveClickCta", () => {
  it("Reserve button on Tailor page = tailor", () => {
    expect(resolveClickCta("Reserve this day", "", "/tours/arrabida-wine-allinclusive/tailor")).toBe("tailor");
  });
  it("Reserve button on Signature page = signature", () => {
    expect(resolveClickCta("Reserve this day", "", "/tours/arrabida-wine-allinclusive")).toBe("signature");
  });
  it("card links keep their class", () => {
    expect(resolveClickCta("x", "/tours/a", "/tours/b/tailor")).toBe("signature");
    expect(resolveClickCta("x", "https://yesexperiencesportugal.com/tours/a/tailor", "/")).toBe("tailor");
  });
  it("date/price/checkbox buttons do not count", () => {
    for (const t of ["15", "Next month", "€366", "Remove stop", ""])
      expect(resolveClickCta(t, "", "/tours/a/tailor")).toBeNull();
  });
});

describe("beacon fetch rejection", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  it("rejected fetch does not leak an unhandled rejection", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    Object.defineProperty(window, "location", { value: { ...window.location, hostname: "yesexperiencesportugal.com", pathname: "/" }, configurable: true });
    const m = await import("@/lib/site-visit-beacon");
    m.trackVisit("/x-" + Date.now());
    await new Promise((r) => setTimeout(r, 20));
    process.off("unhandledRejection", unhandled);
    expect(fetch).toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });
});
