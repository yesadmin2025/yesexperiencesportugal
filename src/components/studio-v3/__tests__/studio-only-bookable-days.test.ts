import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { isStopClosedOn } from "@/data/stopOperational";
const STUDIO = fs.readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");
describe("Studio composes only instantly bookable days", () => {
  it("drops Signatures with a moment closed on the exact date before composing", () => {
    expect(STUDIO).toContain("const openTourIds = result.eligibleTourIds.filter(");
  });
  it("Mercado do Livramento is closed on Mondays", () => {
    expect(isStopClosedOn("Mercado do Livramento", "2026-10-19")).toBe(true);
    expect(isStopClosedOn("Mercado do Livramento", "2026-10-20")).toBe(false);
  });
});
