import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  AmbientLandscapeStrip,
  CORPORATE_LANDSCAPES,
  PROPOSAL_LANDSCAPES,
  MULTIDAY_LANDSCAPES,
} from "@/components/ui/AmbientLandscapeStrip";

describe("AmbientLandscapeStrip", () => {
  it("renders each preset with alt + caption + valid src", () => {
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
    const all = [...CORPORATE_LANDSCAPES, ...PROPOSAL_LANDSCAPES, ...MULTIDAY_LANDSCAPES].map((p) => p.src);
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });

  it("emits <img> with alt, sizes, lazy loading and Ken Burns motion class", () => {
    const html = renderToString(
      <AmbientLandscapeStrip
        eyebrow="Test"
        title="Title"
        photos={CORPORATE_LANDSCAPES}
      />,
    );
    const imgCount = (html.match(/<img /g) ?? []).length;
    expect(imgCount).toBe(CORPORATE_LANDSCAPES.length);
    expect(html).toMatch(/loading="lazy"/);
    expect(html).toMatch(/sizes="/);
    expect(html).toMatch(/alt="/);
    expect(html).toMatch(/ambient-kenburns/);
  });
});
