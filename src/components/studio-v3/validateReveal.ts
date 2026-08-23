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
import type { SignatureTour } from "@/data/signatureTours";

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
    "skeletonTourKey" | "routePoints" | "suggestedRouteLabel" | "journeyTitle"
  >,
  tour: Pick<SignatureTour, "id" | "title" | "img"> | null | undefined,
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
      // Studio reform (2026-08): a missing hero image is a PRESENTATION
      // problem, never a reason to withhold the reveal. The reveal renders
      // text-first; imagery is progressive enhancement. We still report the
      // gap so telemetry can flag it, but it no longer sets `ok: false`.
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

  // Non-blocking failures: cosmetic gaps that must never suppress a reveal
  // whose narrative content is complete and true.
  const NON_BLOCKING: ReadonlySet<RevealValidationFailure> = new Set(["tour-missing-image"]);

  return {
    ok: missing.every((m) => NON_BLOCKING.has(m)),
    missing,
    tourId: resolved.skeletonTourKey ?? null,
  };
}

