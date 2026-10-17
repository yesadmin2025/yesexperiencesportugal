import { describe, expect, it } from "vitest";
import { nextOpenDatesForDay } from "@/lib/studio-v3/nextOpenDates";

const now = new Date("2026-10-17T10:00:00");

describe("nextOpenDatesForDay", () => {
  it("skips Mondays when the day includes Mercado do Livramento", () => {
    // 2026-10-18 is a Sunday → next dates Tue 20 (Mon 19 skipped)
    const dates = nextOpenDatesForDay("2026-10-25", ["Mercado do Livramento"], 3, now);
    expect(dates).toEqual(["2026-10-27", "2026-10-28", "2026-10-29"]);
  });

  it("never suggests a date inside the 3-day lead time", () => {
    const dates = nextOpenDatesForDay("2026-10-17", ["Winery"], 1, now);
    expect(dates).toEqual(["2026-10-20"]);
  });
});
