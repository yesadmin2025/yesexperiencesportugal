/** Exact structural obligations created by concrete Director answers. */
import type { LivingAtlasDiscoverySignal } from "@/components/studio-v3/livingAtlasDecision";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import { REGION_STOP_POOL } from "@/data/regionStopPool";
import { deriveDirectorAnswerProjection } from "@/lib/studio-v3/directorAnswerProjection";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";

const EXACT_STOP_BY_SIGNAL: Partial<Record<LivingAtlasDiscoverySignal, string>> = {
  "make-azeitao-cheese": "quinta-velha-cheese-workshop",
  "paint-azulejo": "azulejos-painting-workshop",
};

export type ExactDirectorObligations = {
  preferredSignatureId: LivingAtlasSignatureId | null;
  principalStopIds: readonly string[];
};

function isLivingAtlasSignature(id: string | null | undefined): id is LivingAtlasSignatureId {
  return Boolean(id) && (LIVING_ATLAS_SIGNATURE_IDS as readonly string[]).includes(id as string);
}

/**
 * The Signature that STRUCTURALLY owns an exact obligation stop, read from the
 * canonical stop pool (never invented, never hardcoded per answer). An exact
 * "make cheese" / "paint a tile" answer can only be honoured inside a
 * Signature whose own pool contains that moment — anchoring anywhere else
 * makes the composition structurally impossible and silently drops the choice.
 */
function owningSignatureForStop(stopId: string): LivingAtlasSignatureId | null {
  const stop = REGION_STOP_POOL.find((item) => item.id === stopId);
  if (!stop) return null;
  if (isLivingAtlasSignature(stop.signatureTourId)) return stop.signatureTourId;
  const sourced = (stop.sourceTourIds ?? []).find(isLivingAtlasSignature);
  return sourced ?? null;
}

export function exactDirectorObligations(
  history: readonly QuestionAnswerEvent[] = [],
): ExactDirectorObligations {
  const projection = deriveDirectorAnswerProjection(history);
  const principalStopIds = [
    ...new Set(
      projection.selectedDiscoverySignals
        .map((signal) => EXACT_STOP_BY_SIGNAL[signal] ?? null)
        .filter((stopId): stopId is string => Boolean(stopId)),
    ),
  ];

  // An exact moment obligation outranks a later, broader direction answer:
  // the anchor must be a Signature that can actually contain what was chosen.
  const obligationSignature =
    principalStopIds.map(owningSignatureForStop).find((id): id is LivingAtlasSignatureId =>
      Boolean(id),
    ) ?? null;

  const lastDirection = projection.selectedDirectionIds.at(-1) ?? null;

  return {
    preferredSignatureId: obligationSignature ?? lastDirection,
    principalStopIds,
  };
}