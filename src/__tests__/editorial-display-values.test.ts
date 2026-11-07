import { describe, expect, it } from "vitest";
import { FX_BASE, FX_RATES, FX_UPDATED_AT } from "@/config/fx-rates";
import { formatPrice } from "@/lib/currency";
import { publicSignatureTours } from "@/data/signatureTours";
import { ptSignatureCardTitle } from "@/lib/ptTheme";

describe("owner-authorized indicative currency and PT catalogue overlay", () => {
  it("uses the 6 November ECB USD reference without changing EUR", () => {
    expect(FX_RATES.USD).toBe(1.1165);
    expect(FX_UPDATED_AT).toBe("2026-11-06");
    expect(FX_BASE).toBe("EUR");
    expect(FX_RATES.EUR).toBe(1);
    expect(formatPrice(100, { currency: "USD", round: false })).toBe("$111.65");
    expect(formatPrice(100, { currency: "EUR", round: false })).toBe("€100");
  });

  it("has a localized display name for all twelve public IDs without mutating originals", () => {
    expect(publicSignatureTours).toHaveLength(12);
    const originals = publicSignatureTours.map(tour => tour.title);
    for (const tour of publicSignatureTours) {
      expect(ptSignatureCardTitle(tour.id, tour.title)).not.toBe(tour.title);
    }
    expect(publicSignatureTours.map(tour => tour.title)).toEqual(originals);
  });

  it("falls back to the original English name for unknown or inherited keys", () => {
    expect(ptSignatureCardTitle("unknown", "Original title")).toBe("Original title");
    expect(ptSignatureCardTitle("toString", "Original title")).toBe("Original title");
  });
});