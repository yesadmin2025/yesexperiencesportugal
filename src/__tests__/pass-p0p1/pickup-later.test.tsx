import { describe, it, expect } from "vitest";
import { PICKUP_TO_BE_CONFIRMED, isPickupToBeConfirmed } from "@/components/checkout/PickupLaterToggle";

describe("pickup later", () => {
  it("is an explicit operational value, never an address", () => {
    expect(PICKUP_TO_BE_CONFIRMED).toMatch(/^To be confirmed/);
    expect(isPickupToBeConfirmed(PICKUP_TO_BE_CONFIRMED)).toBe(true);
    expect(isPickupToBeConfirmed("Hotel Avenida")).toBe(false);
    expect(isPickupToBeConfirmed("")).toBe(false);
  });
});
