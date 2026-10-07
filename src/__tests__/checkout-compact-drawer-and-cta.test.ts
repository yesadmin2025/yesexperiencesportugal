/**
 * Pass 1A correction contracts.
 *
 * 1. The Signature booking card exposes exactly ONE primary action and
 *    its label is the approved "Reserve this day".
 * 2. The payment drawer is compact: essential product context stays visible,
 *    a single trust line remains, and itemisation lives behind one disclosure.
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

  it("keeps Reserve tappable for validation and gives page-level intents inline guidance", () => {
    expect(bookingForm).not.toContain("aria-disabled={!canReserve}");
    const intent = bookingForm.slice(bookingForm.indexOf("const onIntent ="), bookingForm.indexOf("// Embedded checkout state"));
    expect(intent).toContain("setBlockMessage(!dateValid");
    expect(intent).toContain("Add an age for every child.");
    expect(intent).toContain("setBlockMessage(null)");
    expect(intent).toContain("setDetailsOpen(true)");
  });

  it("no longer treats 'Reserve this day' as a legacy CTA", () => {
    expect(legacy).not.toMatch(/^\s*"Reserve this day",$/m);
  });
});

describe("compact payment drawer", () => {
  it("reserves space for the close control beside long mobile checkout labels", () => {
    expect(drawer).toContain('min-h-[44px] min-w-[44px]');
    expect(drawer).toContain('<Eyebrow className="pr-12">');
    expect(drawer).toContain('mt-2 pr-12 font-normal');
  });
  it("keeps exactly one trust line and no bottom secure-checkout footer", () => {
    expect(drawer).toContain('data-testid="checkout-drawer-trust-line"');
    expect(drawer).not.toContain("256-bit encrypted");
    expect((drawer.match(/checkout-drawer-trust-line/g) ?? []).length).toBe(1);
  });

  it("keeps imagery out while surfacing duration, region and pickup", () => {
    expect(drawer).not.toContain("summary.heroSrc");
    expect(drawer).toContain("summary.region");
    expect(drawer).toContain("summary.durationHours");
    expect(drawer).toContain("summary.pickupLabel");
    expect(drawer).toContain('data-testid="checkout-drawer-product-context"');
  });

  it("renders a compact meta line and a prominent total", () => {
    expect(drawer).toContain('data-testid="checkout-drawer-meta"');
    expect(drawer).toContain('data-testid="checkout-drawer-total"');
  });

  it("hides traveller bands, add-ons and inclusions behind one Signature disclosure", () => {
    expect(drawer).toContain('const [open, setOpen] = useState(false);');
    expect(drawer).toContain('data-testid="checkout-drawer-details-toggle"');
    expect(drawer).toContain("Your day at a glance");
    expect(drawer).toContain("What's included");
    const detailsIdx = drawer.indexOf('data-testid="checkout-drawer-details"');
    expect(detailsIdx).toBeGreaterThan(-1);
    for (const marker of ["checkout-drawer-journey-lines", "Add-ons", "summary.beats!"]) {
      expect(drawer.indexOf(marker)).toBeGreaterThan(detailsIdx);
    }
  });

  it("does not link to an invented cancellation policy page", () => {
    expect(drawer).not.toMatch(/href="[^"]*(policy|terms|cancellation)/i);
  });

  it("keeps the completed details available for an immediate checkout retry", () => {
    expect(bookingForm).toContain("setLastDetails(details)");
    expect(bookingForm).toContain("Your details are saved — please try again.");
    expect(bookingForm).toContain("onRetry={lastDetails ? () => void handleReserve(lastDetails) : undefined}");
    expect(drawer).toContain("Try secure checkout again");
  });
});
