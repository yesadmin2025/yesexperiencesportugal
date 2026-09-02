/**
 * P0-C — the central meal / daypart authority.
 *
 * A verified table belongs around the believable middle of the day: after the
 * morning segment, before the afternoon, and never as the closing moment.
 * The rule reorders only — it never adds, removes or re-times a moment, and it
 * knows nothing about markets (the Mercado morning rule lives elsewhere).
 */
import { describe, expect, it } from "vitest";

import { middayInsertIndex, scheduleMealAtMidday } from "@/lib/studio-v3/mealDaypartAuthority";

type M = { id: string; min: number; meal?: boolean };

const opts = {
  isMeal: (m: M) => m.meal === true,
  minutesOf: (m: M) => m.min,
};

const ids = (list: readonly M[]) => list.map((m) => m.id);

describe("middayInsertIndex", () => {
  it("lands at the cumulative-time midpoint", () => {
    expect(middayInsertIndex([60, 60, 60, 60])).toBe(2);
  });

  it("never returns the final slot", () => {
    expect(middayInsertIndex([10, 10, 600])).toBeLessThanOrEqual(2);
    expect(middayInsertIndex([600, 10, 10])).toBeGreaterThanOrEqual(1);
  });
});

describe("scheduleMealAtMidday", () => {
  it("moves a trailing table into the middle of the day", () => {
    const day: M[] = [
      { id: "viewpoint", min: 60 },
      { id: "beach", min: 90 },
      { id: "village", min: 60 },
      { id: "table", min: 90, meal: true },
    ];
    const out = scheduleMealAtMidday(day, opts);
    expect(out).toHaveLength(4);
    expect(ids(out).at(-1)).not.toBe("table");
    expect(ids(out).indexOf("table")).toBeGreaterThan(0);
  });

  it("moves an opening table out of the first slot", () => {
    const day: M[] = [
      { id: "table", min: 90, meal: true },
      { id: "viewpoint", min: 60 },
      { id: "beach", min: 90 },
      { id: "village", min: 60 },
    ];
    expect(ids(scheduleMealAtMidday(day, opts))[0]).not.toBe("table");
  });

  it("never adds, removes or re-times a moment", () => {
    const day: M[] = [
      { id: "a", min: 60 },
      { id: "b", min: 45 },
      { id: "table", min: 90, meal: true },
      { id: "c", min: 60 },
      { id: "d", min: 30 },
    ];
    const out = scheduleMealAtMidday(day, opts);
    expect([...ids(out)].sort()).toEqual([...ids(day)].sort());
    for (const m of day) expect(out.find((o) => o.id === m.id)!.min).toBe(m.min);
  });

  it("leaves days without a verified meal untouched", () => {
    const day: M[] = [
      { id: "a", min: 60 },
      { id: "b", min: 60 },
      { id: "c", min: 60 },
    ];
    expect(ids(scheduleMealAtMidday(day, opts))).toEqual(["a", "b", "c"]);
  });

  it("leaves very short days untouched", () => {
    const day: M[] = [{ id: "table", min: 90, meal: true }, { id: "a", min: 60 }];
    expect(ids(scheduleMealAtMidday(day, opts))).toEqual(["table", "a"]);
  });

  it("does not treat a market as a meal", () => {
    const day: M[] = [
      { id: "market", min: 60 },
      { id: "a", min: 60 },
      { id: "b", min: 60 },
    ];
    expect(ids(scheduleMealAtMidday(day, opts))).toEqual(["market", "a", "b"]);
  });
});
