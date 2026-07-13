import { describe, expect, it } from "vitest";
import { buildManualQuotePreview } from "@/lib/pricing/manualQuotePreview";

describe("buildManualQuotePreview", () => {
  const tiers = { 1: 279, 2: 215, 3: 215, 4: 189, 5: 189, 6: 189, 7: 159, 8: 159 };

  it("matches the server manual quote for two adults and one eight-year-old", () => {
    const quote = buildManualQuotePreview({ adults: 2, minorAges: [8] }, tiers);

    expect(quote).toEqual({
      lines: [
        {
          bokunCategoryId: "manual:adult",
          label: "Adult (18+)",
          minAge: 18,
          maxAge: 99,
          ages: undefined,
          quantity: 2,
          unitEur: 215,
          subtotalEur: 430,
          isFree: undefined,
        },
        {
          bokunCategoryId: "manual:child",
          label: "Child (3–12)",
          minAge: 3,
          maxAge: 12,
          ages: [8],
          quantity: 1,
          unitEur: 107.5,
          subtotalEur: 107.5,
          isFree: undefined,
        },
      ],
      subtotalEur: 537.5,
    });
  });
});