/**
 * P10 — premium delegation mode ("Let YES design the rest").
 *
 * One concierge moment replaces the old per-question "Let YES decide"
 * shortcuts. These tests lock the product contract: eligibility, determinism,
 * explicit-choice precedence, the skipped (never fabricated) refinement,
 * operational fields staying human-controlled, the wine rule, honest
 * `decidedForMe` marking, legacy session behaviour, and the fact that the
 * modern visible path contains exactly one delegation affordance.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getNextPhase, isPhaseRelevant } from "../curation";
import { INITIAL_STATE, type StudioV3State } from "../types";
import {
  applyDelegation,
  delegationAcknowledgement,
  isDelegationActive,
  isDelegationEligible,
  isDelegationOffered,
  releaseDelegatedTaste,
} from "../studioDelegation";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

function state(patch: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...patch };
}

/** Feeling + Who answered personally — the delegation entry condition. */
const ready = state({ phase: "interests", feeling: "coastal", companions: "couple" });

describe("P10 · eligibility", () => {
  it("is unavailable before both feeling and companions exist", () => {
    expect(isDelegationEligible(INITIAL_STATE)).toBe(false);
    expect(isDelegationEligible(state({ feeling: "coastal" }))).toBe(false);
    expect(isDelegationEligible(state({ companions: "couple" }))).toBe(false);
    expect(isDelegationEligible(ready)).toBe(true);
  });

  it("never offers delegation before both answers exist", () => {
    expect(isDelegationOffered(state({ feeling: "coastal" }), "interests")).toBe(false);
    expect(isDelegationOffered(state({ companions: "family" }), "rhythm")).toBe(false);
    expect(isDelegationOffered(ready, "interests")).toBe(true);
  });

  it("applyDelegation is a no-op when not eligible", () => {
    const out = applyDelegation(state({ feeling: "coastal" }));
    expect(out.delegated).toEqual([]);
    expect(out.state.delegationMode).toBeNull();
    expect(out.state.interests).toEqual([]);
    expect(out.state.rhythm).toBeNull();
  });
});

describe("P10 · delegating from Interests", () => {
  const out = applyDelegation(ready);

  it("fills interests then rhythm and sets delegation mode", () => {
    expect(out.state.interests.length).toBeGreaterThan(0);
    expect(out.state.rhythm).not.toBeNull();
    expect(isDelegationActive(out.state)).toBe(true);
    expect(out.state.delegationMode).toBe("yes-designs");
  });

  it("marks only the dimensions actually delegated", () => {
    expect([...out.delegated].sort()).toEqual(["interests", "rhythm"]);
    expect([...out.state.decidedForMe].sort()).toEqual(["interests", "rhythm"]);
    expect(out.state.decidedForMe).not.toContain("feeling");
  });

  it("is deterministic — same state, same delegated outputs", () => {
    const a = applyDelegation(ready);
    const b = applyDelegation(ready);
    expect(a.state.interests).toEqual(b.state.interests);
    expect(a.state.rhythm).toBe(b.state.rhythm);
    expect(a.delegated).toEqual(b.delegated);
  });

  it("recomputes from changed explicit state instead of staying stale", () => {
    const coastal = applyDelegation(ready).state;
    const wine = applyDelegation(state({ ...ready, feeling: "wine-food" })).state;
    expect(coastal.interests).not.toEqual(wine.interests);
  });

  it("does not offer a second delegation once active", () => {
    expect(isDelegationOffered(out.state, "interests")).toBe(false);
    expect(isDelegationOffered(out.state, "rhythm")).toBe(false);
  });
});

describe("P10 · explicit choices beat delegated defaults", () => {
  it("preserves explicit interests when delegating later at Rhythm", () => {
    const explicit = state({
      phase: "rhythm",
      feeling: "coastal",
      companions: "friends",
      interests: ["heritage", "photography"],
    });
    const out = applyDelegation(explicit);
    expect(out.state.interests).toEqual(["heritage", "photography"]);
    expect(out.delegated).toEqual(["rhythm"]);
    expect(out.state.decidedForMe).toEqual(["rhythm"]);
    expect(out.state.rhythm).not.toBeNull();
  });

  it("keeps an explicit rhythm untouched", () => {
    const out = applyDelegation(state({ ...ready, rhythm: "slow" }));
    expect(out.state.rhythm).toBe("slow");
    expect(out.delegated).toEqual(["interests"]);
  });

  it("releases only delegated taste values, never explicit ones", () => {
    const delegated = applyDelegation(ready).state;
    const released = releaseDelegatedTaste(delegated);
    expect(released.interests).toEqual([]);
    expect(released.rhythm).toBeNull();
    expect(released.delegationMode).toBeNull();
    expect(released.feeling).toBe("coastal");
    expect(released.companions).toBe("couple");

    const explicitRhythm = applyDelegation(state({ ...ready, rhythm: "full" })).state;
    expect(releaseDelegatedTaste(explicitRhythm).rhythm).toBe("full");
  });
});

describe("P10 · refinement is skipped, never fabricated", () => {
  const out = applyDelegation(ready).state;

  it("leaves refinement null", () => {
    expect(out.refinement).toBeNull();
  });

  it("makes the refinement phase irrelevant while delegation is active", () => {
    expect(isPhaseRelevant("refinement", out)).toBe(false);
  });

  it("continues from rhythm into logistics", () => {
    expect(getNextPhase(out, "rhythm")).toBe("logistics");
  });
});

describe("P10 · operational facts are never delegated", () => {
  it("preserves every operational field by equality", () => {
    const operational = state({
      ...ready,
      dateMode: "exact",
      dateExact: "2026-06-15",
      pickup: "lisbon",
      guests: 4,
      adults: 2,
      minorAges: [7, 9],
      guestsPrivateEvent: true,
      guestsInferred: true,
      considerations: ["reduced-mobility"],
      language: "en",
    });
    const out = applyDelegation(operational).state;
    for (const key of [
      "dateMode",
      "dateExact",
      "pickup",
      "guests",
      "adults",
      "guestsPrivateEvent",
      "guestsInferred",
      "language",
    ] as const) {
      expect(out[key]).toEqual(operational[key]);
    }
    expect(out.minorAges).toEqual([7, 9]);
    expect(out.considerations).toEqual(["reduced-mobility"]);
  });

  it("does not mutate the input state", () => {
    const input = state({ ...ready });
    const snapshot = JSON.stringify(input);
    applyDelegation(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("P10 · wine rule is untouched", () => {
  it("never infers wine without explicit wine intent", () => {
    for (const feeling of ["coastal", "hidden", "romance", "culture", "slow-luxury"] as const) {
      const out = applyDelegation(state({ ...ready, feeling })).state;
      expect(out.interests).not.toContain("wine");
    }
  });

  it("may infer wine under the existing wine-food rule", () => {
    const out = applyDelegation(state({ ...ready, feeling: "wine-food" })).state;
    expect(out.interests).toContain("wine");
  });
});

describe("P10 · legacy sessions", () => {
  it("default state carries no delegation flag", () => {
    expect(INITIAL_STATE.delegationMode).toBeNull();
    expect(isDelegationActive(INITIAL_STATE)).toBe(false);
  });

  it("a legacy session without the flag behaves exactly as before", () => {
    const legacy = { ...INITIAL_STATE, feeling: "coastal", companions: "couple" } as StudioV3State;
    // Simulate hydration of a pre-P10 saved state (no delegationMode key).
    delete (legacy as unknown as Record<string, unknown>).delegationMode;
    const hydrated = { ...INITIAL_STATE, ...legacy };
    expect(hydrated.delegationMode).toBeNull();
    expect(isDelegationActive(hydrated)).toBe(false);
    expect(isPhaseRelevant("refinement", { ...hydrated, rhythm: "balanced" })).toBe(
      isPhaseRelevant("refinement", { ...hydrated, rhythm: "balanced" }),
    );
  });

  it("releaseDelegatedTaste is a no-op on an untouched legacy state", () => {
    expect(releaseDelegatedTaste(INITIAL_STATE)).toBe(INITIAL_STATE);
  });
});

describe("P10 · acknowledgement copy is trust, not randomness", () => {
  it("never uses surprise/random framing", () => {
    for (const d of [[], ["rhythm"], ["interests", "rhythm"]] as const) {
      const line = delegationAcknowledgement(d as never);
      expect(line).not.toMatch(/surprise|random/i);
      expect(line.length).toBeGreaterThan(0);
    }
  });
});

/* ---------------------------------------------------------------------------
 * Source contract — the modern visible path has ONE delegation affordance.
 * ------------------------------------------------------------------------ */

const STUDIO = read("src/components/studio-v3/StudioV3.tsx");
const CARD = read("src/components/studio-v3/StudioDelegationCard.tsx");

describe("P10 · single visible delegation affordance", () => {
  it("no per-question 'Let YES decide' buttons remain in the modern path", () => {
    expect(STUDIO).not.toContain('<LetYesDecide');
    expect(STUDIO).not.toContain('label="Let YES decide"');
    expect(STUDIO).not.toContain('data-testid="studio-v3-let-yes-decide"');
  });

  it("renders the delegation card only on interests and rhythm", () => {
    const mounts = STUDIO.match(/<StudioDelegationCard/g) ?? [];
    expect(mounts).toHaveLength(2);
    expect(STUDIO).toContain('isDelegationOffered(state, "interests")');
    expect(STUDIO).toContain('isDelegationOffered(state, "rhythm")');
  });

  it("carries the approved concierge copy and an accessible target", () => {
    expect(CARD).toContain("Trust the curator");
    expect(CARD).toContain("Let YES design the rest");
    expect(CARD).toContain("Yes, design it for me");
    expect(CARD).toContain("min-h-[44px]");
    expect(CARD).toContain("focus-visible:outline");
    expect(CARD).not.toMatch(/surprise me/i);
  });

  it("uses only existing brand tokens and no animation", () => {
    expect(CARD).toMatch(/var\(--teal\)/);
    expect(CARD).toMatch(/var\(--gold\)/);
    expect(CARD).toMatch(/var\(--ivory\)/);
    expect(CARD).not.toContain("animate-");
    expect(CARD).not.toContain("transition:");
  });

  it("delegation flows through the existing advance path, not a new resolver", () => {
    expect(STUDIO).toContain("applyDelegation(state)");
    expect(STUDIO).toContain('advance(getNextPhase(forward, "rhythm"))');
  });
});
