/**
 * Pass 1A correction contracts.
 *
 * 1. The Signature booking card exposes exactly ONE primary action and
 *    its label is the approved "Reserve this day".
 * 2. The payment drawer is compact: no hero/region/duration above Stripe,
 *    a single trust line (no bottom secure-checkout footer), and every
 *    itemisation lives behind one `Details` disclosure.
 *
 * Source-level assertions keep these cheap and stable; the visual side is
 * covered by the mobile Playwright smoke.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const bookingForm = read("src/components/SimpleBookingForm.tsx");
const drawer = read("src/components/checkout/BrandedCheckoutDrawer.tsx");
const legacy = read("e2e/copy-parity-constants.ts");

describe("Signature primary CTA", () => {
  it("uses the approved 'Reserve this day' label", () => {
    expect(bookingForm).toContain("Reserve this day");
  });

  it("no longer uses the retired 'Reserve securely' label on Signature", () => {
    expect(bookingForm).not.toContain("Reserve securely");
  });

  it("renders exactly one primary reserve button", () => {
    const matches = bookingForm.match(/data-testid="signature-reserve-cta"/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it("no longer treats 'Reserve this day' as a legacy CTA", () => {
    expect(legacy).not.toMatch(/^\s*"Reserve this day",$/m);
  });
});

describe("compact payment drawer", () => {
  it("keeps exactly one trust line and no bottom secure-checkout footer", () => {
    expect(drawer).toContain('data-testid="checkout-drawer-trust-line"');
    expect(drawer).not.toContain("256-bit encrypted");
    expect((drawer.match(/checkout-drawer-trust-line/g) ?? []).length).toBe(1);
  });

  it("does not render hero, region or duration in the payment summary", () => {
    expect(drawer).not.toContain("summary.heroSrc");
    expect(drawer).not.toContain("summary.region");
    expect(drawer).not.toContain("summary.durationHours");
  });

  it("renders a compact meta line and a prominent total", () => {
    expect(drawer).toContain('data-testid="checkout-drawer-meta"');
    expect(drawer).toContain('data-testid="checkout-drawer-total"');
  });

  it("hides traveller bands, add-ons and beats behind one Details disclosure", () => {
    expect(drawer).toContain('data-testid="checkout-drawer-details-toggle"');
    const detailsIdx = drawer.indexOf('data-testid="checkout-drawer-details"');
    expect(detailsIdx).toBeGreaterThan(-1);
    for (const marker of ["checkout-drawer-journey-lines", "Add-ons", "summary.beats!"]) {
      expect(drawer.indexOf(marker)).toBeGreaterThan(detailsIdx);
    }
  });

  it("does not link to an invented cancellation policy page", () => {
    expect(drawer).not.toMatch(/href="[^"]*(policy|terms|cancellation)/i);
  });
});
