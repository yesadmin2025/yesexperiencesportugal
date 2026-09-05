/**
 * Guest/checkout legibility guard.
 *
 * Functional checkout microcopy (labels, helpers, trust lines, section
 * titles) on the shared guest-detail and drawer surfaces must never slip
 * back to sub-11.5px type or faint translucent charcoal — the regression
 * this locks out made trust and helper text effectively unreadable on a
 * 393px phone.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/components/checkout/guest-form-ui.tsx",
  "src/components/studio-v3/GuestDetailsStep.tsx",
  "src/components/checkout/BrandedCheckoutDrawer.tsx",
];

const sources = FILES.map((p) => ({
  path: p,
  code: readFileSync(resolve(process.cwd(), p), "utf8"),
}));

describe("guest/checkout surface legibility", () => {
  it.each(sources)("$path has no functional text below 11.5px", ({ code }) => {
    const sizes = [...code.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11.5);
  });

  it.each(sources)("$path keeps inputs at 16px mobile with 48px targets", ({ code: _c, path }) => {
    if (!path.includes("guest-form-ui")) return;
    expect(_c).toContain("text-[16px]");
    expect(_c).toContain("min-h-[48px]");
  });

  it("sticky guest-details trust line is readable charcoal, not 10px", () => {
    const gd = sources.find((s) => s.path.includes("GuestDetailsStep"))!.code;
    expect(gd).toContain("Secure checkout · Final price shown at payment");
    expect(gd).not.toMatch(/text-\[10px\][^>]*Secure checkout/);
  });

  it("drawer trust line keeps the canonical cancellation source", () => {
    const drawer = sources.find((s) => s.path.includes("BrandedCheckoutDrawer"))!.code;
    expect(drawer).toContain("CANCELLATION.signature.en");
    expect(drawer).toContain("checkout-drawer-trust-line");
  });
});
