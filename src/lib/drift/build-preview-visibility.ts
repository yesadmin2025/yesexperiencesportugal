/**
 * BuildPreview visibility rule.
 * ────────────────────────────────────────────────────────────
 * Pure, framework-free function used by `StudioDrift` to decide
 * whether the floating `ProgressiveBuildPreview` card should be
 * rendered on top of the current chapter.
 *
 * The card is anchored at `bottom-3` and is ~84px tall + 12px inset
 * (~96px). Choice chapters reserve `108px` at the bottom of the
 * choice stack as breathing room. With three options stacked on a
 * short viewport (~600px tall, e.g. landscape phones), the 3rd
 * option's hit-area collides with the preview's halo. The rule
 * below keeps the preview hidden until there is real room to
 * stack everything without overlap.
 *
 * Thresholds (kept in sync with the inline comment in StudioDrift):
 *   - 3+ choice options → require vh ≥ 720
 *   - otherwise         → require vh ≥ 640
 *
 * The pure shape lets us unit-test resize/rotation behaviour
 * without mounting React, and lets the rule be reused by future
 * surfaces (e.g. tailored summary, recap drawer).
 */
export type BuildPreviewChapterKind =
  | "drift"
  | "text"
  | "choice"
  | "convergence";

export interface BuildPreviewVisibilityInput {
  chapterKind: BuildPreviewChapterKind;
  /** Number of options in the current chapter (0 for non-choice). */
  choiceCount: number;
  /** Whether the user has already picked a pickup location. */
  hasPickup: boolean;
  /** Current chapter index in the drift timeline. */
  chapterIdx: number;
  /** Number of stops already on the live day plan. */
  liveStopsCount: number;
  /** Viewport height in CSS px. */
  vh: number;
}

export const BUILD_PREVIEW_VH_FLOOR_DEFAULT = 640;
export const BUILD_PREVIEW_VH_FLOOR_DENSE = 720;

/**
 * Minimum viewport height required to surface BuildPreview for
 * the given chapter shape.
 */
export function buildPreviewVhFloor(
  chapterKind: BuildPreviewChapterKind,
  choiceCount: number,
): number {
  if (chapterKind === "choice" && choiceCount >= 3) {
    return BUILD_PREVIEW_VH_FLOOR_DENSE;
  }
  return BUILD_PREVIEW_VH_FLOOR_DEFAULT;
}

/**
 * Returns true when the BuildPreview card is safe to render
 * without overlapping the chapter's interactive content.
 */
export function shouldShowBuildPreview(
  input: BuildPreviewVisibilityInput,
): boolean {
  const { chapterKind, choiceCount, hasPickup, chapterIdx, liveStopsCount, vh } =
    input;
  if (chapterKind === "convergence") return false;
  if (!hasPickup) return false;
  if (chapterIdx < 4) return false;
  if (liveStopsCount <= 0) return false;
  return vh >= buildPreviewVhFloor(chapterKind, choiceCount);
}
