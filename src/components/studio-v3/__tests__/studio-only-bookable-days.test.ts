import { describe, expect, it } from "vitest";
import { isStopClosedOn } from "@/data/stopOperational";
import { admitBookableStudioRoutes } from "../bookableRouteAdmission";
import { INITIAL_STATE } from "../types";
describe("Studio composes only instantly bookable days", () => {
  it("drops Signatures with a moment closed on the exact date before composing", () => {
    expect(admitBookableStudioRoutes({ ...INITIAL_STATE, dateExact: "2026-10-26", pickup: "lisbon", feeling: "wine-food", interests: ["wine"], rhythm: "full" }, ["arrabida-wine-allinclusive"])).toEqual(["arrabida-wine-allinclusive"]);
  });
  it("Mercado do Livramento is closed on Mondays", () => {
    expect(isStopClosedOn("Mercado do Livramento", "2026-10-19")).toBe(true);
    expect(isStopClosedOn("Mercado do Livramento", "2026-10-20")).toBe(false);
  });
});
