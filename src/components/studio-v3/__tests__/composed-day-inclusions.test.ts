import { describe, expect, it } from "vitest";
import { composedDayInclusions } from "../composedDayInclusions";

const verified = [
  "Private transportation",
  "Private Local Guide",
  "Cork Workshop",
  "Pottery Workshop",
  "Wine tasting",
  "Lunch",
];

describe("composedDayInclusions", () => {
  it("drops place-specific items whose stop is not in the composed day", () => {
    const out = composedDayInclusions({ verified, stopLabels: ["Cork workshop in Azeitão", "Sesimbra"] });
    expect(out).toContain("Cork Workshop");
    expect(out).not.toContain("Pottery Workshop");
    expect(out).not.toContain("Wine tasting");
  });

  it("keeps general services and wine tasting when a winery stays", () => {
    const out = composedDayInclusions({ verified, stopLabels: ["Family winery in Azeitão"] });
    expect(out).toEqual(["Private transportation", "Private Local Guide", "Wine tasting", "Lunch"]);
  });

  it("never adds items absent from the verified list", () => {
    const out = composedDayInclusions({ verified: ["Lunch"], stopLabels: ["Pottery studio"] });
    expect(out).toEqual(["Lunch"]);
  });
});
