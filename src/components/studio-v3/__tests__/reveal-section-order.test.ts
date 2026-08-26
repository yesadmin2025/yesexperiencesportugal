/**
 * Reveal-page section order — the final Studio V3 reveal must present
 * the story in a fixed, readable hierarchy:
 *   1. Signature hero (title + hero-price)
 *   2. Live route map (real coords + polyline)
 *   3. Daypart timeline (morning · midday · afternoon)
 *   4. Story of the day (chapter copy)
 *   5. Stops editor (swap/add/remove)
 *   6. Signature DNA (voice fingerprint)
 *   7. Shaping direction (call to reshape)
 *   8. Date-demoted booking bridge
 *   9. Final CTA bridge
 *
 * We assert this by scanning the `data-testid` attributes in the reveal
 * source file — those are the durable anchors the E2E specs and Playwright
 * suites already rely on (see e2e/studio-v3-reveal-walkthrough.spec.ts).
 * If someone re-orders sections, this test fires immediately.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REVEAL_SRC = readFileSync(
  resolve(process.cwd(), "src/components/studio-v3/StudioV3.tsx"),
  "utf8",
);

// Reveal moved to a unified Signature card that consolidates map, story,
// stops editor, DNA, price and add-ons under `studio-v3-signature-card`.
// Only the durable outer anchors are locked; card-internal sections are
// asserted in their own component tests (StopsEditor / SignatureDNA / etc).
// The route surface is asserted as `studio-v3-unified-route` — NOT as a map.
// A truthful day may legitimately render as pins OR as the timeline fallback
// when a moment has no approved coordinate, so this contract must not demand
// geography that may not exist.
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

describe("Studio V3 reveal — section order & hierarchy", () => {
  it("every named reveal section is present in the source", () => {
    for (const id of EXPECTED_ORDER) {
      expect(indexOfTestId(REVEAL_SRC, id), `missing section: ${id}`).toBeGreaterThan(-1);
    }
  });

  it("sections appear in the intended top-to-bottom order", () => {
    const positions = EXPECTED_ORDER.map((id) => ({
      id,
      pos: indexOfTestId(REVEAL_SRC, id),
    }));

    // Detect any pair that is out of order and produce a readable failure.
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const cur = positions[i];
      expect(
        cur.pos,
        `Section "${cur.id}" must appear AFTER "${prev.id}" in the reveal (got ${cur.pos} vs ${prev.pos})`,
      ).toBeGreaterThan(prev.pos);
    }
  });

  it("route surface renders below the signature hero block", () => {
    expect(indexOfTestId(REVEAL_SRC, "studio-v3-unified-route")).toBeGreaterThan(
      indexOfTestId(REVEAL_SRC, "studio-v3-signature-hero"),
    );
  });

  it("stops editor renders after the route so users see the day before edits", () => {
    expect(indexOfTestId(REVEAL_SRC, "studio-v3-stops-editor")).toBeGreaterThan(
      indexOfTestId(REVEAL_SRC, "studio-v3-unified-route"),
    );
  });
});
