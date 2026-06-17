// Studio V3 — Fase 4 reveal guard.
//
// Validates that the resolved Signature passed to the cinematic reveal has
// every required field grounded in REAL Signature tour data. If any field
// is missing/invalid we surface a safe fallback in the UI instead of
// rendering a half-empty reveal with placeholder text or a broken hero.
//
// Aligned with the bible / memory rules:
//  - AI never invents stops, photos, titles or routes.
//  - The reveal must always trace back to a real Signature skeleton.
//  - When data is incomplete, prefer an honest fallback over fiction.

import type { ResolvedStudioV3Route } from "./curation";
import type { Tour } from "@/data/signatureTours";

export type RevealValidationFailure =
  | "no-skeleton"
  | "no-stops"
  | "stop-missing-label"
  | "stop-missing-story"
  | "tour-not-found"
  | "tour-missing-image"
  | "tour-missing-title"
  | "missing-suggested-route"
  | "missing-journey-title";

export interface RevealValidationResult {
  ok: boolean;
  missing: RevealValidationFailure[];
  tourId: string | null;
}

/**
 * Validate that the resolved Signature + matched real Tour are complete
 * enough to drive the cinematic reveal. Pure, side-effect free.
 */
export function validateResolvedSignature(
  resolved: Pick<
    ResolvedStudioV3Route,
    | "skeletonTourKey"
    | "routePoints"
    | "suggestedRouteLabel"
    | "journeyTitle"
  >,
  tour: Pick<Tour, "id" | "title" | "img"> | null | undefined,
): RevealValidationResult {
  const missing: RevealValidationFailure[] = [];

  if (!resolved.skeletonTourKey) missing.push("no-skeleton");
  if (!resolved.routePoints || resolved.routePoints.length === 0) {
    missing.push("no-stops");
  } else {
    if (resolved.routePoints.some((p) => !p.label || !p.label.trim())) {
      missing.push("stop-missing-label");
    }
    if (resolved.routePoints.some((p) => !p.story || !p.story.trim())) {
      missing.push("stop-missing-story");
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
    tourId: resolved.skeletonTourKey ?? null,
  };
}
