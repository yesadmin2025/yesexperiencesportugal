import type { DestinationIntent } from "@/components/studio-v3/types";
import {
  LIVING_ATLAS_SIGNATURE_IDS,
  SIGNATURE_DIMENSION_AFFINITY,
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
  validateDecisionProfile,
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

export type LivingAtlasDiscoverySignal = (typeof LIVING_ATLAS_DISCOVERY_SIGNAL_IDS)[number];

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

/**
 * SINGLE SEMANTIC AUTHORITY for "which commercial directions does this
 * destination intent allow?". Diagnostics must read it through
 * `livingAtlasCandidatesForDestination` rather than re-declaring the map.
 */
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

/** Every destination intent the decision engine understands. */
export const LIVING_ATLAS_DESTINATION_INTENTS = Object.keys(
  DESTINATION_CANDIDATES,
) as DestinationIntent[];

/** Read-only candidate set for a destination intent. */
export function livingAtlasCandidatesForDestination(
  intent: DestinationIntent,
): readonly LivingAtlasSignatureId[] {
  return DESTINATION_CANDIDATES[intent] ?? LIVING_ATLAS_SIGNATURE_IDS;
}


export type LivingAtlasDecisionInput = {
  profile: ExperienceProfile;
  /** Explicit destination acts as a hard filter. */
  destinationIntent?: DestinationIntent;
  /** Answer to a contextual question or Precision Fork. */
  discoverySignal?: LivingAtlasDiscoverySignal | null;
  /**
   * BUILD 2 / Pass 4 — EVERY discovery answer the traveller really gave, from
   * canonical question history. Deduped deterministically; `discoverySignal`
   * stays supported as a single-answer compatibility input.
   */
  discoverySignals?: readonly LivingAtlasDiscoverySignal[];
  /**
   * `legacy` (default) enforces the BUILD-0 max-three contract.
   * `full-decision` accepts the uncapped decision profile, so every demanded
   * dimension participates in coverage, evidence and score.
   */
  profileContract?: "legacy" | "full-decision";
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

/**
 * Score window inside which two directions are considered materially tied.
 *
 * A tie is an ambiguity, never a race that array order wins. When more than
 * one candidate sits inside this window and no explicit destination narrowed
 * the field to a single product, the engine refuses to choose and returns a
 * precision fork instead.
 */
export const LIVING_ATLAS_TIE_EPSILON = 8;

export type LivingAtlasDecision = {
  status: "clear" | "precision-fork" | "weak" | "invalid";
  selectedSignatureId: LivingAtlasSignatureId | null;
  ranked: LivingAtlasCandidateReport[];
  forkCandidates: LivingAtlasCandidateReport[];
  validationError?: string;
  /**
   * Diagnostic detail about the top of the ranking. `tiedSignatureIds` lists
   * every candidate within `epsilon` of the leader — length > 1 means the
   * ranking order at the top is presentational only and carries no authority.
   */
  ambiguity: {
    epsilon: number;
    topScore: number | null;
    tiedSignatureIds: LivingAtlasSignatureId[];
    /** What broke the ambiguity, when anything did. */
    resolvedBy: "explicit-destination" | "score-margin" | null;
  };
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
  discoverySignals: readonly LivingAtlasDiscoverySignal[],
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
  totalScore += supportingCoverage.reduce((sum, item) => sum + supportingPoints(item.strength), 0);

  if (leadCoverage.every((item) => item.strength >= 2)) totalScore += 10;
  if (leadCoverage.every((item) => item.strength === 3)) totalScore += 8;

  // Every real discovery answer that targets this direction counts.
  const matchingSignals = discoverySignals.filter(
    (signal) => DISCOVERY_SIGNAL_TARGET[signal] === signatureId,
  );
  totalScore += 80 * matchingSignals.length;

  const missingCoverage = [...leadCoverage, ...supportingCoverage]
    .filter((item) => item.strength === 0)
    .map((item) => item.dimension);

  const evidence = [
    ...leadCoverage.map((item) => `lead:${item.dimension}:${item.strength}`),
    ...supportingCoverage.map((item) => `support:${item.dimension}:${item.strength}`),
    ...matchingSignals.map((signal) => `signal:${signal}`),
  ];

  return {
    signatureId,
    totalScore,
    leadCoverage,
    supportingCoverage,
    missingCoverage,
    evidence,
  };
}


const EMPTY_AMBIGUITY: LivingAtlasDecision["ambiguity"] = {
  epsilon: LIVING_ATLAS_TIE_EPSILON,
  topScore: null,
  tiedSignatureIds: [],
  resolvedBy: null,
};

/**
 * Pure deterministic shortlist for the future Living Atlas flow.
 *
 * It does not evaluate date, duration, mobility, availability or price yet.
 * Those operational hard constraints are applied in the next engine layer.
 *
 * ORDERING CONTRACT: `ranked` is sorted by score, then alphabetically by id.
 * The alphabetical step exists solely so reports and UI lists are stable — it
 * is never semantic authority. `LIVING_ATLAS_SIGNATURE_IDS` array order is
 * deliberately NOT consulted, so no commercial direction can win a tie merely
 * by being declared earlier in the catalogue.
 */
export function decideLivingAtlasSignature(input: LivingAtlasDecisionInput): LivingAtlasDecision {
  const validation =
    input.profileContract === "full-decision"
      ? validateDecisionProfile(input.profile)
      : validateExperienceProfile(input.profile);
  if (!validation.ok) {
    return {
      status: "invalid",
      selectedSignatureId: null,
      ranked: [],
      forkCandidates: [],
      validationError: validation.reason,
      ambiguity: EMPTY_AMBIGUITY,
    };
  }

  const destination = input.destinationIntent ?? "no-preference";
  const allowed = new Set(DESTINATION_CANDIDATES[destination]);
  // Deterministic dedupe, first-seen order. Nothing is invented.
  const signals: LivingAtlasDiscoverySignal[] = [];
  for (const signal of [...(input.discoverySignals ?? []), input.discoverySignal ?? null]) {
    if (signal && !signals.includes(signal)) signals.push(signal);
  }

  const ranked = LIVING_ATLAS_SIGNATURE_IDS.filter((signatureId) => allowed.has(signatureId))
    .map((signatureId) => reportFor(signatureId, validation.profile, signals))

    // Display-only determinism. See ORDERING CONTRACT above.
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.signatureId.localeCompare(b.signatureId);
    });

  const first = ranked[0] ?? null;
  if (!first) {
    return {
      status: "weak",
      selectedSignatureId: null,
      ranked,
      forkCandidates: [],
      ambiguity: EMPTY_AMBIGUITY,
    };
  }

  const nearTied = ranked.filter(
    (candidate) => first.totalScore - candidate.totalScore <= LIVING_ATLAS_TIE_EPSILON,
  );
  const directDestination = allowed.size === 1;
  const ambiguity: LivingAtlasDecision["ambiguity"] = {
    epsilon: LIVING_ATLAS_TIE_EPSILON,
    topScore: first.totalScore,
    tiedSignatureIds: nearTied.map((candidate) => candidate.signatureId),
    resolvedBy: null,
  };

  if (first.totalScore < 0 || first.leadCoverage.some((item) => item.strength === 0)) {
    return {
      status: "weak",
      selectedSignatureId: null,
      ranked,
      forkCandidates: ranked.slice(0, 2),
      ambiguity,
    };
  }

  // A materially tied top is an unresolved question, not a winner. The only
  // thing allowed to settle it without a score margin is an explicit
  // destination that leaves exactly one commercial product standing.
  if (nearTied.length > 1 && !directDestination) {
    return {
      status: "precision-fork",
      selectedSignatureId: null,
      ranked,
      forkCandidates: nearTied.slice(0, 3),
      ambiguity,
    };
  }

  return {
    status: "clear",
    selectedSignatureId: first.signatureId,
    ranked,
    forkCandidates: [],
    ambiguity: {
      ...ambiguity,
      resolvedBy: directDestination && nearTied.length > 1 ? "explicit-destination" : "score-margin",
    },
  };
}

