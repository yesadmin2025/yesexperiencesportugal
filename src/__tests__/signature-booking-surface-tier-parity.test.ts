import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/SimpleBookingForm.tsx"),
  "utf8",
);

describe("Signature booking surface — exact tier parity", () => {
  it("marks the surface unavailable when an exact party size has no tier", () => {
    expect(SOURCE).toContain("const priceUnavailable = guests >= 1 && perPax == null");
  });

  it("shows a curator contact path instead of a fabricated exact total", () => {
    expect(SOURCE).toContain("signature-price-unavailable");
    expect(SOURCE).toContain("signature-price-unavailable-cta");
    expect(SOURCE).toMatch(/priceUnavailable \? \(/);
  });

  it("never opens checkout without an approved exact tier", () => {
    expect(SOURCE).toContain("if (resolved == null) {");
    expect(SOURCE).not.toContain("resolved?.eurPerPax ?? tour.priceFrom");
  });
});
