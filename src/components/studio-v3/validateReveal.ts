// Studio V3 — Fase 4 reveal guard.
//
// Validates that the resolved Signature passed to the cinematic reveal has
// every REQUIRED field grounded in real Signature tour data. If any hard
// requirement is missing we surface a safe fallback in the UI instead of
// rendering a half-empty reveal with placeholder text or a broken hero.
//
// Aligned with the bible / memory rules:
//  - AI never invents stops, photos, titles or routes.
//  - The reveal must always trace back to a real Signature skeleton.
//  - When the CORE data is present, per-stop enrichment (`story`) is
//    optional — the map + timeline read from `label` alone. Missing story
//    on some stops is a WARNING, not a hard fail, so the reveal doesn't
//    fall back to "needs a human touch" on Signatures whose real stop
//    descriptions live only on the detail page.

import type { ResolvedStudioV3Route } from "./curation";
import type { SignatureTour } from "@/data/signatureTours";

export type RevealValidationFailure =
  | "no-skeleton"
  | "no-stops"
  | "no-labelled-stops"
  | "tour-not-found"
  | "tour-missing-image"
  | "tour-missing-title"
  | "missing-suggested-route"
  | "missing-journey-title";

export type RevealValidationWarning = "some-stops-missing-label" | "some-stops-missing-story";

export interface RevealValidationResult {
  ok: boolean;
  missing: RevealValidationFailure[];
  warnings: RevealValidationWarning[];
  tourId: string | null;
}

/**
 * Validate that the resolved Signature + matched real Tour are complete
 * enough to drive the cinematic reveal. Pure, side-effect free.
 *
 * HARD requirements (block reveal):
 *   - matched skeleton tour key + tour object with image + title
 *   - ≥1 route point, at least one with a non-empty label
 *   - suggestedRouteLabel and journeyTitle
 *
 * SOFT requirements (warnings only, reveal still renders):
 *   - all route points have non-empty labels
 *   - all route points have non-empty stories
 */
export function validateResolvedSignature(
  resolved: Pick<
    ResolvedStudioV3Route,
    "skeletonTourKey" | "routePoints" | "suggestedRouteLabel" | "journeyTitle"
  >,
  tour: Pick<SignatureTour, "id" | "title" | "img"> | null | undefined,
): RevealValidationResult {
  const missing: RevealValidationFailure[] = [];
  const warnings: RevealValidationWarning[] = [];

  if (!resolved.skeletonTourKey) missing.push("no-skeleton");

  const points = resolved.routePoints ?? [];
  if (points.length === 0) {
    missing.push("no-stops");
  } else {
    const labelled = points.filter((p) => p.label && p.label.trim());
    if (labelled.length === 0) {
      missing.push("no-labelled-stops");
    } else if (labelled.length < points.length) {
      warnings.push("some-stops-missing-label");
    }
    if (points.some((p) => !p.story || !p.story.trim())) {
      warnings.push("some-stops-missing-story");
    }
  }

  if (resolved.skeletonTourKey) {
    if (!tour) {
      missing.push("tour-not-found");
    } else {
      if (!tour.img || !tour.img.trim()) missing.push("tour-missing-image");
      if (!tour.title || !tour.title.trim()) missing.push("tour-missing-title");
    }
  }

  if (!resolved.suggestedRouteLabel || !resolved.suggestedRouteLabel.trim()) {
    missing.push("missing-suggested-route");
  }
  if (!resolved.journeyTitle || !resolved.journeyTitle.trim()) {
    missing.push("missing-journey-title");
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    tourId: resolved.skeletonTourKey ?? null,
  };
}
