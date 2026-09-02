/**
 * LIVE-FLOW GUARD — explicit high-signal priorities.
 *
 * Proves the two halves of the contract:
 *
 *  1. A deliberately impossible combination inside a constrained eligible
 *     pool produces a conflict, so Studio must NOT commit or reveal that
 *     partially-matching day as YOUR DAY, and must never open lead capture.
 *  2. A satisfiable combination (Faith + Workshops on the full pool)
 *     produces NO conflict and stays bookable.
 *
 * Runs against the same pure authority the live component consumes
 * (`resolveHighSignalConflict`), plus a structural assertion that
 * `StudioV3.tsx` actually wires it into the phase-advance path — the
 * previous pass added the signal but never consumed it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { resolveHighSignalConflict } from "../highSignalConflict";
import { INITIAL_STATE } from "../types";
import type { StudioV3State } from "../types";

const base: StudioV3State = {
  ...INITIAL_STATE,
  phase: "interests",
  feeling: "coastal",
  companions: "couple",
  rhythm: "balanced",
  pickup: "lisbon",
  adults: 2,
  guests: 2,
  guestsInferred: false,
};

describe("impossible explicit priorities never reach YOUR DAY", () => {
  it("reports a conflict for faith + hands-on inside a coastal-only eligible pool", () => {
    const conflict = resolveHighSignalConflict({
      ...base,
      interests: ["faith", "hands-on"],
      eligibleTourIds: ["southwest-vicentine-coast", "wild-beaches-picnic"],
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.unsatisfied.length).toBeGreaterThan(0);
  });

  it("names the unsatisfied priorities precisely and does not silently drop one", () => {
    const conflict = resolveHighSignalConflict({
      ...base,
      interests: ["faith", "hands-on"],
      eligibleTourIds: ["southwest-vicentine-coast"],
    });
    expect(conflict).not.toBeNull();
    // Precise, human copy — never a generic "no results" string.
    expect(conflict!.message).toMatch(/sacred heritage|hands-on workshops/);
    expect(conflict!.message).not.toMatch(/curator|concierge|contact us|lead/i);
  });

  it("keeps the traveller inside Studio — no lead-capture / curator exit copy", () => {
    const conflict = resolveHighSignalConflict({
      ...base,
      interests: ["wine", "hands-on"],
      eligibleTourIds: ["southwest-vicentine-coast"],
    });
    expect(conflict).not.toBeNull();
    expect(conflict!.message).not.toMatch(/enquir|request a quote|we will contact/i);
  });
});

describe("satisfiable explicit priorities stay bookable", () => {
  it("faith + hands-on on the full eligible pool produces NO conflict", () => {
    expect(
      resolveHighSignalConflict({
        ...base,
        feeling: "faith",
        interests: ["faith", "hands-on"],
        eligibleTourIds: null,
      }),
    ).toBeNull();
  });

  it("wine + hands-on on the full pool produces NO conflict", () => {
    expect(
      resolveHighSignalConflict({
        ...base,
        feeling: "wine-food",
        interests: ["wine", "hands-on"],
        eligibleTourIds: null,
      }),
    ).toBeNull();
  });

  it("non-high-signal interests never block the flow", () => {
    expect(
      resolveHighSignalConflict({ ...base, interests: ["coast", "nature", "photography"] }),
    ).toBeNull();
  });

  it("an unanswered taste layer never blocks the flow", () => {
    expect(resolveHighSignalConflict({ ...base, interests: [] })).toBeNull();
    expect(resolveHighSignalConflict({ ...INITIAL_STATE })).toBeNull();
  });
});

describe("the live component consumes the guard", () => {
  const src = readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");

  it("imports the conflict authority", () => {
    expect(src).toContain('from "./highSignalConflict"');
  });

  it("blocks the storyboard transition and returns to interests", () => {
    expect(src).toMatch(/next === "storyboard" && conflict/);
    expect(src).toContain('phase: "interests"');
  });

  it("blocks Continue on the Interests screen", () => {
    expect(src).toMatch(/continueFromInterests = \(\) => \{\s*\/\/[^\n]*\n\s*if \(highSignalConflict\)/);
  });

  it("renders the trade-off message with a live region", () => {
    expect(src).toContain('data-testid="studio-v3-priority-conflict"');
    expect(src).toContain('aria-live="polite"');
  });
});
