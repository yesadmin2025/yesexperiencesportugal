/**
 * E2E-style stability test — repeated itinerary edits must NOT jump to
 * `arrabida-wine-allinclusive` unless the traveller explicitly picked a
 * wine-led feeling or wine as their top interest.
 *
 * We simulate the "user keeps editing their interests" flow by calling
 * `pickPrimaryTour` many times per feeling, once per permutation of the
 * remaining interests. For every non-wine intent:
 *   - the resolved tour is stable across identical inputs (determinism)
 *   - `arrabida-wine-allinclusive` never appears in the result
 *
 * This locks the fix for the earlier bug where every path collapsed to
 * the wine day regardless of destination.
 */

import { describe, it, expect } from "vitest";
import { pickPrimaryTour } from "@/components/studio-v3/curation";

type Feeling =
  | "coastal"
  | "wine-food"
  | "hidden"
  | "romance"
  | "culture"
  | "adventure"
  | "slow-luxury";
type Interest =
  | "wine"
  | "gastronomy"
  | "heritage"
  | "coast"
  | "local-life"
  | "nature"
  | "art"
  | "family";

const NON_WINE_INTERESTS: Interest[] = [
  "gastronomy",
  "heritage",
  "coast",
  "local-life",
  "nature",
  "art",
  "family",
];

const NON_WINE_FEELINGS: Feeling[] = [
  "coastal",
  "hidden",
  "romance",
  "culture",
  "adventure",
  "slow-luxury",
];

function pairs<T>(xs: T[]): Array<[T, T]> {
  const out: Array<[T, T]> = [];
  for (let i = 0; i < xs.length; i++) {
    for (let j = 0; j < xs.length; j++) {
      if (i !== j) out.push([xs[i], xs[j]]);
    }
  }
  return out;
}

describe("Studio — itinerary edit stability", () => {
  it("repeated edits of the same non-wine intent stay on the same signature", () => {
    for (const feeling of NON_WINE_FEELINGS) {
      const primary: Interest =
        feeling === "coastal" || feeling === "hidden" || feeling === "adventure"
          ? "coast"
          : "heritage";
      // Fire the same pick 20 times — result must be deterministic and
      // never wine.
      const runs = Array.from({ length: 20 }, () =>
        pickPrimaryTour(feeling, "couple", [primary], null, null, 0).tour.id,
      );
      const unique = new Set(runs);
      expect(unique.size, `feeling=${feeling} not deterministic`).toBe(1);
      expect(runs[0]).not.toBe("arrabida-wine-allinclusive");
    }
  });

  it("editing a secondary interest never flips a non-wine day to Arrábida wines", () => {
    for (const feeling of NON_WINE_FEELINGS) {
      for (const [primary, secondary] of pairs(NON_WINE_INTERESTS)) {
        const first = pickPrimaryTour(feeling, "couple", [primary], null, null, 0).tour.id;
        const afterEdit = pickPrimaryTour(
          feeling,
          "couple",
          [primary, secondary],
          null,
          null,
          0,
        ).tour.id;
        expect(
          first,
          `feeling=${feeling} interest=${primary} unexpectedly resolved to wine`,
        ).not.toBe("arrabida-wine-allinclusive");
        expect(
          afterEdit,
          `feeling=${feeling} interests=[${primary},${secondary}] jumped to wine after edit`,
        ).not.toBe("arrabida-wine-allinclusive");
      }
    }
  });

  it("wine-food + wine still returns the wine day (positive path)", () => {
    const t = pickPrimaryTour("wine-food", "couple", ["wine"], null, null, 0).tour.id;
    // Any of the wine-forward tours is acceptable — Arrábida-wine included.
    expect(t).toMatch(/wine|arrabida-wine/);
  });
});
