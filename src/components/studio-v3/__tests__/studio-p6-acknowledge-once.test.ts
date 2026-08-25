import { describe, expect, it } from "vitest";

import {
  ACKNOWLEDGEMENT_SURFACE_ORDER,
  acknowledgementSignalsFor,
  acknowledgementSummaryFor,
  filterRevealSignals,
  interestsAcknowledgedThemes,
  themeOfSignal,
  themesAcknowledgedBefore,
  type AcknowledgementContext,
} from "../studioAcknowledgement";
import { understoodSignals } from "../studioSemanticMemory";
import { deriveInheritedIntent } from "../studioInheritedIntent";
import type { Feeling, Interest, Rhythm } from "../types";

function mem(c: AcknowledgementContext) {
  return {
    feeling: c.state.feeling ?? null,
    interests: [...(c.state.interests ?? [])],
    rhythm: c.state.rhythm ?? null,
  };
}

function ctx(
  feeling: Feeling | null,
  interests: Interest[],
  rhythm: Rhythm | null,
  refinementShown = false,
): AcknowledgementContext {
  return { state: { feeling, interests, rhythm }, refinementShown };
}

describe("P6 — acknowledge once: no signal is heard twice", () => {
  it("suppresses on refinement whatever the Interests row already showed", () => {
    const c = ctx("coastal", [], null);
    expect(interestsAcknowledgedThemes(c.state)).toEqual(["theme.coast"]);
    expect(understoodSignals(mem(c))).toContain("Coast first");
    expect(acknowledgementSignalsFor("refinement", c)).not.toContain("Coast first");
  });

  it("renders nothing when every signal was already acknowledged", () => {
    const c = ctx("wine-food", [], null);
    expect(understoodSignals(mem(c))).toEqual(["Wine and table"]);
    expect(acknowledgementSignalsFor("refinement", c)).toEqual([]);
    expect(acknowledgementSummaryFor("refinement", c)).toBeNull();
    expect(acknowledgementSummaryFor("logistics", c)).toBeNull();
  });

  it("still shows a signal that Interests could not inherit", () => {
    const c = ctx("coastal", [], "balanced");
    const shown = acknowledgementSignalsFor("refinement", c);
    expect(shown).toEqual(["balanced rhythm"]);
    expect(acknowledgementSummaryFor("refinement", c)?.detail).toBe("balanced rhythm");
  });

  it("does not repeat on Logistics what the refinement screen just said", () => {
    const withRefinement = ctx("coastal", [], "slow", true);
    expect(acknowledgementSignalsFor("refinement", withRefinement)).toEqual(["slow rhythm"]);
    expect(acknowledgementSignalsFor("logistics", withRefinement)).toEqual([]);

    // Without the refinement screen, Logistics is the first surface that can
    // carry it — silence there would lose the acknowledgement entirely.
    const withoutRefinement = ctx("coastal", [], "slow", false);
    expect(acknowledgementSignalsFor("logistics", withoutRefinement)).toEqual(["slow rhythm"]);
  });

  it("shows each signal exactly once across the whole flow", () => {
    const cases: AcknowledgementContext[] = [
      ctx("coastal", ["photography"], "balanced", true),
      ctx("wine-food", ["local-life"], "full", true),
      ctx("faith", [], "slow", false),
      ctx("hands-on", ["coast"], "immersive", true),
      ctx("culture", ["heritage"], "balanced", false),
    ];

    for (const c of cases) {
      const seen = [
        ...interestsAcknowledgedThemes(c.state).map((t) => `theme:${t}`),
        ...(c.refinementShown ? acknowledgementSignalsFor("refinement", c) : []),
        ...acknowledgementSignalsFor("logistics", c),
      ];
      const themes = seen.map((s) =>
        s.startsWith("theme:") ? s.slice(6) : (themeOfSignal(s) ?? s),
      );
      expect(new Set(themes).size).toBe(themes.length);
    }
  });

  it("never loses the only acknowledgement a traveller has", () => {
    const cases: AcknowledgementContext[] = [
      ctx("culture", [], "balanced", false),
      ctx(null, ["photography"], null, false),
      ctx(null, ["local-life"], null, true),
    ];
    for (const c of cases) {
      const anywhere =
        interestsAcknowledgedThemes(c.state).length > 0 ||
        acknowledgementSignalsFor("refinement", c).length > 0 ||
        acknowledgementSignalsFor("logistics", c).length > 0;
      expect(anywhere).toBe(true);
    }
  });
});

describe("P6 — reveal", () => {
  const c = ctx("coastal", [], "slow", true);

  it("drops reveal reasons whose theme was already acknowledged", () => {
    const signals = [
      "Coast first",
      "Led by heritage",
      "Fewer moments, held longer",
      "The private wine tasting is built into the day",
    ];
    const kept = filterRevealSignals(signals, c);
    expect(kept).not.toContain("Coast first");
    expect(kept).not.toContain("Fewer moments, held longer");
    expect(kept).toContain("Led by heritage");
  });

  it("never empties the reveal — the floor restores original order", () => {
    const signals = ["Coast first", "Fewer moments, held longer"];
    const kept = filterRevealSignals(signals, c);
    expect(kept.length).toBe(2);
    expect(kept).toEqual(signals);
  });

  it("keeps a single-signal reveal intact", () => {
    expect(filterRevealSignals(["Coast first"], c)).toEqual(["Coast first"]);
  });

  it("leaves reveal reasons untouched when nothing was acknowledged earlier", () => {
    const empty = ctx(null, [], null, false);
    const signals = ["Led by coast", "An even rhythm, with time to stop"];
    expect(filterRevealSignals(signals, empty)).toEqual(signals);
  });
});

describe("P6 — determinism and purity", () => {
  it("is pure: the same state always yields the same output", () => {
    const c = ctx("coastal", ["photography"], "balanced", true);
    expect(acknowledgementSignalsFor("logistics", c)).toEqual(
      acknowledgementSignalsFor("logistics", c),
    );
    expect(filterRevealSignals(["Led by coast"], c)).toEqual(
      filterRevealSignals(["Led by coast"], c),
    );
  });

  it("recomputes with no stale entries when the feeling changes", () => {
    const coastal = ctx("coastal", [], "balanced", true);
    const wine = ctx("wine-food", [], "balanced", true);
    expect(themesAcknowledgedBefore("refinement", coastal)).toEqual(new Set(["theme.coast"]));
    expect(themesAcknowledgedBefore("refinement", wine)).toEqual(new Set(["theme.wine"]));
  });

  it("never mutates the state it reads", () => {
    const interests: Interest[] = ["photography"];
    const c = ctx("coastal", interests, "balanced", true);
    acknowledgementSignalsFor("refinement", c);
    acknowledgementSignalsFor("logistics", c);
    filterRevealSignals(["Led by coast"], c);
    expect(interests).toEqual(["photography"]);
    expect(c.state.feeling).toBe("coastal");
    expect(deriveInheritedIntent(c.state).interestIds).toEqual(["coast"]);
  });

  it("orders surfaces the way the flow does", () => {
    expect([...ACKNOWLEDGEMENT_SURFACE_ORDER]).toEqual([
      "interests",
      "refinement",
      "logistics",
      "reveal",
    ]);
  });

  it("treats unrecognised prose as new, never as a duplicate", () => {
    expect(themeOfSignal("Something entirely new")).toBeNull();
    expect(themeOfSignal("Coast first")).toBe("theme.coast");
  });
});
