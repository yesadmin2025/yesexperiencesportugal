import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  normaliseBlackoutDates,
  normaliseWeekdays,
  toggleBlackoutDate,
  toggleOperatingWeekday,
} from "@/lib/admin-availability-calendar";

describe("Admin availability calendar", () => {
  it("builds a 42-cell Monday-first grid", () => {
    const cells = buildMonthGrid(2026, 7); // August 2026
    expect(cells).toHaveLength(42);
    expect(cells[0]?.iso).toBe("2026-07-27"); // Monday
    expect(cells[0]?.weekday).toBe(1);
    expect(cells.some((c) => c.iso === "2026-08-01" && c.inMonth)).toBe(true);
    expect(cells.some((c) => c.iso === "2026-08-31" && c.inMonth)).toBe(true);
  });

  it("toggles blackout dates without duplicates and keeps them sorted", () => {
    expect(toggleBlackoutDate(["2026-08-20"], "2026-08-15")).toEqual([
      "2026-08-15",
      "2026-08-20",
    ]);
    expect(toggleBlackoutDate(["2026-08-20", "2026-08-20"], "2026-08-20")).toEqual([]);
  });

  it("ignores malformed blackout values", () => {
    expect(normaliseBlackoutDates(["2026-08-10", "bad", "2026-8-1"])).toEqual([
      "2026-08-10",
    ]);
  });

  it("normalises and toggles operating weekdays", () => {
    expect(normaliseWeekdays([6, 1, 1, 7, -1, 0])).toEqual([0, 1, 6]);
    expect(toggleOperatingWeekday([0, 1, 2, 3, 4, 5, 6], 1)).toEqual([0, 2, 3, 4, 5, 6]);
    expect(toggleOperatingWeekday([0, 2, 3], 1)).toEqual([0, 1, 2, 3]);
  });
});
