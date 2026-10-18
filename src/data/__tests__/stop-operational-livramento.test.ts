import { describe, expect, it } from "vitest";
import { isStopClosedOn } from "../stopOperational";

describe("Livramento market closes on Mondays", () => {
  it("matches both catalogue spellings on a Monday", () => {
    expect(isStopClosedOn("Mercado do Livramento", "2026-10-26")).toBe(true);
    expect(isStopClosedOn("Livramento Market", "2026-10-26")).toBe(true);
  });
  it("is open on a Tuesday", () => {
    expect(isStopClosedOn("Livramento Market", "2026-10-27")).toBe(false);
  });
});
