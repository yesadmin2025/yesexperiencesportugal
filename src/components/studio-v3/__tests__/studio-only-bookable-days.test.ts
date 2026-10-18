import { describe, expect, it } from "vitest";
import { isStopClosedOn } from "@/data/stopOperational";
import { admitBookableStudioRoutes } from "../bookableRouteAdmission";
import { INITIAL_STATE } from "../types";
describe("Studio composes only instantly bookable days", () => {
  it("keeps the Arrábida wine day on Monday, leaving the closed market out", () => {
    expect(admitBookableStudioRoutes({ ...INITIAL_STATE, dateExact: "2026-10-26", dateMode: "exact", pickup: "lisbon", feeling: "wine-food", companions: "couple", interests: ["wine", "gastronomy"], rhythm: "full", adults: 2, guests: 2 }, ["arrabida-wine-allinclusive"])).toEqual(["arrabida-wine-allinclusive"]);
  });
  it("Mercado do Livramento is closed on Mondays", () => {
    expect(isStopClosedOn("Mercado do Livramento", "2026-10-19")).toBe(true);
    expect(isStopClosedOn("Mercado do Livramento", "2026-10-20")).toBe(false);
  });
});
