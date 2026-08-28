import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePerPaxEur, hasApprovedTier } from "@/data/signatureTourPricing";
import { signatureTours } from "@/data/signatureTours";
import { VIATOR_META } from "@/data/signatureToursViator";
import { tailorRules } from "@/data/tailorRules";
import { TAILOR_BLUEPRINTS } from "@/data/tailorBlueprints";

/** A tour that has an approved solo (tier 1) price in code metadata. */
const withTier1 = signatureTours.find((t: { id: string }) => VIATOR_META[t.id]?.priceTiersEUR?.[1] != null)!;
/** A tour that has NO approved solo price. */
const withoutTier1 = signatureTours.find(
  (t: { id: string }) => VIATOR_META[t.id]?.priceTiersEUR != null && VIATOR_META[t.id]?.priceTiersEUR?.[1] == null,
)!;

describe("exact-tier parity — client resolver", () => {
  it('resolves a generic anchor (never null) when guest count is unknown', () => {
    const r = resolvePerPaxEur(withoutTier1, null);
    expect(r).not.toBeNull();
    expect(r!.tier).toBe(8);
    expect(hasApprovedTier(withoutTier1, null)).toBe(true);
  });

  it("returns the exact approved tier when the party size is published", () => {
    const r = resolvePerPaxEur(withTier1, 1);
    expect(r).not.toBeNull();
    expect(r!.real).toBe(true);
    expect(r!.eurPerPax).toBe(VIATOR_META[withTier1.id]!.priceTiersEUR![1]);
  });

  it("returns null (never priceFrom) for a known party size with no approved tier", () => {
    expect(resolvePerPaxEur(withoutTier1, 1)).toBeNull();
    expect(hasApprovedTier(withoutTier1, 1)).toBe(false);
  });

  it("never reuses a neighbouring tier for a missing exact tier", () => {
    const tiers = VIATOR_META[withoutTier1.id]!.priceTiersEUR!;
    const r = resolvePerPaxEur(withoutTier1, 1);
    expect(r?.eurPerPax).not.toBe(tiers[2]);
    expect(r?.eurPerPax).not.toBe(tiers[8]);
  });

  it("still resolves the approved 8+ anchor tier", () => {
    const r = resolvePerPaxEur(withoutTier1, 9);
    expect(r).not.toBeNull();
    expect(r!.tier).toBe(8);
  });

  it("accepts a runtime override that supplies the missing exact tier", () => {
    const r = resolvePerPaxEur(withoutTier1, 1, { [withoutTier1.id]: { 1: 999 } });
    expect(r?.eurPerPax).toBe(999);
    expect(r?.real).toBe(true);
  });
});

const src = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("exact-tier parity — UI/checkout gating", () => {
  it("Studio checkout refuses to fall back to the 'from' anchor", () => {
    const s = src("src/components/studio-v3/StudioV3.tsx");
    expect(s).not.toMatch(/eurPerPax \?\? tour\.priceFrom/);
    expect(s).toMatch(/if \(!resolvedPerPax\)/);
  });

  it("useResolvedJourney keeps a null base when the exact tier is missing", () => {
    const s = src("src/components/studio-v3/useResolvedJourney.ts");
    expect(s).not.toMatch(/eurPerPax \?\? tour\.priceFrom/);
  });

  it("SignaturePriceCard hides the price and offers a curator path", () => {
    const s = src("src/components/studio-v3/SignaturePriceCard.tsx");
    expect(s).toMatch(/const tierUnavailable =/);
    expect(s).toMatch(/hasPrice = priceEur != null && !tierUnavailable/);
    expect(s).toMatch(/studio-v3-price-unavailable/);
  });

  it("Tailor blocks reserve when the exact tier is unavailable", () => {
    const s = src("src/routes/tours_.$tourId.tailor.tsx");
    expect(s).toMatch(/if \(tierUnavailable\)/);
  });
});

describe("winery quantity stays inside the authorized ladder", () => {
  it("only Arrábida Wine has an approved winery supplement ladder", () => {
    const authorized = Object.keys(TAILOR_BLUEPRINTS).filter((id) => tailorRules(id).wineries);
    expect(authorized).toEqual(["arrabida-wine-allinclusive"]);
  });

  it("Arrábida keeps 2 included, +€20 pp extras up to 4", () => {
    const w = tailorRules("arrabida-wine-allinclusive").wineries!;
    expect(w.included).toBe(2);
    expect(w.supplementEur).toBe(20);
    expect(w.max).toBe(4);
  });

  it("unauthorized winery pools are swap-only at the blueprint baseline", () => {
    const s = src("src/routes/tours_.$tourId.tailor.tsx");
    // Only an owner-approved supplement ladder may expose a count control.
    expect(s).toMatch(/canAdjustWineryCount = Boolean\(rules\.wineries\)/);
    // The state guard still refuses an unpriced extra winery.
    expect(s).toMatch(/option0\?\.category === "winery" &&\s*!rules\.wineries/);
  });

  it("public Tailor never names a winery estate", () => {
    const s = src("src/routes/tours_.$tourId.tailor.tsx");
    expect(s).toMatch(/const wineryLabel = \(index: number\) => `Winery visit \$\{index\}`/);
    // Winery options are never rendered by their operational estate label.
    expect(s).toMatch(/\.filter\(\(o\) => o\.category !== "winery"\)/);
  });


  it("priced extra wineries are not pushed to manual confirmation", () => {
    const s = src("src/routes/tours_.$tourId.tailor.tsx");
    expect(s).toMatch(/wineExtension\.extra > 0 && !rules\.wineries/);
  });
});
