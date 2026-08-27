import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePerPaxEur } from "@/data/signatureTourPricing";
import { signatureTours } from "@/data/signatureTours";

const SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/SimpleBookingForm.tsx"),
  "utf8",
);

describe("Signature booking surface — exact tier parity", () => {
  it("resolver refuses an exact party size with no approved tier", () => {
    const tour = signatureTours.find((t: { id: string; priceFrom: number }) => t.id === "arrabida-wine-allinclusive");
    expect(tour).toBeTruthy();
    expect(resolvePerPaxEur(tour!, 1)).toBeNull();
  });

  it("keeps priceFrom only as the generic unknown-party anchor", () => {
    const tour = signatureTours.find((t: { id: string; priceFrom: number }) => t.id === "arrabida-wine-allinclusive");
    const generic = resolvePerPaxEur(tour!, null);
    expect(generic?.real).toBe(false);
    expect(generic?.eurPerPax).toBe(tour!.priceFrom);
  });

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
