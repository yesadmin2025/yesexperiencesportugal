import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  CORPORATE_LANDSCAPES,
  PROPOSAL_LANDSCAPES,
  MULTIDAY_LANDSCAPES,
} from "@/components/ui/AmbientLandscapeStrip";
import { AmbientLandscapeReveal } from "@/components/ui/AmbientLandscapeReveal";

describe("Ambient landscape presets", () => {
  it("each preset has ≥3 photos with alt + caption + valid src", () => {
    for (const set of [CORPORATE_LANDSCAPES, PROPOSAL_LANDSCAPES, MULTIDAY_LANDSCAPES]) {
      expect(set.length).toBeGreaterThanOrEqual(3);
      for (const p of set) {
        expect(p.alt).toBeTruthy();
        expect(p.caption).toBeTruthy();
        expect(p.src).toMatch(/__l5e|https?:\/\//);
      }
    }
  });

  it("uses every ambient photo in exactly ONE preset (zero cross-page repeats)", () => {
    const all = [
      ...CORPORATE_LANDSCAPES,
      ...PROPOSAL_LANDSCAPES,
      ...MULTIDAY_LANDSCAPES,
    ].map((p) => p.src);
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });
});

describe("AmbientLandscapeReveal", () => {
  it("renders one figure per photo with alt + caption + zoom motion class", () => {
    const html = renderToString(
      <AmbientLandscapeReveal
        eyebrow="Test"
        title="Title"
        photos={CORPORATE_LANDSCAPES}
      />,
    );
    const imgCount = (html.match(/<img /g) ?? []).length;
    expect(imgCount).toBe(CORPORATE_LANDSCAPES.length);
    expect(html).toMatch(/alt="/);
    expect(html).toMatch(/ambient-reveal-slide/);
    expect(html).toMatch(/ambient-reveal-zoom/);
    // Exactly one active slide on first paint
    const activeMatches = html.match(/ambient-reveal-slide is-active/g) ?? [];
    expect(activeMatches.length).toBe(1);
  });

  it("renders pagination dots when there are multiple photos", () => {
    const html = renderToString(
      <AmbientLandscapeReveal
        eyebrow="Test"
        title="Title"
        photos={PROPOSAL_LANDSCAPES}
      />,
    );
    expect(html).toMatch(/role="tab"/);
    expect(html).toMatch(/aria-selected="true"/);
  });
});
