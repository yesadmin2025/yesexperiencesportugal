import type { StudioV3Phase } from "./types";

/**
 * P8 — one unified "Your Day" surface.
 *
 * The traveller-facing reveal used to be split across three phases:
 *   `map` (cinematic route reveal) → `storyboard` (refine + price) →
 *   `confirmation` (story + summary).
 *
 * They are now a single scrolling surface hosted on the CANONICAL phase
 * `storyboard`. The legacy ids stay in the phase union and in
 * `STUDIO_V3_PHASE_ORDER` so older saved sessions, deep links and tests
 * still hydrate — they are simply canonicalized to `storyboard` at the
 * boundary, in one commit, so there is no flicker and no redirect loop.
 */
export const LEGACY_UNIFIED_PHASES: ReadonlyArray<StudioV3Phase> = ["map", "confirmation"];

export function canonicalStudioPhase(phase: StudioV3Phase): StudioV3Phase {
  return phase === "map" || phase === "confirmation" ? "storyboard" : phase;
}
