/**
 * Checkout legibility + trust guard.
 *
 * Functional checkout microcopy (labels, security, cancellation) must stay
 * readable: no sub-11px functional type on this surface, no translucent
 * charcoal for small text, and the canonical cancellation disclosure must
 * be present before payment.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/CheckoutSummary.tsx"),
  "utf8",
);

describe("CheckoutSummary legibility", () => {
  it("has no functional text below 11px", () => {
    const sizes = [...SRC.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
  });

  it("never renders small text in translucent charcoal", () => {
    expect(SRC).not.toMatch(/color-mix\(in oklab, var\(--charcoal\) 6\d%/);
  });

  it("shows the canonical cancellation disclosure before payment", () => {
    expect(SRC).toContain('from "@/config/business-nap"');
    expect(SRC).toContain("CANCELLATION.custom.en");
    expect(SRC).toContain("studio-v3-checkout-cancellation-note");
  });

  it("keeps the reserve funnel events on the summary surface", () => {
    expect(SRC).toContain("studio_checkout_summary_view");
    expect(SRC).toContain("studio_reserve_click");
    expect(SRC).toContain("studio_payment_surface_ready");
  });
});
