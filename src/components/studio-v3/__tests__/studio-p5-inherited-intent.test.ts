import { describe, expect, it } from "vitest";
import {
  countableInterests,
  deriveInheritedIntent,
  pruneInheritedInterests,
} from "@/components/studio-v3/studioInheritedIntent";
import { INITIAL_STATE, INTERESTS, type Interest, type StudioV3State } from "@/components/studio-v3/types";

function stateWith(patch: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...patch };
}

const ids = (list: ReadonlyArray<{ id: Interest }>) => list.map((o) => o.id);

describe("P5 inherited intent — exact feeling → interest equivalence", () => {
  it("faith feeling hides the faith interest and acknowledges it", () => {
    const inherited = deriveInheritedIntent(stateWith({ feeling: "faith" }));
    expect(inherited.interestIds).toEqual(["faith"]);
    expect(inherited.labels).toEqual(["Faith"]);
    expect(ids(pruneInheritedInterests(INTERESTS, inherited))).not.toContain("faith");
  });

  it("hands-on feeling hides the hands-on interest", () => {
    const inherited = deriveInheritedIntent(stateWith({ feeling: "hands-on" }));
    expect(inherited.interestIds).toEqual(["hands-on"]);
    expect(ids(pruneInheritedInterests(INTERESTS, inherited))).not.toContain("hands-on");
  });

  it("coastal feeling hides the coast interest", () => {
    const inherited = deriveInheritedIntent(stateWith({ feeling: "coastal" }));
    expect(inherited.interestIds).toEqual(["coast"]);
    expect(inherited.labels).toEqual(["Coast"]);
    expect(ids(pruneInheritedInterests(INTERESTS, inherited))).not.toContain("coast");
  });

  it("wine-food feeling hides the wine interest but keeps gastronomy", () => {
    const inherited = deriveInheritedIntent(stateWith({ feeling: "wine-food" }));
    expect(inherited.interestIds).toEqual(["wine"]);
    const remaining = ids(pruneInheritedInterests(INTERESTS, inherited));
    expect(remaining).not.toContain("wine");
    expect(remaining).toContain("gastronomy");
  });

  it("infers nothing for unrelated feelings", () => {
    for (const feeling of ["hidden", "romance", "culture", "adventure", "slow-luxury"] as const) {
      const inherited = deriveInheritedIntent(stateWith({ feeling }));
      expect(inherited.interestIds).toEqual([]);
      expect(inherited.labels).toEqual([]);
      expect(ids(pruneInheritedInterests(INTERESTS, inherited))).toEqual(ids(INTERESTS));
    }
  });

  it("infers nothing with no feeling at all", () => {
    expect(deriveInheritedIntent(INITIAL_STATE).interestIds).toEqual([]);
  });

  it("never inherits from an interest the traveller picked themselves", () => {
    const inherited = deriveInheritedIntent(stateWith({ feeling: "culture", interests: ["coast"] }));
    expect(inherited.interestIds).toEqual([]);
  });
});

describe("P5 inherited intent — cap and state purity", () => {
  it("does not let the inherited theme consume the selection cap", () => {
    const inherited = deriveInheritedIntent(stateWith({ feeling: "coastal" }));
    const selected: Interest[] = ["coast", "nature", "photography", "wellness"];
    expect(countableInterests(selected, inherited)).toEqual([
      "nature",
      "photography",
      "wellness",
    ]);
    expect(countableInterests(selected, inherited).length).toBeLessThan(4);
  });

  it("counts every selection when there is no inheritance", () => {
    const inherited = deriveInheritedIntent(stateWith({ feeling: "culture" }));
    const selected: Interest[] = ["heritage", "local-life"];
    expect(countableInterests(selected, inherited)).toEqual(selected);
  });

  it("never mutates or inserts into state.interests", () => {
    const state = stateWith({ feeling: "faith" });
    const before = [...state.interests];
    deriveInheritedIntent(state);
    pruneInheritedInterests(INTERESTS, deriveInheritedIntent(state));
    countableInterests(state.interests, deriveInheritedIntent(state));
    expect(state.interests).toEqual(before);
    expect(state.interests).not.toContain("faith");
  });

  it("recomputes deterministically when the feeling changes — no stale inheritance", () => {
    const coastal = deriveInheritedIntent(stateWith({ feeling: "coastal", interests: ["coast"] }));
    expect(coastal.interestIds).toEqual(["coast"]);
    const changed = deriveInheritedIntent(stateWith({ feeling: "culture", interests: ["coast"] }));
    expect(changed.interestIds).toEqual([]);
    expect(ids(pruneInheritedInterests(INTERESTS, changed))).toContain("coast");
    expect(countableInterests(["coast"], changed)).toEqual(["coast"]);
  });

  it("is deterministic for identical state", () => {
    const a = deriveInheritedIntent(stateWith({ feeling: "wine-food" }));
    const b = deriveInheritedIntent(stateWith({ feeling: "wine-food" }));
    expect(a).toEqual(b);
  });
});
