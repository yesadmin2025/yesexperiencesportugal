/**
 * BUILD 0 — capability matrix truth tests.
 *
 * These assert that the matrix reports the repository as it actually is. They
 * deliberately do NOT assert that everything is green.
 */

import { describe, expect, it } from "vitest";
import {
  buildCapabilityMatrix,
  capabilityForDirection,
} from "@/lib/studio-v3/capabilityMatrix";
import { LIVING_ATLAS_SIGNATURE_IDS } from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  canEmitRefinementSequentially,
  verifySequentialPath,
} from "@/lib/studio-v3/publicRefinementPaths";
import { livingAtlasCandidatesForDestination } from "@/components/studio-v3/livingAtlasDecision";

describe("studio capability matrix", () => {
  const report = buildCapabilityMatrix();

  it("covers all twelve commercial directions exactly once", () => {
    expect(report.directions).toHaveLength(12);
    expect(report.directions.map((d) => d.signatureId).sort()).toEqual(
      [...LIVING_ATLAS_SIGNATURE_IDS].sort(),
    );
  });

  it("is pure — two runs produce identical output", () => {
    expect(JSON.stringify(buildCapabilityMatrix())).toEqual(JSON.stringify(report));
  });

  it("has no blocking capability failures", () => {
    expect(report.summary.blockers.map((b) => b.code)).toEqual([]);
    expect(report.summary.red).toBe(0);
  });

  it("every direction has taxonomy affinity and a discovery door", () => {
    for (const direction of report.directions) {
      expect(direction.taxonomy.hasAffinityRow).toBe(true);
      expect(direction.taxonomy.hasDiscoveryDoor).toBe(true);
      expect(direction.taxonomy.leads.length).toBeGreaterThan(0);
    }
  });

  it("every direction has a discovery signal AND a public path to emit it", () => {
    for (const direction of report.directions) {
      expect(direction.signals.discoverySignal).not.toBeNull();
      expect(direction.signals.hasPublicSignalPath).toBe(true);
    }
  });

  it("hasPublicSignalPath means actually emittable, with a stored example path", () => {
    for (const direction of report.directions) {
      expect(direction.signals.hasPublicSignalPath).toBe(true);
      const example = direction.signals.examplePublicPath;
      expect(example).not.toBeNull();
      // The stored example must survive re-verification against the real
      // SEQUENTIAL director path, not just against a static mapping.
      expect(example!.steps.length).toBeGreaterThan(0);
      expect(verifySequentialPath(example!)).toBe(true);
      const last = example!.steps[example!.steps.length - 1];
      expect(last.selectedRefinement).toBe(example!.refinement);
      expect(last.offeredChoiceKeys).toContain(example!.refinement);
      expect(canEmitRefinementSequentially(example!.base, example!.refinement)).toBe(true);
      expect(direction.signals.publicRefinements).toContain(example!.refinement);
    }
  });

  it("reads destination candidates from the single decision-module authority", () => {
    for (const direction of report.directions) {
      for (const intent of direction.paths.destinationIntents) {
        expect(livingAtlasCandidatesForDestination(intent)).toContain(direction.signatureId);
      }
      for (const intent of direction.paths.explicitDestinationIntents) {
        expect(livingAtlasCandidatesForDestination(intent)).toEqual([direction.signatureId]);
      }
    }
  });

  it("every direction has real stop inventory and a commercial record", () => {
    for (const direction of report.directions) {
      expect(direction.inventory.activeStopCount).toBeGreaterThan(0);
      expect(direction.commercial.hasTourRecord).toBe(true);
      expect(direction.commercial.hasPriceFrom).toBe(true);
      expect(direction.commercial.resolvesPerPaxAtTwo).toBe(true);
    }
  });

  it("every direction is hybrid-composition eligible", () => {
    for (const direction of report.directions) {
      expect(direction.hybrid.eligible).toBe(true);
    }
  });

  it("every direction has duration truth and a hero image", () => {
    for (const direction of report.directions) {
      expect(direction.duration.hasDurationTruth).toBe(true);
      expect(direction.media.hasHeroImage).toBe(true);
    }
  });

  it("reports coordinate coverage honestly rather than assuming it", () => {
    for (const direction of report.directions) {
      expect(direction.coordinates.coveragePct).toBeGreaterThanOrEqual(0);
      expect(direction.coordinates.coveragePct).toBeLessThanOrEqual(100);
      // Every direction must have at least some resolvable geography.
      expect(
        direction.coordinates.poolStopsWithCoords + direction.coordinates.tourStopsResolvable,
      ).toBeGreaterThan(0);
    }
  });

  it("flags the legacy seed region mismatches instead of hiding them", () => {
    const mismatched = report.directions
      .filter((d) => d.inventory.regionMismatch)
      .map((d) => d.signatureId);
    // Known legacy mislabelling in signatureTours.ts seed data.
    expect(mismatched).toContain("tomar-coimbra");
    expect(mismatched).toContain("fatima-nazare-obidos");
  });

  it("only single-product destination intents count as explicit paths", () => {
    const evora = capabilityForDirection("evora-alentejo");
    expect(evora.paths.explicitDestinationIntents).toContain("alentejo-evora-wine");

    const boat = capabilityForDirection("arrabida-boat");
    // The Arrábida intent covers five products, so it is not explicit.
    expect(boat.paths.destinationIntents).toContain("arrabida-setubal-azeitao");
    expect(boat.paths.hasExplicitDestinationPath).toBe(false);
  });
});
