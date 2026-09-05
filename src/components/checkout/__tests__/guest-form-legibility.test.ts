/**
 * Guest-form / checkout legibility regression guard.
 *
 * Locks in the P0 checkout legibility pass: functional labels, helper text,
 * trust/payment microcopy and disclosures must stay readable on a 393px
 * phone, inputs must remain 16px/48px so iOS never zooms, and the
 * cancellation disclosure must render from the canonical source of truth.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const GUEST_FORM = read("src/components/checkout/guest-form-ui.tsx");
const GUEST_DETAILS = read("src/components/studio-v3/GuestDetailsStep.tsx");
const SUMMARY = read("src/components/studio-v3/CheckoutSummary.tsx");
const DRAWER = read("src/components/checkout/BrandedCheckoutDrawer.tsx");
const CHARGE_LINE = read("src/components/checkout/ChargeSummaryLine.tsx");

const sizes = (src: string) =>
  [...src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));

describe("guest form primitives legibility", () => {
  it("inputs stay 16px on mobile and at least 48px high", () => {
    expect(GUEST_FORM).toContain("text-[16px]");
    expect(GUEST_FORM).toContain("min-h-[48px]");
  });

  it("field labels and hints are sentence-scale, not micro-type", () => {
    expect(GUEST_FORM).toContain("text-[13.5px] font-medium");
    expect(GUEST_FORM).toContain("text-[12.5px]");
  });

  it("the optional disclosure is collapsed by default and clears 44px", () => {
    expect(GUEST_FORM).toContain("defaultOpen = false");
    expect(GUEST_FORM).toContain("min-h-[44px]");
  });
});

describe("GuestDetailsStep legibility", () => {
  it("has no functional text below 11.5px", () => {
    const s = sizes(GUEST_DETAILS);
    expect(s.length).toBeGreaterThan(0);
    expect(Math.min(...s)).toBeGreaterThanOrEqual(11.5);
  });

  it("keeps the sticky secure-checkout line readable and in charcoal", () => {
    expect(GUEST_DETAILS).toContain("text-[12.5px] uppercase tracking-[0.12em] text-[color:var(--charcoal)]");
  });
});

describe("CheckoutSummary legibility", () => {
  it("has no functional text below 11.5px", () => {
    const s = sizes(SUMMARY);
    expect(s.length).toBeGreaterThan(0);
    expect(Math.min(...s)).toBeGreaterThanOrEqual(11.5);
  });

  it("keeps the sticky Paying now label at 12.5px in charcoal", () => {
    expect(SUMMARY).toContain("Paying now");
    expect(SUMMARY).toContain('className="text-[12.5px] uppercase tracking-[0.2em]"');
  });

  it("shows the canonical cancellation disclosure before payment", () => {
    expect(SUMMARY).toContain('from "@/config/business-nap"');
    expect(SUMMARY).toContain("CANCELLATION.custom.en");
    expect(SUMMARY).toContain("studio-v3-checkout-cancellation-note");
  });
});

describe("shared checkout surfaces legibility", () => {
  it("drawer has no functional text below 12px", () => {
    const s = sizes(DRAWER);
    expect(s.length).toBeGreaterThan(0);
    expect(Math.min(...s)).toBeGreaterThanOrEqual(12);
  });

  it("charge summary line has no functional text below 11px", () => {
    const s = sizes(CHARGE_LINE);
    expect(s.length).toBeGreaterThan(0);
    expect(Math.min(...s)).toBeGreaterThanOrEqual(11);
  });

  it("keeps 44px touch targets on disclosure toggles", () => {
    expect(CHARGE_LINE).toContain("min-h-[44px]");
    expect(DRAWER).toContain("min-h-[44px]");
  });
});
