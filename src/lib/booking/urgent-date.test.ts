import { describe, expect, it } from "vitest";
import { isWithin48Hours } from "./urgent-date";

const now = new Date(2026, 9, 18, 15, 0);

describe("isWithin48Hours", () => {
  it("today and tomorrow are urgent", () => {
    expect(isWithin48Hours("2026-10-18", now)).toBe(true);
    expect(isWithin48Hours("2026-10-19", now)).toBe(true);
  });
  it("dates three or more days away are not urgent", () => {
    expect(isWithin48Hours("2026-10-21", now)).toBe(false);
    expect(isWithin48Hours("2026-12-26", now)).toBe(false);
  });
  it("empty date is not urgent", () => {
    expect(isWithin48Hours("", now)).toBe(false);
  });
});
