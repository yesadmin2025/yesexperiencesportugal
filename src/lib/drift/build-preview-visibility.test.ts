import { describe, expect, it } from "vitest";
import {
  BUILD_PREVIEW_VH_FLOOR_DEFAULT,
  BUILD_PREVIEW_VH_FLOOR_DENSE,
  buildPreviewVhFloor,
  shouldShowBuildPreview,
  type BuildPreviewVisibilityInput,
} from "./build-preview-visibility";

/**
 * Regression coverage for the "BuildPreview overlaps the 3rd choice"
 * bug: at ~600px viewports (landscape phones, split-screen tablets)
 * the floating preview card used to bleed over the 3rd option's
 * hit area. The pure rule below MUST never return `true` for any
 * viewport height below the dense floor when there are 3+ options,
 * across both initial render and resize/rotation events.
 */

const base: BuildPreviewVisibilityInput = {
  chapterKind: "choice",
  choiceCount: 3,
  hasPickup: true,
  chapterIdx: 5,
  liveStopsCount: 2,
  vh: 900,
};

describe("buildPreviewVhFloor", () => {
  it("requires 720px for choice chapters with 3+ options", () => {
    expect(buildPreviewVhFloor("choice", 3)).toBe(BUILD_PREVIEW_VH_FLOOR_DENSE);
    expect(buildPreviewVhFloor("choice", 4)).toBe(BUILD_PREVIEW_VH_FLOOR_DENSE);
  });

  it("falls back to 640px for sparser chapters", () => {
    expect(buildPreviewVhFloor("choice", 2)).toBe(BUILD_PREVIEW_VH_FLOOR_DEFAULT);
    expect(buildPreviewVhFloor("choice", 0)).toBe(BUILD_PREVIEW_VH_FLOOR_DEFAULT);
    expect(buildPreviewVhFloor("drift", 0)).toBe(BUILD_PREVIEW_VH_FLOOR_DEFAULT);
    expect(buildPreviewVhFloor("text", 0)).toBe(BUILD_PREVIEW_VH_FLOOR_DEFAULT);
  });
});

describe("shouldShowBuildPreview — 3rd option overlap guard (~600px)", () => {
  it("HIDES preview at exactly 600px landscape with 3 options", () => {
    expect(shouldShowBuildPreview({ ...base, vh: 600 })).toBe(false);
  });

  it.each([320, 360, 414, 480, 540, 600, 667, 719])(
    "HIDES preview at vh=%i with 3 options",
    (vh) => {
      expect(shouldShowBuildPreview({ ...base, vh })).toBe(false);
    },
  );

  it("SHOWS preview at vh=720 (dense floor, 3 options)", () => {
    expect(shouldShowBuildPreview({ ...base, vh: 720 })).toBe(true);
  });

  it.each([720, 812, 844, 896, 1024, 1180])("SHOWS preview at vh=%i with 3 options", (vh) => {
    expect(shouldShowBuildPreview({ ...base, vh })).toBe(true);
  });
});

describe("shouldShowBuildPreview — rotation / resize", () => {
  // Simulates landing in portrait then rotating to landscape on a
  // typical phone (852 → 393). The preview must hide on rotation.
  it("hides preview when rotating from portrait to landscape", () => {
    const portrait = shouldShowBuildPreview({ ...base, vh: 852 });
    const landscape = shouldShowBuildPreview({ ...base, vh: 393 });
    expect(portrait).toBe(true);
    expect(landscape).toBe(false);
  });

  // Simulates rotating back to portrait — preview must reappear.
  it("re-shows preview when rotating from landscape to portrait", () => {
    expect(shouldShowBuildPreview({ ...base, vh: 393 })).toBe(false);
    expect(shouldShowBuildPreview({ ...base, vh: 852 })).toBe(true);
  });

  // Simulates a desktop user dragging the window from tall to short.
  // The preview must hide as soon as vh crosses below the dense floor.
  it("hides preview on a continuous resize across the 720px threshold", () => {
    const heights = [900, 800, 750, 721, 720, 719, 700, 600];
    const visibility = heights.map((vh) => shouldShowBuildPreview({ ...base, vh }));
    expect(visibility).toEqual([true, true, true, true, true, false, false, false]);
  });

  // Soft keyboard or browser chrome eats ~100px on mobile. If user
  // started at 720 portrait and the keyboard opens, the preview must
  // hide before the 3rd option gets occluded.
  it("hides preview when the soft keyboard shrinks the viewport", () => {
    const before = shouldShowBuildPreview({ ...base, vh: 740 });
    const afterKeyboard = shouldShowBuildPreview({ ...base, vh: 640 });
    expect(before).toBe(true);
    expect(afterKeyboard).toBe(false);
  });
});

describe("shouldShowBuildPreview — non-overlap gating", () => {
  it("hides preview on convergence chapters regardless of vh", () => {
    expect(shouldShowBuildPreview({ ...base, chapterKind: "convergence", vh: 1200 })).toBe(false);
  });

  it("hides preview before pickup is selected", () => {
    expect(shouldShowBuildPreview({ ...base, hasPickup: false })).toBe(false);
  });

  it("hides preview during the first 4 chapters (no signal yet)", () => {
    expect(shouldShowBuildPreview({ ...base, chapterIdx: 0 })).toBe(false);
    expect(shouldShowBuildPreview({ ...base, chapterIdx: 3 })).toBe(false);
    expect(shouldShowBuildPreview({ ...base, chapterIdx: 4 })).toBe(true);
  });

  it("hides preview when the day plan is still empty", () => {
    expect(shouldShowBuildPreview({ ...base, liveStopsCount: 0 })).toBe(false);
  });

  it("allows preview at 640px when the chapter only has 2 options", () => {
    expect(shouldShowBuildPreview({ ...base, choiceCount: 2, vh: 640 })).toBe(true);
    expect(shouldShowBuildPreview({ ...base, choiceCount: 2, vh: 639 })).toBe(false);
  });
});
