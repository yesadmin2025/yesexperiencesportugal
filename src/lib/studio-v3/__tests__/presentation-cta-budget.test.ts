import { describe, it, expect } from "vitest";
import {
  PRESENTATION_CTA_VIEWPORT_BUDGET,
  measurePresentationCtaBudget,
  viewportsUntil,
} from "../presentation-cta-budget";

describe("viewportsUntil", () => {
  it("returns 0 when the target is already at or above the fold", () => {
    expect(viewportsUntil(0, 588)).toBe(0);
    expect(viewportsUntil(-120, 588)).toBe(0);
  });

  it("rounds half-viewport fragments up so the budget stays honest", () => {
    // 5.1 viewports down at 588px vh → 5.99 → rounds to 6, not 5.
    expect(viewportsUntil(588 * 5.1, 588)).toBe(6);
    // Exactly 3 viewports → 3.
    expect(viewportsUntil(588 * 3, 588)).toBe(3);
    // Just past 3 viewports → 4.
    expect(viewportsUntil(588 * 3 + 1, 588)).toBe(4);
  });

  it("guards against non-finite inputs", () => {
    expect(viewportsUntil(Number.NaN, 588)).toBe(0);
    expect(viewportsUntil(500, 0)).toBe(0);
  });
});

describe("measurePresentationCtaBudget", () => {
  it("adds current scrollY to rect.top and divides by innerHeight", () => {
    const fakeWin = { scrollY: 1000, innerHeight: 588, pageYOffset: 1000 } as Window;
    const fakeEl = {
      getBoundingClientRect: () => ({ top: 176 }) as DOMRect,
    } as unknown as HTMLElement;
    const detail = measurePresentationCtaBudget(fakeEl, fakeWin);
    expect(detail.vh).toBe(588);
    expect(detail.top).toBe(1176);
    // 1176 / 588 = 2 viewports exactly.
    expect(detail.viewports).toBe(2);
  });
});

describe("PRESENTATION_CTA_VIEWPORT_BUDGET", () => {
  it("locks the plan §E target at 6 mobile viewports", () => {
    expect(PRESENTATION_CTA_VIEWPORT_BUDGET).toBe(6);
  });
});
