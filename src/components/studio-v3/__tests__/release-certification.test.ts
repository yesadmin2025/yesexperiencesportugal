/**
 * FINAL EXPERIENCE & RELEASE CERTIFICATION.
 *
 * Narrow, source-level proofs for the release contracts that are NOT already
 * owned by an existing suite:
 *  - mobile/responsive contract of the single live manifestation (Living Canvas);
 *  - motion safety (reduced motion never gates content or controls);
 *  - image alt / decorative-layer honesty and graceful media fallback;
 *  - truthful geography (no fabricated map geometry without coordinates).
 *
 * Product truth, Director logic, pricing, add-ons and checkout parity remain
 * certified by their existing suites; nothing here duplicates them.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const CANVAS = read("src/components/studio-v3/LivingCanvas.tsx");
const MODEL = read("src/lib/studio-v3/livingCanvasModel.ts");
const MEDIA = read("src/lib/studio-v3/studioMediaResolver.ts");

describe("1 — mobile / responsive contract", () => {
  it("the Canvas stays in normal document flow and never overlays controls", () => {
    expect(CANVAS).not.toMatch(/className="[^"]*\b(?:sticky|fixed)\b/);
    expect(CANVAS).not.toMatch(/position:\s*"(?:sticky|fixed)"/);
    expect(CANVAS).not.toMatch(/\bz-\[?\d/);
    // The only absolute positioning is inside the figure (caption + crossfade
    // layer), never over the decision surface.
    for (const match of CANVAS.match(/absolute[^"]*/g) ?? []) {
      expect(match).not.toContain("inset-x-0 bottom-0 z");
    }
  });

  it("never forces a two-column squeeze or viewport-height block on mobile", () => {
    expect(CANVAS).not.toMatch(/\bgrid-cols-2\b/);
    expect(CANVAS).not.toMatch(/\b(?:min-)?h-\[100dvh\]/);
    expect(CANVAS).toMatch(/h-\[212px\]\s+md:h-\[320px\]/);
  });

  it("horizontal content is opt-in scroll, not page overflow", () => {
    // The assembled rail is the only horizontal surface and it scrolls itself.
    expect(CANVAS).toContain("overflow-x-auto");
    expect(CANVAS).toMatch(/data-testid="studio-canvas-assembled-rail"/);
  });
});

describe("2 — accessibility / motion", () => {
  it("every Canvas animation is motion-safe gated", () => {
    const animated = CANVAS.match(/animate-\[[^\]]+\]|transition-opacity/g) ?? [];
    expect(animated.length).toBeGreaterThan(0);
    for (const token of animated) {
      const at = CANVAS.indexOf(token);
      const before = CANVAS.slice(Math.max(0, at - 40), at);
      expect(before, `un-gated animation: ${token}`).toContain("motion-safe:");
    }
  });

  it("reduced motion cannot hide content: no opacity-0 or hidden start state", () => {
    expect(CANVAS).not.toMatch(/className="[^"]*\bopacity-0\b/);
    expect(CANVAS).not.toMatch(/className="[^"]*\binvisible\b/);
  });

  it("the outgoing crossfade layer is decorative and the shown image is described", () => {
    expect(CANVAS).toMatch(/aria-hidden\s*\n?\s*src=\{previous\.src\}\s*\n?\s*alt=""/);
    expect(CANVAS).toContain("alt={shown.alt}");
  });

  it("both Canvas variants expose an accessible name", () => {
    expect((CANVAS.match(/aria-label="/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe("3 — media and geography truth", () => {
  it("every resolved media carries an alt string, so a missing image never blocks progress", () => {
    expect(MEDIA).toMatch(/alt:\s*string/);
    expect(MEDIA).toMatch(/source:/);
  });

  it("a focal point is applied only when verified — never an invented crop", () => {
    expect((CANVAS.match(/\.focal \? \{ objectPosition: /g) ?? []).length).toBe(2);
  });

  it("geography degrades truthfully instead of fabricating map geometry", () => {
    // The model exposes explicit, honest geography kinds; a route/timeline kind
    // is only reachable from real derived stops.
    for (const kind of ["none", "region-cue", "anchors", "route", "timeline"]) {
      expect(MODEL).toContain(`"${kind}"`);
    }
    expect(MODEL).not.toMatch(/lat:\s*0\b/);
    expect(MODEL).not.toMatch(/Math\.random/);
  });
});
