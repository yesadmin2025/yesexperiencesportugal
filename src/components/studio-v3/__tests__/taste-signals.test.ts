/**
 * Taste-signal bridge — V3 → V2 prediction engine.
 *
 * Locks the rules that matter:
 *  1. Interest → priority mappings stay truthful (no invented affinities).
 *  2. Stop-name lookup only carries priorities for real pool stops.
 *  3. moodScoreForPriorities sorts alternatives toward a learned mood.
 */
import { describe, expect, it } from "vitest";
import { prioritiesForInterests, prioritiesForStopName } from "../tasteSignals";
import {
  emptyMoodVector,
  moodScoreForPriorities,
  type MoodVector,
} from "@/lib/studio-v2/predictions";

describe("prioritiesForInterests", () => {
  it("maps wine to the cellar and vineyard-lunch priorities", () => {
    expect(prioritiesForInterests(["wine"])).toEqual(
      expect.arrayContaining(["wine_cellar", "vineyard_lunch"]),
    );
  });

  it("maps coast to coastal scenery and boat", () => {
    expect(prioritiesForInterests(["coast"])).toEqual(
      expect.arrayContaining(["coastal_scenery", "boat"]),
    );
  });

  it("dedupes across interests", () => {
    const out = prioritiesForInterests(["gastronomy", "local-life"]);
    expect(out.filter((p) => p === "local_gastronomy")).toHaveLength(1);
  });

  it("returns nothing for interests with no truthful mapping", () => {
    expect(prioritiesForInterests(["faith", "hands-on", "nature"])).toEqual([]);
  });

  it("ignores unknown interest ids", () => {
    expect(prioritiesForInterests(["not-an-interest"])).toEqual([]);
  });
});

describe("prioritiesForStopName", () => {
  it("returns undefined for a stop that is not in the approved pool", () => {
    expect(prioritiesForStopName("Invented Place That Does Not Exist")).toBeUndefined();
  });

  it("is case-insensitive and trims whitespace", async () => {
    // Any real pool stop resolves the same regardless of casing/space.
    const { REGION_STOP_POOL } = await import("@/data/regionStopPool");
    const first = REGION_STOP_POOL[0]!;
    const a = prioritiesForStopName(first.name);
    const b = prioritiesForStopName(`  ${first.name.toUpperCase()}  `);
    expect(a).toEqual(b);
  });
});

describe("moodScoreForPriorities", () => {
  it("scores zero for missing or empty priorities", () => {
    const mood = emptyMoodVector();
    expect(moodScoreForPriorities(undefined, mood)).toBe(0);
    expect(moodScoreForPriorities([], mood)).toBe(0);
  });

  it("ranks candidates toward the learned mood", () => {
    // A guest who kept coastal moments and removed culture has coastal > culture.
    const mood: MoodVector = {
      ...emptyMoodVector(),
      coastal: 0.8,
      culture: 0.1,
      quiet: 0.5,
    };
    const coastal = moodScoreForPriorities(["coastal_scenery"], mood);
    const culture = moodScoreForPriorities(["heritage"], mood);
    expect(coastal).toBeGreaterThan(culture);
  });

  it("drives a stable sort that floats best-fit alternatives first", () => {
    const mood: MoodVector = { ...emptyMoodVector(), food: 0.9, social: 0.6 };
    const pool = [
      { label: "Stone village", priorities: ["heritage" as const] },
      { label: "Long table lunch", priorities: ["local_gastronomy" as const] },
      { label: "Untagged moment", priorities: undefined },
    ];
    const sorted = [...pool].sort(
      (a, b) =>
        moodScoreForPriorities(b.priorities, mood) - moodScoreForPriorities(a.priorities, mood),
    );
    expect(sorted[0]!.label).toBe("Long table lunch");
  });
});
