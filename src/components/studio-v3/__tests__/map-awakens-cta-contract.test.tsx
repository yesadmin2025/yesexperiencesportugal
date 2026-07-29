/**
 * MapAwakens CTA contract — the cinematic route reveal is the "silent"
 * screen in the flow: exactly ONE primary CTA ("Personalise a few
 * details"), no price string, no add-on preview, no secondary CTAs.
 *
 * Locks the approved flow plan (Screen 1). If someone re-adds a
 * "Reshape this day" ghost or leaks pricing onto this screen, this test
 * fires immediately.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(resolve(process.cwd(), "src/components/studio-v3/MapAwakens.tsx"), "utf8");

describe("MapAwakens — Screen 1 CTA contract", () => {
  it("primary CTA label is 'Personalise a few details'", () => {
    expect(SRC).toContain("Personalise a few details");
  });

  it("has no Reshape secondary CTA rendered", () => {
    expect(SRC).not.toMatch(/data-testid=["']studio-v3-reshape-day["']/);
    // The literal button text must not appear as rendered JSX.
    expect(SRC).not.toMatch(/>\s*Reshape this day\s*</);
  });

  it("does not render a price line (no €N / pp copy in the source)", () => {
    // A stray "€\d" would signal a price/inclusions leak onto Screen 1.
    // Comments and analytics keys can legitimately mention € — restrict to
    // JSX-string patterns that would render.
    const priceLike = SRC.match(/>[^<]*€\s?\d/);
    expect(
      priceLike,
      `MapAwakens must not render a price string: ${priceLike?.[0] ?? ""}`,
    ).toBeNull();
  });

  it("does not render 'Save my signature' or 'See my signature story' (those live on later screens)", () => {
    expect(SRC).not.toMatch(/Save my signature/);
    expect(SRC).not.toMatch(/See my signature story/);
  });
});
