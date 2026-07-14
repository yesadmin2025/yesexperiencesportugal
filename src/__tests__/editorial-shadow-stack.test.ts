/**
 * Editorial shadow-stack regression.
 *
 * The premium "editorial card lift" look depends on a specific
 * shadow recipe rather than Tailwind's generic shadow scale:
 *
 *     shadow-[0_<offset>px_<blur>px_-<spread>px_rgba(...)]
 *
 * Two invariants are enforced here:
 *
 *  1. **Presence** — each key brand component must contain at least
 *     one shadow that matches the editorial recipe. If someone strips
 *     the lift off the studio frame, the homepage editorial cards, or
 *     the builder action bar, this test fails.
 *
 *  2. **No generic substitutes** — within those same components, raw
 *     `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-inner`
 *     are banned. They flatten the brand to a Tailwind default and
 *     remove the ivory-on-charcoal directional warmth.
 *
 * Generic Tailwind shadows ARE fine in admin / debug / QA pages
 * (admin.*, *.test.tsx, brand-qa, hero-verify, preview-check) — those
 * aren't customer-facing brand surfaces.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

interface ShadowSpec {
  label: string;
  file: string;
}

const KEY_COMPONENTS: ShadowSpec[] = [
  {
    label: "Homepage (index)",
    file: resolve(__dirname, "../routes/index.tsx"),
  },
  {
    label: "Studio Live Preview",
    file: resolve(__dirname, "../components/home/StudioLivePreview.tsx"),
  },
  {
    // `/builder` is a thin redirect to `/studio-v3` — the real Builder
    // surface lives in the StudioV3 component tree. We scan a
    // representative file there so the editorial shadow contract still
    // applies to what users actually see when they land on /builder.
    label: "Builder",
    file: resolve(__dirname, "../components/studio-v3/MapAwakens.tsx"),
  },
];

// Editorial recipe: shadow-[0_<n>px_<m>px_-<k>px_rgba(...)]
// Examples that should match:
//   shadow-[0_8px_22px_-10px_rgba(41,91,97,0.65)]
//   shadow-[0_18px_40px_-20px_rgba(46,46,46,0.45)]
const EDITORIAL_RECIPE = /shadow-\[0_\d+px_\d+px_-\d+px_(?:rgba?\([^)]+\)|color-mix\([^)]+\))\]/;

// Generic Tailwind shadow scales we ban inside customer-facing brand
// surfaces. We do allow `shadow-sm` and `shadow-none` because they
// represent "essentially flat" rather than a competing recipe.
const FORBIDDEN_GENERIC_SHADOW = /\b(?:hover:|focus:|md:|lg:)?shadow-(?:md|lg|xl|2xl|inner)\b/;

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("Editorial shadow-stack — presence", () => {
  for (const { label, file } of KEY_COMPONENTS) {
    it(`${label} — uses the editorial shadow recipe`, () => {
      const src = read(file);
      expect(src.length, `${label}: source file empty`).toBeGreaterThan(0);
      expect(
        EDITORIAL_RECIPE.test(src),
        `${label}: missing shadow-[0_Npx_Mpx_-Kpx_rgba(...)] recipe`,
      ).toBe(true);
    });
  }
});

describe("Editorial shadow-stack — no generic substitutes", () => {
  for (const { label, file } of KEY_COMPONENTS) {
    it(`${label} — does not fall back to generic Tailwind shadows`, () => {
      const src = read(file);
      const match = src.match(FORBIDDEN_GENERIC_SHADOW);
      expect(
        match,
        `${label}: generic shadow ${match?.[0]} replaces the editorial recipe`,
      ).toBeNull();
    });
  }
});

describe("Editorial shadow-stack — recipe sanity", () => {
  it("recipe matches a known canonical example", () => {
    expect(EDITORIAL_RECIPE.test("shadow-[0_8px_22px_-10px_rgba(41,91,97,0.65)]")).toBe(true);
    expect(EDITORIAL_RECIPE.test("shadow-[0_18px_40px_-20px_rgba(46,46,46,0.45)]")).toBe(true);
  });

  it("recipe rejects flat / generic shadows", () => {
    expect(EDITORIAL_RECIPE.test("shadow-md")).toBe(false);
    expect(EDITORIAL_RECIPE.test("shadow-lg")).toBe(false);
    expect(EDITORIAL_RECIPE.test("shadow-[0_2px_4px_rgba(0,0,0,0.1)]")).toBe(false); // missing negative spread
  });
});
