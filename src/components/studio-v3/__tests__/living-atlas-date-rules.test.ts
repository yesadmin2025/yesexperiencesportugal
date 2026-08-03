import { describe, expect, it } from "vitest";

import {
  addCalendarDaysIso,
  isMercadoDoLivramentoOpenOn,
  isStudioBookingDateAllowed,
  minimumStudioBookingDateIso,
} from "../dateGuards";

describe("Living Atlas date rules", () => {
  it("opens the Studio calendar three Lisbon calendar days ahead", () => {
    const now = new Date("2026-08-03T04:12:00.000Z");
    expect(minimumStudioBookingDateIso(now)).toBe("2026-08-06");
    expect(isStudioBookingDateAllowed("2026-08-05", now)).toBe(false);
    expect(isStudioBookingDateAllowed("2026-08-06", now)).toBe(true);
  });

  it("adds calendar days across month and year boundaries", () => {
    expect(addCalendarDaysIso("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("keeps Mercado do Livramento out of Monday itineraries", () => {
    expect(isMercadoDoLivramentoOpenOn("2026-08-03")).toBe(false);
    expect(isMercadoDoLivramentoOpenOn("2026-08-04")).toBe(true);
  });
});
