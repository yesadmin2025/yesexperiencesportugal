import { describe, expect, it } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { regionFromPriceEur, studioFromPriceEur } from "../regionFromPrice";

describe("regionFromPriceEur", () => {
  it("uses the lowest public From price of the region's Signature days", () => {
    const ids = ["arrabida-wine-allinclusive", "arrabida-boat", "wild-beaches-picnic", "tiles-workshop", "azeitao-cheese"];
    const expected = Math.min(...signatureTours.filter((t) => ids.includes(t.id)).map((t) => t.priceFrom));
    expect(regionFromPriceEur("arrabida-setubal-azeitao")).toBe(expected);
  });
  it("shows no price when the choice has no Signature region", () => {
    expect(regionFromPriceEur("no-preference")).toBeNull();
  });
});

describe("studioFromPriceEur", () => {
  it("equals the lowest public Signature From price", () => {
    expect(studioFromPriceEur()).toBe(Math.min(...signatureTours.map((t) => t.priceFrom)));
  });
});
