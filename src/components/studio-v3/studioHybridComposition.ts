/**
 * studioHybridComposition — bridge between the verified hybrid moment
 * composer (`composeLivingAtlasDay`) and the PRODUCTION Studio V3 route
 * authority (`resolveStudioV3Route` → `composedRoutePoints`).
 *
 * Why this exists: the Studio must not behave as fixed-tour selection. The
 * Signature remains the pricing / geographic / operational anchor, but the
 * traveller's selected dimensions are coverage obligations. When the anchor
 * skeleton does not cover a dimension the traveller explicitly asked for,
 * this layer pulls a REAL, region-contained, verified moment from the
 * composer and inserts it into the authored route.
 *
 * Hard guarantees (all locked contracts preserved):
 *  - Purely ADDITIVE: never removes, never reorders existing moments.
 *  - Never exceeds the rhythm stop target (`maxPoints`), so rhythm counts
 *    remain authoritative.
 *  - Only moments the composer returns for the SAME anchor Signature and
 *    the same region/route cluster — no cross-region invention.
 *  - Operationally closed stops for the chosen date are never inserted.
 *  - Wineries are only eligible with explicit wine intent.
 *  - Pure and deterministic: no pricing, no add-ons, no persistence, no I/O.
 */

import { isStopClosedOn } from "@/data/stopOperational";
import { deriveLivingAtlasDimensions } from "@/components/studio-v3/livingAtlasInventory";
import { composeLivingAtlasDay } from "@/components/studio-v3/livingAtlasComposer";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  type ExperienceDimensionId,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import { buildExperienceProfile } from "@/lib/studio-v3/livingAtlasBridge";
import type { ResolvedRoutePoint } from "@/components/studio-v3/curation";
import type { Feeling, Interest, Rhythm } from "@/components/studio-v3/types";

export interface HybridCompositionInput {
  /** Internal Signature anchor id (pricing / geography). Never shown. */
  skeletonTourId: string | null | undefined;
  feeling: Feeling | null;
  interests: ReadonlyArray<Interest>;
  rhythm: Rhythm;
  /** Explicit wine intent — gates winery moments. */
  wineIntent?: boolean;
  /** ISO yyyy-mm-dd — keeps operationally closed moments out. */
  dateExact?: string | null;
  /** Hard upper bound on route length (rhythm stop target). */
  maxPoints: number;
}

function isLivingAtlasSignatureId(id: string): id is LivingAtlasSignatureId {
  return (LIVING_ATLAS_SIGNATURE_IDS as ReadonlyArray<string>).includes(id);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function densityForRhythm(rhythm: Rhythm): "slow" | "balanced" | "rich" {
  if (rhythm === "slow") return "slow";
  if (rhythm === "balanced") return "balanced";
  return "rich";
}

/** Dimensions already carried by the authored route. */
function coveredDimensions(
  points: ReadonlyArray<ResolvedRoutePoint>,
): Set<ExperienceDimensionId> {
  const covered = new Set<ExperienceDimensionId>();
  for (const point of points) {
    for (const dimension of deriveLivingAtlasDimensions({ label: point.label })) {
      covered.add(dimension);
    }
    for (const dimension of deriveLivingAtlasDimensions({ label: point.story })) {
      covered.add(dimension);
    }
  }
  return covered;
}

/**
 * Insert verified composer moments that cover dimensions the anchor route
 * does not already carry. Returns a NEW array; input is never mutated.
 */
export function applyHybridComposition(
  points: ReadonlyArray<ResolvedRoutePoint>,
  input: HybridCompositionInput,
): ResolvedRoutePoint[] {
  const out = points.map((p) => ({ ...p }));
  if (out.length === 0) return out;
  if (out.length >= input.maxPoints) return out;

  const anchorId = input.skeletonTourId ?? null;
  if (!anchorId || !isLivingAtlasSignatureId(anchorId)) return out;

  const profile = buildExperienceProfile({
    feeling: input.feeling,
    interests: input.interests,
  });
  if (!profile) return out;

  const covered = coveredDimensions(out);
  const missing = profile.selected.filter((dimension) => !covered.has(dimension));
  if (missing.length === 0) return out;

  const composition = composeLivingAtlasDay({
    anchorSignatureId: anchorId,
    profile,
    density: densityForRhythm(input.rhythm),
    excludedTypes: input.wineIntent ? [] : ["winery"],
  });
  if (composition.status === "invalid" || composition.moments.length === 0) return out;

  const usedLabels = new Set(out.map((p) => normalize(p.label)));

  for (const dimension of missing) {
    if (out.length >= input.maxPoints) break;

    const moment = composition.moments.find((candidate) => {
      if (!candidate.dimensions.includes(dimension)) return false;
      if (usedLabels.has(normalize(candidate.label))) return false;
      if (isStopClosedOn(candidate.label, input.dateExact ?? null)) return false;
      return true;
    });
    if (!moment) continue;

    usedLabels.add(normalize(moment.label));
    const insertAt = Math.min(2, out.length);
    out.splice(insertAt, 0, {
      index: insertAt,
      label: moment.label,
      story: "",
      lat: null,
      lng: null,
    });
  }

  return out.slice(0, input.maxPoints).map((p, i) => ({ ...p, index: i }));
}
