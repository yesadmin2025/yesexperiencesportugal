/**
 * Studio Pass 2C (corrected) — beat tiering with ONE feedback authority.
 *
 * Locks:
 *   - only Feeling and the FIRST route-bearing map beat stay cinematic;
 *   - every other beat advances without blocking and without prose;
 *   - no second feedback system: the Living Day's own causal engine is the
 *     single acknowledgement authority (no whisper prop, no reaction copy);
 *   - "first route beat" is acknowledge-once across refresh / saved hydration;
 *   - back/edit never resets the guard;
 *   - continue analytics semantics (event + `viaReaction`) are unchanged;
 *   - reduced motion still skips beats before tiering;
 *   - Logistics suppresses the redundant acknowledgement while the Living Day
 *     is visible; refinement is untouched.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { hasSeenFirstRouteBeat } from "../studioFirstRouteBeat";
import { buildLivingDaySnapshot, livingDayFeedback } from "../livingDaySpine";
import { INITIAL_STATE, type StudioV3State } from "../types";

const STUDIO_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);
const PANEL_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/LivingJourneyPanel.tsx"),
  "utf8",
);

function s(partial: Partial<StudioV3State>): StudioV3State {
  return { ...INITIAL_STATE, ...partial };
}

const tierBlock = STUDIO_SRC.slice(
  STUDIO_SRC.indexOf("const playReaction = useCallback"),
  STUDIO_SRC.indexOf("// Single-select handlers"),
);

describe("Pass 2C — beat tiers", () => {
  it("keeps exactly two cinematic tiers: Feeling and the first route map beat", () => {
    expect(tierBlock).toContain('const isRouteMapBeat = r.kind === "map-beat" && r.mapMode !== "origin"');
    expect(tierBlock).toContain(
      'const cinematic = r.kind === "feeling" || (isRouteMapBeat && !firstRouteBeatShownRef.current)',
    );
  });

  it("marks the first route beat as spent so later route beats are non-blocking", () => {
    expect(tierBlock).toContain("if (cinematic && isRouteMapBeat) firstRouteBeatShownRef.current = true;");
    expect(STUDIO_SRC).toContain("const firstRouteBeatShownRef = useRef(false);");
  });

  it("demoted beats never mount the overlay and advance in one step", () => {
    const branch = tierBlock.slice(tierBlock.indexOf("if (!cinematic)"));
    expect(branch).toContain("setReaction(null)");
    expect(branch.slice(0, branch.indexOf("return;"))).not.toMatch(/setReaction\(r\)/);
    expect(branch).toContain("}, 220);");
  });

  it("preserves exact continue analytics semantics for a demoted beat", () => {
    const branch = tierBlock.slice(tierBlock.indexOf("if (!cinematic)"));
    expect(branch).toContain('event: "continue"');
    expect(branch).toContain("value: { to: r.nextPhase, viaReaction: r.kind }");
  });

  it("still skips every beat under reduced motion, before tiering runs", () => {
    const reducedIdx = tierBlock.indexOf("prefersReducedMotion()");
    const tierIdx = tierBlock.indexOf("const cinematic =");
    expect(reducedIdx).toBeGreaterThan(-1);
    expect(reducedIdx).toBeLessThan(tierIdx);
  });

  it("adds no curation, rhythm, route or pricing coupling", () => {
    expect(tierBlock).not.toMatch(/RHYTHM_STOP_COUNT|priceFrom|resolveStudioV3Route|stripe/i);
  });
});

describe("Pass 2C — no second feedback authority", () => {
  it("removed the whisper system from Studio entirely", () => {
    expect(STUDIO_SRC).not.toMatch(/setWhisper|whisperSeq|whisper=\{/);
  });

  it("does not copy reaction prose anywhere on the demoted path", () => {
    const branch = tierBlock.slice(tierBlock.indexOf("if (!cinematic)"), tierBlock.indexOf("const rawHold"));
    expect(branch).not.toMatch(/r\.message|contextLine/);
  });

  it("the Living Day panel takes no whisper prop and keeps one feedback source", () => {
    expect(PANEL_SRC).not.toMatch(/whisper\?:|whisper = null|data-whisper/);
    expect(PANEL_SRC).toContain("livingDayFeedback(previous.state, state, previous.snap, snapshot)");
    expect(PANEL_SRC).toContain('aria-live="polite"');
    expect(PANEL_SRC).toContain("motion-reduce:animate-none");
  });

  it("never persists presentation-only beat state", () => {
    const persist = STUDIO_SRC.slice(
      STUDIO_SRC.indexOf("function writePersistedStudioState"),
      STUDIO_SRC.indexOf("export function StudioV3()"),
    );
    expect(persist).not.toMatch(/whisper|firstRouteBeat/);
  });
});

describe("Pass 2C — first route beat is acknowledge-once across restore", () => {
  const shaped: Partial<StudioV3State> = {
    feeling: "wine-food",
    companions: "couple",
    interests: ["wine"],
  };

  it("a brand-new session has not seen it", () => {
    expect(hasSeenFirstRouteBeat(s({ phase: "intro" }))).toBe(false);
    expect(hasSeenFirstRouteBeat(s({ phase: "feeling" }))).toBe(false);
    expect(hasSeenFirstRouteBeat(s({ phase: "who", ...shaped }))).toBe(false);
    expect(hasSeenFirstRouteBeat(s({ phase: "interests", ...shaped }))).toBe(false);
  });

  it("a restored session already past route shaping has seen it", () => {
    expect(hasSeenFirstRouteBeat(s({ phase: "rhythm", ...shaped }))).toBe(true);
    expect(hasSeenFirstRouteBeat(s({ phase: "refinement", ...shaped, rhythm: "balanced" }))).toBe(true);
    expect(hasSeenFirstRouteBeat(s({ phase: "logistics", ...shaped }))).toBe(true);
  });

  it("stays false when the restored state cannot resolve a route", () => {
    expect(hasSeenFirstRouteBeat(s({ phase: "logistics", feeling: "wine-food" }))).toBe(false);
    expect(hasSeenFirstRouteBeat(s({ phase: "rhythm", ...shaped, interests: [] }))).toBe(false);
  });

  it("a saved Signature hydrating to storyboard has seen it regardless of inputs", () => {
    expect(hasSeenFirstRouteBeat(s({ phase: "storyboard" }))).toBe(true);
    expect(hasSeenFirstRouteBeat(s({ phase: "checkoutSummary" }))).toBe(true);
    expect(STUDIO_SRC).toContain("firstRouteBeatShownRef.current = true;\n      setHydratedState(true);");
    expect(STUDIO_SRC).toContain("if (hasSeenFirstRouteBeat(persisted)) firstRouteBeatShownRef.current = true;");
  });

  it("back/edit never resets the guard", () => {
    const backBlock = STUDIO_SRC.slice(
      STUDIO_SRC.indexOf("const back = useCallback"),
      STUDIO_SRC.indexOf("const playReaction = useCallback"),
    );
    expect(backBlock).not.toContain("firstRouteBeatShownRef");
  });
});

describe("Pass 2C — Living Day carries the feedback, factually", () => {
  function pair(prev: Partial<StudioV3State>, next: Partial<StudioV3State>) {
    const a = s(prev);
    const b = s(next);
    return livingDayFeedback(a, b, buildLivingDaySnapshot(a), buildLivingDaySnapshot(b));
  }

  it("speaks for a real interest transition", () => {
    const fb = pair(
      { phase: "interests", feeling: "wine-food", companions: "couple", interests: [] },
      { phase: "interests", feeling: "wine-food", companions: "couple", interests: ["wine"] },
    );
    expect(fb?.trigger).toBe("interest");
    expect(fb?.text).toBeTruthy();
  });

  it("speaks for a real rhythm transition", () => {
    const base: Partial<StudioV3State> = {
      phase: "rhythm",
      feeling: "wine-food",
      companions: "couple",
      interests: ["wine"],
    };
    const fb = pair({ ...base }, { ...base, rhythm: "slow" });
    expect(fb?.trigger).toBe("rhythm");
  });

  it("is silent when nothing meaningful changed", () => {
    const base: Partial<StudioV3State> = {
      phase: "rhythm",
      feeling: "wine-food",
      companions: "couple",
      interests: ["wine"],
      rhythm: "balanced",
    };
    expect(pair({ ...base }, { ...base })).toBeNull();
  });
});

describe("Pass 2C — acknowledgement narration", () => {
  it("suppresses the logistics acknowledgement while the Living Day is visible", () => {
    expect(STUDIO_SRC).toContain('if (surface === "logistics" && !livingDayHidden) return null;');
  });

  it("leaves the refinement surface untouched", () => {
    const ack = STUDIO_SRC.slice(
      STUDIO_SRC.indexOf("const renderAcknowledgement ="),
      STUDIO_SRC.indexOf("const orderedRhythms"),
    );
    expect(ack).not.toContain('surface === "refinement"');
    expect(STUDIO_SRC).toContain('renderAcknowledgement("refinement")');
  });
});

describe("Pass 2C — commit hygiene", () => {
  it("carries no stale plan file", () => {
    expect(existsSync(resolve(process.cwd(), ".lovable/plan.md"))).toBe(false);
  });
});
