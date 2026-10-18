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
    expect(out).toEqual(["Private transportation", "Private Local Guide", "Wine tasting"]);
  });

  it("never adds items absent from the verified list", () => {
    const out = composedDayInclusions({ verified: ["Lunch"], stopLabels: ["Pottery studio"] });
    expect(out).toEqual([]);
  });

  it("keeps verified lunch only when lunch remains in the day", () => {
    expect(composedDayInclusions({ verified: ["Lunch"], stopLabels: ["Lunch"] })).toEqual(["Lunch"]);
    expect(composedDayInclusions({ verified: ["Lunch"], stopLabels: ["Sesimbra"] })).toEqual([]);
  });

  it("removes named admission and private workshops when their stops are removed", () => {
    expect(composedDayInclusions({ verified: ["Admission to Pena Palace", "Private pottery workshop", "Private transportation"], stopLabels: ["Cascais"] })).toEqual(["Private transportation"]);
  });

  it("does not retain the closed Livramento market on Monday", () => {
    expect(composedDayInclusions({ verified: ["Livramento Market", "Private transportation"], stopLabels: ["Livramento Market", "Sesimbra"], dates: ["2026-10-26"] })).toEqual(["Private transportation"]);
  });

  it("does not confuse village lunch with its tile factory or cheese tasting with wine", () => {
    expect(composedDayInclusions({ verified: ["Azeitão tile factory", "Cheese tasting", "Wine tastings", "Lunch"], stopLabels: ["Long lunch in Azeitão", "Local winery"] })).toEqual(["Wine tastings", "Lunch"]);
  });

  it("does not promise two selected winery visits when only one remains", () => {
    const item = "Two selected winery visits and tastings";
    expect(composedDayInclusions({ verified: [item], stopLabels: ["José Maria da Fonseca winery"] })).toEqual([]);
    expect(composedDayInclusions({ verified: [item], stopLabels: ["José Maria da Fonseca winery", "Bacalhôa winery"] })).toEqual([item]);
  });

  it("does not retain a named winery tasting at another winery", () => {
    expect(composedDayInclusions({ verified: ["Wine tasting at José Maria da Fonseca"], stopLabels: ["Bacalhôa winery"] })).toEqual([]);
  });

  it("does not retain a winery lunch for unrelated town lunch time", () => {
    expect(composedDayInclusions({ verified: ["Traditional Alentejo lunch at the winery"], stopLabels: ["Long lunch in Azeitão", "Local winery"] })).toEqual([]);
  });
});
