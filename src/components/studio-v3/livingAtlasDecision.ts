import type { DestinationIntent } from "@/components/studio-v3/types";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  SIGNATURE_DIMENSION_AFFINITY,
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
  validateExperienceProfile,
} from "@/components/studio-v3/livingAtlasTaxonomy";

export const LIVING_ATLAS_DISCOVERY_SIGNAL_IDS = [
  "arrabida-family-wine",
  "arrabida-from-water",
  "arrabida-beach-picnic",
  "paint-azulejo",
  "make-azeitao-cheese",
  "palaces-and-atlantic",
  "comporta-rice-fields",
  "monumental-alentejo",
  "templars-and-university",
  "living-faith-and-coast",
  "roman-talha-family",
  "wild-vicentine-coast",
] as const;

export type LivingAtlasDiscoverySignal =
  (typeof LIVING_ATLAS_DISCOVERY_SIGNAL_IDS)[number];

export const DISCOVERY_SIGNAL_TARGET: Readonly<
  Record<LivingAtlasDiscoverySignal, LivingAtlasSignatureId>
> = {
  "arrabida-family-wine": "arrabida-wine-allinclusive",
  "arrabida-from-water": "arrabida-boat",
  "arrabida-beach-picnic": "wild-beaches-picnic",
  "paint-azulejo": "tiles-workshop",
  "make-azeitao-cheese": "azeitao-cheese",
  "palaces-and-atlantic": "sintra-cascais",
  "comporta-rice-fields": "troia-comporta",
  "monumental-alentejo": "evora-alentejo",
  "templars-and-university": "tomar-coimbra",
  "living-faith-and-coast": "fatima-nazare-obidos",
  "roman-talha-family": "roman-heritage-alentejo",
  "wild-vicentine-coast": "southwest-vicentine-coast",
};

export const DISCOVERY_SIGNAL_BY_SIGNATURE: Readonly<
  Record<LivingAtlasSignatureId, LivingAtlasDiscoverySignal>
> = Object.fromEntries(
  Object.entries(DISCOVERY_SIGNAL_TARGET).map(([signal, signatureId]) => [signatureId, signal]),
) as Record<LivingAtlasSignatureId, LivingAtlasDiscoverySignal>;

const DESTINATION_CANDIDATES: Readonly<
  Record<DestinationIntent, readonly LivingAtlasSignatureId[]>
> = {
  "no-preference": LIVING_ATLAS_SIGNATURE_IDS,
  "anywhere-special": LIVING_ATLAS_SIGNATURE_IDS,
  "lisbon-sintra-cascais": ["sintra-cascais"],
  "arrabida-setubal-azeitao": [
    "arrabida-wine-allinclusive",
    "arrabida-boat",
    "wild-beaches-picnic",
    "tiles-workshop",
    "azeitao-cheese",
  ],
  "alentejo-evora-wine": ["evora-alentejo"],
  "alentejo-roman-talha": ["roman-heritage-alentejo"],
  "vicentine-coast": ["southwest-vicentine-coast"],
  "comporta-troia": ["troia-comporta"],
  "spiritual-coast": ["fatima-nazare-obidos"],
  "central-portugal": ["tomar-coimbra"],
};

export type LivingAtlasDecisionInput = {
  profile: ExperienceProfile;
  /** Explicit destination acts as a hard filter. */
  destinationIntent?: DestinationIntent;
  /** Answer to a contextual question or Precision Fork. */
  discoverySignal?: LivingAtlasDiscoverySignal | null;
};

export type LivingAtlasCandidateReport = {
  signatureId: LivingAtlasSignatureId;
  totalScore: number;
  leadCoverage: Array<{
    dimension: ExperienceDimensionId;
    strength: 0 | 1 | 2 | 3;
  }>;
  supportingCoverage: Array<{
    dimension: ExperienceDimensionId;
    strength: 0 | 1 | 2 | 3;
  }>;
  missingCoverage: ExperienceDimensionId[];
  evidence: string[];
};

export type LivingAtlasDecision = {
  status: "clear" | "precision-fork" | "weak" | "invalid";
  selectedSignatureId: LivingAtlasSignatureId | null;
  ranked: LivingAtlasCandidateReport[];
  forkCandidates: LivingAtlasCandidateReport[];
  validationError?: string;
};

function leadPoints(strength: 0 | 1 | 2 | 3): number {
  if (strength === 3) return 40;
  if (strength === 2) return 24;
  if (strength === 1) return 6;
  return -60;
}

function supportingPoints(strength: 0 | 1 | 2 | 3): number {
  if (strength === 3) return 20;
  if (strength === 2) return 13;
  if (strength === 1) return 4;
  return -18;
}

function reportFor(
  signatureId: LivingAtlasSignatureId,
  profile: ExperienceProfile,
  discoverySignal: LivingAtlasDiscoverySignal | null,
): LivingAtlasCandidateReport {
  const affinity = SIGNATURE_DIMENSION_AFFINITY[signatureId];
  const supporting = profile.selected.filter((dimension) => !profile.leads.includes(dimension));

  const leadCoverage = profile.leads.map((dimension) => ({
    dimension,
    strength: affinity[dimension],
  }));
  const supportingCoverage = supporting.map((dimension) => ({
    dimension,
    strength: affinity[dimension],
  }));

  let totalScore = leadCoverage.reduce((sum, item) => sum + leadPoints(item.strength), 0);
  totalScore += supportingCoverage.reduce(
    (sum, item) => sum + supportingPoints(item.strength),
    0,
  );

  if (leadCoverage.every((item) => item.strength >= 2)) totalScore += 10;
  if (leadCoverage.every((item) => item.strength === 3)) totalScore += 8;

  if (discoverySignal && DISCOVERY_SIGNAL_TARGET[discoverySignal] === signatureId) {
    totalScore += 80;
  }

  const missingCoverage = [...leadCoverage, ...supportingCoverage]
    .filter((item) => item.strength === 0)
    .map((item) => item.dimension);

  const evidence = [
    ...leadCoverage.map((item) => `lead:${item.dimension}:${item.strength}`),
    ...supportingCoverage.map((item) => `support:${item.dimension}:${item.strength}`),
  ];
  if (discoverySignal && DISCOVERY_SIGNAL_TARGET[discoverySignal] === signatureId) {
    evidence.push(`signal:${discoverySignal}`);
  }

  return {
    signatureId,
    totalScore,
    leadCoverage,
    supportingCoverage,
    missingCoverage,
    evidence,
  };
}

/**
 * Pure deterministic shortlist for the future Living Atlas flow.
 *
 * It does not evaluate date, duration, mobility, availability or price yet.
 * Those operational hard constraints are applied in the next engine layer.
 */
export function decideLivingAtlasSignature(
  input: LivingAtlasDecisionInput,
): LivingAtlasDecision {
  const validation = validateExperienceProfile(input.profile);
  if (!validation.ok) {
    return {
      status: "invalid",
      selectedSignatureId: null,
      ranked: [],
      forkCandidates: [],
      validationError: validation.reason,
    };
  }

  const destination = input.destinationIntent ?? "no-preference";
  const allowed = new Set(DESTINATION_CANDIDATES[destination]);
  const signal = input.discoverySignal ?? null;

  const ranked = LIVING_ATLAS_SIGNATURE_IDS.filter((signatureId) => allowed.has(signatureId))
    .map((signatureId) => reportFor(signatureId, validation.profile, signal))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return (
        LIVING_ATLAS_SIGNATURE_IDS.indexOf(a.signatureId) -
        LIVING_ATLAS_SIGNATURE_IDS.indexOf(b.signatureId)
      );
    });

  const first = ranked[0] ?? null;
  const second = ranked[1] ?? null;
  if (!first) {
    return {
      status: "weak",
      selectedSignatureId: null,
      ranked,
      forkCandidates: [],
    };
  }

  if (first.totalScore < 0 || first.leadCoverage.some((item) => item.strength === 0)) {
    return {
      status: "weak",
      selectedSignatureId: null,
      ranked,
      forkCandidates: ranked.slice(0, 2),
    };
  }

  const delta = second ? first.totalScore - second.totalScore : Number.POSITIVE_INFINITY;
  const hasExplicitSignal = Boolean(signal);
  const directDestination = allowed.size === 1;

  if (!hasExplicitSignal && !directDestination && second && delta <= 8) {
    return {
      status: "precision-fork",
      selectedSignatureId: null,
      ranked,
      forkCandidates: ranked.filter(
        (candidate) => first.totalScore - candidate.totalScore <= 8,
      ).slice(0, 3),
    };
  }

  return {
    status: "clear",
    selectedSignatureId: first.signatureId,
    ranked,
    forkCandidates: [],
  };
}
