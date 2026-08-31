import { describe, expect, it } from "vitest";

import {
  freeTextExclusionKeys,
  interpretFreeText,
  mergeInterpreterOverlay,
  normalizeFreeText,
} from "@/lib/studio-v3/freeTextInterpreter";

describe("free-text interpreter — deterministic negation", () => {
  it("'food but not wine' keeps gastronomy and EXCLUDES wine", () => {
    const result = interpretFreeText("food but not wine");
    const keys = result.effects.map((e) => `${e.domain}:${e.value}:${e.polarity}`);
    expect(keys).toContain("interest:gastronomy:positive");
    expect(keys).toContain("interest:wine:negative");
    expect(keys).not.toContain("interest:wine:positive");
    expect(freeTextExclusionKeys(result)).toContain("interest:wine");
    // Only `rejection` carries exclusion authority in the semantic model.
    expect(result.effects.find((e) => e.value === "wine")?.provenance).toBe("rejection");
  });

  it("'coast, but I hate boats' never infers a positive water discovery", () => {
    const result = interpretFreeText("coast, but I hate boats");
    const positives = result.effects.filter((e) => e.polarity === "positive");
    expect(positives.map((e) => e.value)).toContain("coast");
    expect(result.excludedOptionIds).toContain("coast-from-the-water");
  });

  it("reads 'I don't care about museums, I love seeing how people still make things'", () => {
    const result = interpretFreeText(
      "I don't care about museums, I love seeing how people still make things",
    );
    const keys = result.effects.map((e) => `${e.domain}:${e.value}:${e.polarity}`);
    expect(keys).toContain("interest:heritage:negative");
    expect(keys).toContain("interest:hands-on:positive");
  });

  it("equivalent normalized wording gives identical structured effects", () => {
    const a = interpretFreeText("Food but not wine!");
    const b = interpretFreeText("  food,  but   NOT wine ");
    expect(normalizeFreeText("Food but not wine!")).toBe("food but not wine");
    expect(a.effects).toEqual(b.effects);
    expect(a.excludedOptionIds).toEqual(b.excludedOptionIds);
  });

  it("empty or unrepresentable text produces no effects at all", () => {
    expect(interpretFreeText("").empty).toBe(true);
    expect(interpretFreeText("   ").empty).toBe(true);
    expect(interpretFreeText("we land at 3pm on tuesday").effects).toEqual([]);
  });
});

describe("free-text interpreter — optional AI overlay is additive only", () => {
  it("cannot weaken or invert an explicit exclusion", () => {
    const deterministic = interpretFreeText("food but not wine");
    const merged = mergeInterpreterOverlay(deterministic, [
      { domain: "interest", value: "wine", polarity: "positive", provenance: "ai-interpretation", confidence: 0.9 },
      { domain: "interest", value: "coast", polarity: "negative", provenance: "ai-interpretation", confidence: 0.9 },
      { domain: "interest", value: "local-life", polarity: "positive", provenance: "ai-interpretation", confidence: 0.6 },
    ]);
    const wine = merged.effects.filter((e) => e.value === "wine");
    expect(wine).toHaveLength(1);
    expect(wine[0].polarity).toBe("negative");
    // AI may never exclude anything.
    expect(merged.effects.some((e) => e.value === "coast" && e.polarity === "negative")).toBe(false);
    // Additive inside the closed vocabulary is allowed, at AI authority.
    const local = merged.effects.find((e) => e.value === "local-life");
    expect(local?.provenance).toBe("ai-interpretation");
  });

  it("drops candidates outside the closed vocabulary", () => {
    const deterministic = interpretFreeText("coast");
    const merged = mergeInterpreterOverlay(deterministic, [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { domain: "interest", value: "helicopter-tour", polarity: "positive", provenance: "ai-interpretation", confidence: 1 } as any,
    ]);
    expect(merged.effects).toEqual(deterministic.effects);
  });
});
