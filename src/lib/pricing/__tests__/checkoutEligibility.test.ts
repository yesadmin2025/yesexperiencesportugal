import { describe, it, expect } from "vitest";
import {
  deriveCheckoutEligibility,
  isInstantEligible,
} from "@/lib/pricing/checkoutEligibility";

describe("deriveCheckoutEligibility — server contract mirror", () => {
  it("maps manual-viator-tiers to enquiry_only (never instant)", () => {
    expect(deriveCheckoutEligibility("manual-viator-tiers")).toBe("enquiry_only");
  });

  it("maps bokun-live to instant", () => {
    expect(deriveCheckoutEligibility("bokun-live")).toBe("instant");
  });
});

describe("isInstantEligible — quote gate for opening Stripe", () => {
  it("prefers server-provided checkoutEligibility over source", () => {
    // Defensive: even if a rolling deploy briefly reports bokun-live with
    // enquiry_only, the server field wins — never charge a card the server
    // has explicitly disallowed.
    expect(
      isInstantEligible({ source: "bokun-live", checkoutEligibility: "enquiry_only" }),
    ).toBe(false);
    expect(
      isInstantEligible({ source: "manual-viator-tiers", checkoutEligibility: "instant" }),
    ).toBe(true);
  });

  it("falls back to source-derivation when checkoutEligibility is missing", () => {
    expect(isInstantEligible({ source: "manual-viator-tiers" })).toBe(false);
    expect(isInstantEligible({ source: "bokun-live" })).toBe(true);
  });

  it("returns false for null / undefined / empty quote", () => {
    expect(isInstantEligible(null)).toBe(false);
    expect(isInstantEligible(undefined)).toBe(false);
    expect(isInstantEligible({})).toBe(false);
  });
});
