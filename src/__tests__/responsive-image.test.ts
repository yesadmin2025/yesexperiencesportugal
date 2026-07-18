import { describe, it, expect } from "vitest";
import { buildResponsiveSrc, SIZES } from "@/lib/responsive-image";

describe("buildResponsiveSrc", () => {
  it("routes Viator URLs through /api/img with a full width ramp", () => {
    const r = buildResponsiveSrc(
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/db/dd/b6.jpg",
      { sizes: "card" },
    );
    expect(r.src).toContain("/api/img?u=");
    expect(r.src).toContain("w=800");
    expect(r.srcSet).toMatch(/480w/);
    expect(r.srcSet).toMatch(/1600w/);
    expect(r.sizes).toBe(SIZES.card);
  });

  it("passes through Lovable CDN URLs unchanged", () => {
    const url = "/__l5e/assets-v1/abc/hero.jpg";
    const r = buildResponsiveSrc(url, { sizes: "hero" });
    expect(r.src).toBe(url);
    expect(r.srcSet).toBeUndefined();
    expect(r.sizes).toBe(SIZES.hero);
  });

  it("passes through Supabase signed URLs unchanged", () => {
    const url = "https://kqygnqetygcvkaauwbji.supabase.co/storage/v1/object/sign/tour-photos/foo.jpg?token=x";
    const r = buildResponsiveSrc(url);
    expect(r.src).toBe(url);
    expect(r.srcSet).toBeUndefined();
  });

  it("accepts a raw sizes string", () => {
    const r = buildResponsiveSrc("/local/a.jpg", { sizes: "50vw" });
    expect(r.sizes).toBe("50vw");
  });

  it("returns empty-safe result for empty url", () => {
    const r = buildResponsiveSrc("");
    expect(r.src).toBe("");
  });
});
