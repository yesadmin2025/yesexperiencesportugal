import { describe, expect, it } from "vitest";
import { visitProductPath } from "../visit-product-path";

describe("visit product paths", () => {
  it.each([
    ["/tours/arrabida-wine-allinclusive", "signature"],
    ["/tours/arrabida-wine-allinclusive/tailor", "tailor"],
    ["/studio", "studio"],
    ["/experiences", "signature"],
    ["/tours/arrabida-wine-allinclusive/?utm_source=test", "signature"],
    ["/tours/arrabida-wine-allinclusive/tailor/#details", "tailor"],
    ["/portugal-travel-designer", "travel_designer"],
    ["/proposal-in-portugal", "moments"],
    ["/moments", "moments"],
    ["/corporate", "corporate"],
    ["/signature", "signature"],
    ["/legacy-tailor", "studio"],
    ["/about", null],
    ["/tours", null],
  ])("%s → %s", (path, expected) => {
    expect(visitProductPath(path)).toBe(expected);
  });
});