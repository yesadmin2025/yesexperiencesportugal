/**
 * FINAL QA CLOSURE — live-surface proofs for the YOUR DAY culmination.
 *
 * These assert against the LIVE Studio source (not a synthetic fixture) so
 * they fail the moment the reveal, its route authority, its media authority
 * or its checkout seam drifts.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CTA_MAKE_IT_REAL } from "@/content/signature-day-copy";
import { YOUR_DAY_EYEBROW } from "@/components/studio-v3/YourDayFrame";

const STUDIO = readFileSync("src/components/studio-v3/StudioV3.tsx", "utf8");

describe("1 — the final reveal is YOUR DAY with one dominant reserve action", () => {
  it("frames the reveal with the shared Your Day label", () => {
    expect(YOUR_DAY_EYEBROW.toLowerCase()).toBe("your day");
    expect(STUDIO).toContain("<YourDayFrame");
  });

  it("renders exactly one primary CTA, and it is Make it real", () => {
    expect(CTA_MAKE_IT_REAL).toBe("Make it real");
    expect(STUDIO.split('data-testid="studio-v3-handoff-primary"').length - 1).toBe(1);
    expect(STUDIO).toContain("{CTA_MAKE_IT_REAL}");
    expect(STUDIO).toContain('data-testid="studio-v3-handoff-primary"');
  });

  it("keeps the edit affordance visually subordinate, never a second primary", () => {
    expect(STUDIO).toContain('data-testid="studio-v3-your-day-edit"');
    expect(STUDIO).toContain("Edit your day");
  });

  it("never uses recommendation, AI, match or confidence framing in the reveal", () => {
    expect(STUDIO).not.toContain("Our recommended itinerary");
    expect(STUDIO).not.toContain("match %");
    expect(STUDIO).not.toMatch(/Question \d+ of/);
  });
});

describe("2 — an unresolved composition can never start checkout", () => {
  it("gates the CTA and fails closed before the checkout call", () => {
    expect(STUDIO).toContain("disabled={!canReserve}");
    expect(STUDIO).toContain("if (checkoutStops.length < 2) {");
    expect(STUDIO).toContain("returnToPreflight(");
    expect(STUDIO).toContain('data-testid="studio-v3-reserve-review-path"');
  });
});

describe("3 — route membership comes from the authoritative route state", () => {
  it("resolves checkout stops from edited/composed route authority, not the Canvas", () => {
    expect(STUDIO).toContain("resolveAuthoritativeRouteStops({");
    expect(STUDIO).toContain("editedRoutePoints: currentState.editedRoutePoints ?? null");
    expect(STUDIO).toContain("const checkoutResolved = resolveStudioRouteFromState(currentState);");
    expect(STUDIO).toContain("resolved: checkoutResolved,");
  });
});

describe("4 — the reveal reuses the Canvas media identities", () => {
  it("projects the derived canvas model instead of resolving new imagery", () => {
    expect(STUDIO).toContain("resolveYourDayVisuals");
    expect(STUDIO).toContain("canvasModel={livingCanvas}");
    expect(STUDIO).toContain("data-media-id={yourDayVisuals.backdrop.id}");
  });
});

describe("5 — studio_checkout_started fires only at the real valid seam", () => {
  it("is emitted once, after the fail-closed guard", () => {
    const occurrences = STUDIO.split('trackStudio("studio_checkout_started"').length - 1;
    expect(occurrences).toBe(1);
    const guard = STUDIO.indexOf("if (checkoutStops.length < 2) {");
    const event = STUDIO.indexOf('trackStudio("studio_checkout_started"');
    expect(guard).toBeGreaterThan(-1);
    expect(event).toBeGreaterThan(guard);
  });

  it("emits the reveal + candidate seams exactly once each, guarded against rerenders", () => {
    expect(STUDIO.split('trackStudio("studio_final_skeleton"').length - 1).toBe(1);
    expect(STUDIO.split('trackStudio("studio_signature_candidate"').length - 1).toBe(1);
    expect(STUDIO).toContain("finalSkeletonRef.current");
    expect(STUDIO).toContain("signatureCandidateRef.current");
  });
});

describe("6 — the presentation adapter remains the live question seam", () => {
  it("the live Studio still adapts Director questions rather than hand-rolling copy", () => {
    expect(STUDIO).toContain("adaptDirectorQuestion");
    expect(STUDIO).toContain("directorQuestion?.offeredOptionIds.includes(choiceKey)");
  });
});
