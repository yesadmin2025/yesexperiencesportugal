import { describe, expect, it } from "vitest";
import { signatureTours } from "@/data/signatureTours";
import { admitBookableStudioRoutes } from "../bookableRouteAdmission";
import type { StudioV3State } from "../types";
import { INITIAL_STATE } from "../types";

const mondayWine: StudioV3State = {
  ...INITIAL_STATE,
  feeling: "wine-food",
  companions: "couple",
  interests: ["wine", "gastronomy"],
  rhythm: "full",
  dateExact: "2026-10-26",
  dateMode: "exact",
  pickup: "lisbon",
  adults: 2,
  guests: 2,
};

describe("Monday wine route admission", () => {
  it("keeps the Arrábida wine day on Monday without the closed market", () => {
    expect(admitBookableStudioRoutes(mondayWine, ["arrabida-wine-allinclusive"])).toEqual(["arrabida-wine-allinclusive"]);
  });
  it("never admits the full Alentejo alternative that exceeds the unchanged timing gates", () => {
    expect(admitBookableStudioRoutes(mondayWine, ["alentejo-wine"])).toEqual([]);
  });
  it("keeps a certified alternative and never widens an empty candidate set", () => {
    const admitted = admitBookableStudioRoutes(mondayWine, signatureTours.map((tour) => tour.id));
    expect(admitted).toContain("troia-comporta");
    expect(admitBookableStudioRoutes(mondayWine, [])).toEqual([]);
  });
});