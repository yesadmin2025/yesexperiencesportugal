/**
 * Reveal-page section order — the final Studio V3 reveal must preserve the
 * durable hierarchy of the unified Your Day surface:
 *   1. Signature hero (title + value)
 *   2. Unified Signature card
 *   3. Truth-gated Your Day route surface (real map OR editorial timeline)
 *   4. Stops editor (swap/add/remove)
 *
 * The route surface deliberately does NOT require a map. P8 earns map mode
 * only when every kept moment has real coordinates; otherwise the same route
 * is rendered as a timeline. This test therefore locks the product hierarchy,
 * while map-vs-timeline truth is covered by your-day-map-truth and P8 tests.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REVEAL_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

const EXPECTED_ORDER = [
  "studio-v3-reveal",
  "studio-v3-signature-hero",
  "studio-v3-signature-card",
  "studio-v3-unified-route",
  "studio-v3-stops-editor",
];

function indexOfTestId(src: string, id: string): number {
  return src.indexOf(`data-testid="${id}"`);
}

describe("Studio V3 reveal — unified Your Day hierarchy", () => {
  it("every durable Your Day section is present in the source", () => {
    for (const id of EXPECTED_ORDER) {
      expect(indexOfTestId(REVEAL_SRC, id), `missing section: ${id}`).toBeGreaterThan(-1);
    }
  });

  it("sections appear in the intended top-to-bottom order", () => {
    const positions = EXPECTED_ORDER.map((id) => ({
      id,
      pos: indexOfTestId(REVEAL_SRC, id),
    }));

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const cur = positions[i];
      expect(
        cur.pos,
        `Section "${cur.id}" must appear AFTER "${prev.id}" in the reveal (got ${cur.pos} vs ${prev.pos})`,
      ).toBeGreaterThan(prev.pos);
    }
  });

  it("the truth-gated route surface renders below the signature hero", () => {
    const heroIdx = indexOfTestId(REVEAL_SRC, "studio-v3-signature-hero");
    const routeIdx = indexOfTestId(REVEAL_SRC, "studio-v3-unified-route");
    expect(routeIdx).toBeGreaterThan(heroIdx);
  });

  it("stops editor renders after the route surface so users see the day before editing it", () => {
    expect(indexOfTestId(REVEAL_SRC, "studio-v3-stops-editor")).toBeGreaterThan(
      indexOfTestId(REVEAL_SRC, "studio-v3-unified-route"),
    );
  });
});
