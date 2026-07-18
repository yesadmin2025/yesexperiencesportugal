import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  AmbientLandscapeStrip,
  CORPORATE_LANDSCAPES,
  PROPOSAL_LANDSCAPES,
  MULTIDAY_LANDSCAPES,
} from "@/components/ui/AmbientLandscapeStrip";

describe("AmbientLandscapeStrip", () => {
  it("renders 3 photos per preset with alt + caption", () => {
    for (const set of [CORPORATE_LANDSCAPES, PROPOSAL_LANDSCAPES, MULTIDAY_LANDSCAPES]) {
      expect(set).toHaveLength(3);
      for (const p of set) {
        expect(p.alt).toBeTruthy();
        expect(p.caption).toBeTruthy();
        expect(p.src).toMatch(/__l5e|https?:\/\//);
      }
    }
  });

  it("emits <img> with alt, sizes and lazy loading", () => {
    const html = renderToString(
      <AmbientLandscapeStrip
        eyebrow="Test"
        title="Title"
        photos={CORPORATE_LANDSCAPES}
      />,
    );
    const imgCount = (html.match(/<img /g) ?? []).length;
    expect(imgCount).toBe(3);
    expect(html).toMatch(/loading="lazy"/);
    expect(html).toMatch(/sizes="/);
    expect(html).toMatch(/alt="/);
  });
});
