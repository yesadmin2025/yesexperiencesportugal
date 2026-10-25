import { describe, expect, it } from "vitest";
import { dedupePublicSwapPool } from "../studioWineryPresentation";

describe("dedupePublicSwapPool", () => {
  it("drops an alternative with the same visible name as a moment in the day", () => {
    const out = dedupePublicSwapPool(["A local winery"], [
      { label: "A local winery" },
      { label: "Castelo de Sesimbra" },
    ]);
    expect(out.map((c) => c.label)).toEqual(["Castelo de Sesimbra"]);
  });

  it("treats accent-only spelling differences as the same name", () => {
    const out = dedupePublicSwapPool([], [
      { label: "Azulejos de Azeitao" },
      { label: "Azulejos de Azeitão" },
    ]);
    expect(out).toHaveLength(1);
  });
});
