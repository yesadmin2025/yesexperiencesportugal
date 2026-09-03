/** Exact structural obligations created by concrete Director answers. */
import type { LivingAtlasDiscoverySignal } from "@/components/studio-v3/livingAtlasDecision";
import type { LivingAtlasSignatureId } from "@/components/studio-v3/livingAtlasTaxonomy";
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

export function exactDirectorObligations(
  history: readonly QuestionAnswerEvent[] = [],
): ExactDirectorObligations {
  const projection = deriveDirectorAnswerProjection(history);
  const principalStopIds = projection.selectedDiscoverySignals
    .map((signal) => EXACT_STOP_BY_SIGNAL[signal] ?? null)
    .filter((stopId): stopId is string => Boolean(stopId));

  return {
    preferredSignatureId: projection.selectedDirectionIds.at(-1) ?? null,
    principalStopIds: [...new Set(principalStopIds)],
  };
}