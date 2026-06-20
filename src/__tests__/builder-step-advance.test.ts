/**
 * Smoke test — guardrails for the builder step-advance contract.
 *
 * The builder stores its step + selections in the URL search params so that:
 *   1. Clicking "Start building" on the entry screen advances the URL to step 1.
 *   2. Selecting a mood advances the URL to step 2 and persists the choice.
 *   3. Subsequent step transitions preserve all earlier selections.
 *   4. Garbage / hostile values are rejected by the validator (no broken UI).
 *
 * If any of these regress, the user gets stuck on the entry screen or loses
 * their answers when they go back. Covered by these assertions.
 */
import { describe, expect, it } from "vitest";
import { advanceBuilderSearch, parseBuilderSearch } from "@/components/builder/searchParams";

describe("builder search-param contract", () => {
  it("defaults to step 0 (entry) when no search params are present", () => {
    const parsed = parseBuilderSearch({});
    expect(parsed.step).toBe(0);
    expect(parsed.mood).toBeUndefined();
  });

  it("rejects out-of-range steps", () => {
    expect(parseBuilderSearch({ step: "99" }).step).toBe(0);
    expect(parseBuilderSearch({ step: "abc" }).step).toBe(0);
    expect(parseBuilderSearch({ step: "-1" }).step).toBe(0);
  });

  it("accepts valid steps", () => {
    for (const s of [0, 1, 2, 3, 4, 5, 6, 7]) {
      expect(parseBuilderSearch({ step: String(s) }).step).toBe(s);
    }
  });

  it("rejects unknown mood/who/intention/pace values", () => {
    const parsed = parseBuilderSearch({
      step: "1",
      mood: "supernova",
      who: "alien",
      intention: "rocket",
      pace: "warp",
    });
    expect(parsed.mood).toBeUndefined();
    expect(parsed.who).toBeUndefined();
    expect(parsed.intention).toBeUndefined();
    expect(parsed.pace).toBeUndefined();
  });

  it("preserves valid selections", () => {
    const parsed = parseBuilderSearch({
      step: "4",
      mood: "slow",
      who: "couple",
      intention: "wine",
      pace: "balanced",
    });
    expect(parsed).toEqual({
      step: 4,
      mood: "slow",
      who: "couple",
      intention: "wine",
      pace: "balanced",
      status: undefined,
    });
  });
});

describe("builder step-advance reducer", () => {
  it("advances from entry (step 0) to step 1 on Start building", () => {
    const initial = parseBuilderSearch({});
    const next = advanceBuilderSearch(initial, { step: 1 });
    expect(next.step).toBe(1);
  });

  it("advances mood selection to step 2 and persists the mood", () => {
    const initial = parseBuilderSearch({ step: "1" });
    const next = advanceBuilderSearch(initial, { step: 2, mood: "curious" });
    expect(next.step).toBe(2);
    expect(next.mood).toBe("curious");
  });

  it("preserves earlier selections when advancing through later steps", () => {
    let s = advanceBuilderSearch(parseBuilderSearch({}), { step: 1 });
    s = advanceBuilderSearch(s, { step: 2, mood: "romantic" });
    s = advanceBuilderSearch(s, { step: 3, who: "couple" });
    s = advanceBuilderSearch(s, { step: 4, intention: "wine" });
    s = advanceBuilderSearch(s, { step: 5, pace: "relaxed" });

    expect(s).toEqual({
      step: 5,
      mood: "romantic",
      who: "couple",
      intention: "wine",
      pace: "relaxed",
      status: undefined,
    });
  });

  it("survives a hostile URL round-trip without losing real selections", () => {
    // Simulate user landing on step 2 with mood + an injected garbage param
    const parsed = parseBuilderSearch({
      step: "2",
      mood: "open",
      who: "<script>",
      intention: "drop table",
    });
    expect(parsed.step).toBe(2);
    expect(parsed.mood).toBe("open");
    expect(parsed.who).toBeUndefined();
    expect(parsed.intention).toBeUndefined();
  });
});
