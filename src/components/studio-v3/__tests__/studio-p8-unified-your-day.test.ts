import { describe, expect, it } from "vitest";
import { getNextPhase, isPhaseRelevant, STUDIO_V3_PHASE_ORDER } from "../curation";
import { INITIAL_STATE, type StudioV3State } from "../types";
import { canonicalStudioPhase, LEGACY_UNIFIED_PHASES } from "../studioPhaseCanonical";

const base: StudioV3State = { ...INITIAL_STATE, phase: "feeling" };

describe("P8 — unified Your Day surface", () => {
  it("canonicalizes the legacy reveal phases to storyboard", () => {
    expect(canonicalStudioPhase("map")).toBe("storyboard");
    expect(canonicalStudioPhase("confirmation")).toBe("storyboard");
    for (const legacy of LEGACY_UNIFIED_PHASES) {
      expect(canonicalStudioPhase(legacy)).toBe("storyboard");
    }
  });

  it("is idempotent and leaves every other phase untouched", () => {
    for (const phase of STUDIO_V3_PHASE_ORDER) {
      const once = canonicalStudioPhase(phase);
      expect(canonicalStudioPhase(once)).toBe(once);
      if (phase !== "map" && phase !== "confirmation") expect(once).toBe(phase);
    }
  });

  it("keeps the legacy ids in the phase order so saved states still hydrate", () => {
    expect(STUDIO_V3_PHASE_ORDER).toContain("map");
    expect(STUDIO_V3_PHASE_ORDER).toContain("confirmation");
  });

  it("never navigates to map or confirmation again", () => {
    expect(isPhaseRelevant("map", base)).toBe(false);
    expect(isPhaseRelevant("confirmation", base)).toBe(false);
    expect(isPhaseRelevant("storyboard", base)).toBe(true);
  });

  it("routes logistics straight into the unified surface, and onward to guest details", () => {
    const s: StudioV3State = { ...base, feeling: "coastal", companions: "couple", refinement: "coast-wild-beaches" };
    expect(getNextPhase(s, "logistics")).toBe("storyboard");
    expect(getNextPhase(s, "storyboard")).toBe("guestDetails");
  });
});
