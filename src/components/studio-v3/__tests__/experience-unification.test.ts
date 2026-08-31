/**
 * EXPERIENCE UNIFICATION — one visual manifestation.
 *
 * Source-level contract proofs: the modern Studio V3 path renders the Living
 * Canvas as the single live manifestation of the day taking shape, with no
 * competing Journey Draft pill/drawer and no second pre-YOUR DAY route/map
 * artefact.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const STUDIO = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);
const CANVAS = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/LivingCanvas.tsx"),
  "utf8",
);

/** The `{state.phase === "x" ? ( ... )` block for one phase. */
function phaseBlock(phase: string): string {
  const start = STUDIO.indexOf(`{state.phase === "${phase}"`);
  expect(start, `phase block missing: ${phase}`).toBeGreaterThan(-1);
  const next = STUDIO.indexOf("{state.phase === ", start + 10);
  return STUDIO.slice(start, next === -1 ? STUDIO.length : next);
}

describe("A — the Journey Draft panel is retired from the live path", () => {
  it("does not render LivingJourneyPanel or import it", () => {
    expect(STUDIO).not.toMatch(/<LivingJourneyPanel/);
    expect(STUDIO).not.toContain('from "./LivingJourneyPanel"');
  });

  it("does not reference the journey pill gate any more", () => {
    expect(STUDIO).not.toContain("livingDayHidden");
    expect(STUDIO).not.toContain("livingDayStageFor");
  });
});

describe("B — Canvas presence matrix", () => {
  const WITH_CANVAS = [
    "feeling",
    "destination",
    "who",
    "occasion",
    "interests",
    "rhythm",
    "refinement",
    "considerations",
    "logistics",
  ];

  for (const phase of WITH_CANVAS) {
    it(`${phase} keeps the Living Canvas under the decision`, () => {
      expect(phaseBlock(phase)).toContain("canvas={<LivingCanvas model={livingCanvas} />}");
    });
  }

  it("intro short-circuits before any Canvas", () => {
    const intro = STUDIO.slice(
      STUDIO.indexOf('if (state.phase === "intro") {'),
      STUDIO.indexOf('if (state.phase === "intro") {') + 400,
    );
    expect(intro).not.toContain("LivingCanvas");
  });
});

describe("C — YOUR DAY uses the assembled treatment only", () => {
  it("storyboard renders the assembled variant and no second full Canvas", () => {
    const block = phaseBlock("storyboard");
    expect(block).toContain('<LivingCanvas model={livingCanvas} variant="assembled" />');
    expect(block).not.toContain("canvas={<LivingCanvas model={livingCanvas} />}");
  });

  it("guestDetails and checkoutSummary carry no discovery Canvas", () => {
    expect(phaseBlock("guestDetails")).not.toContain("<LivingCanvas");
    expect(phaseBlock("checkoutSummary")).not.toContain("<LivingCanvas");
  });
});

describe("D — at most one Canvas mounted per phase path", () => {
  it("every Canvas render sits inside a mutually exclusive phase branch", () => {
    const renders = STUDIO.match(/<LivingCanvas /g) ?? [];
    expect(renders.length).toBeGreaterThan(0);
    // One per phase branch: no phase block holds two Canvas elements.
    for (const phase of [
      "feeling",
      "destination",
      "who",
      "occasion",
      "interests",
      "rhythm",
      "refinement",
      "considerations",
      "logistics",
      "storyboard",
    ]) {
      expect((phaseBlock(phase).match(/<LivingCanvas /g) ?? []).length).toBe(1);
    }
  });

  it("the Canvas testid is emitted once per rendered variant", () => {
    expect((CANVAS.match(/data-testid="studio-living-canvas"/g) ?? []).length).toBe(2);
    expect(CANVAS).toContain('variant === "assembled"');
  });
});

describe("E — no second pre-YOUR DAY route artefact", () => {
  it("ComposerMap is not mounted in the modern path", () => {
    expect(STUDIO).not.toMatch(/<ComposerMap/);
  });
});

describe("G — 393px layout contract", () => {
  it("the Canvas is normal flow: no sticky, fixed or viewport overlay", () => {
    expect(CANVAS).not.toMatch(/className="[^"]*\bsticky\b/);
    expect(CANVAS).not.toMatch(/className="[^"]*\bfixed\b/);
    expect(CANVAS).not.toMatch(/position:\s*"(?:sticky|fixed)"/);
    expect(CANVAS).not.toMatch(/\b(?:min-)?h-\[100dvh\]/);
    expect(CANVAS).toContain('className="w-full"');
  });
});
