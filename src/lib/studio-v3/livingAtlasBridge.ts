/**
 * Living Atlas → Studio V3 intelligence bridge.
 *
 * Studio V3 remains the production architecture (phases, Travel File,
 * pricing, checkout). This module is the ONLY place where the Living Atlas
 * reasoning layer is translated into Studio V3 vocabulary, so there is a
 * single integration seam instead of two parallel Studios.
 *
 * Responsibilities:
 *   1. Map Studio V3 answers (feeling + interests) onto the Living Atlas
 *      experience dimensions and derive a valid ExperienceProfile.
 *   2. Run the deterministic Living Atlas decision engine.
 *   3. Return a *preference* (never an override) for the Signature skeleton,
 *      plus customer-facing "why this fits" reasons and genuinely
 *      differentiated alternative directions.
 *
 * Guarantees:
 *   - Pure, deterministic, no I/O, no invention. Every reason is derived
 *     from the traveller's own answers and the Signature's own affinity data.
 *   - Returns null-ish results rather than guessing when the profile is thin.
 *   - Never touches pricing, checkout, Stripe or Supabase.
 */

import {
  decideLivingAtlasSignature,
  type LivingAtlasDecision,
} from "@/components/studio-v3/livingAtlasDecision";
import {
  EXPERIENCE_DIMENSIONS,
  SIGNATURE_DIMENSION_AFFINITY,
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import {
  refinementToDiscoverySignal,
  resolveAdaptiveQuestion,
} from "@/components/studio-v3/adaptiveQuestions";
import type { StudioV3State } from "@/components/studio-v3/types";
import {
  deriveSemanticProfile,
  type StudioSemanticProfile,
} from "@/lib/studio-v3/semanticProfile";
import { projectSemanticProfile } from "@/lib/studio-v3/semanticProfileProjection";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";
import { deriveDirectorAnswerProjection } from "@/lib/studio-v3/directorAnswerProjection";
import type {
  AdaptiveRefinementId,
  DestinationIntent,
  Feeling,
  Interest,
  Rhythm,
} from "@/components/studio-v3/types";

const DIMENSION_LABEL = new Map<ExperienceDimensionId, string>(
  EXPERIENCE_DIMENSIONS.map((d) => [d.id, d.label]),
);

/** Studio V3 interests → Living Atlas dimensions (1:1, no invention). */
const INTEREST_TO_DIMENSION: Readonly<Record<Interest, ExperienceDimensionId>> = {
  wine: "wine-table",
  gastronomy: "wine-table",
  nature: "nature-landscapes",
  coast: "atlantic-coast",
  heritage: "history-heritage",
  photography: "nature-landscapes",
  wellness: "nature-landscapes",
  "local-life": "local-life",
  faith: "faith-reflection",
  "hands-on": "hands-on-traditions",
};

/** Studio V3 feeling → the dimension that should lead the day. */
const FEELING_TO_DIMENSION: Readonly<Record<Feeling, ExperienceDimensionId>> = {
  coastal: "atlantic-coast",
  "wine-food": "wine-table",
  hidden: "local-life",
  romance: "nature-landscapes",
  culture: "history-heritage",
  adventure: "atlantic-coast",
  "slow-luxury": "wine-table",
  faith: "faith-reflection",
  "hands-on": "hands-on-traditions",
};

export type StudioIntelligenceInput = {
  feeling: Feeling | null;
  interests: ReadonlyArray<Interest>;
  destinationIntent?: DestinationIntent | null;
  rhythm?: Rhythm | null;
  /**
   * Answer to the adaptive refinement question, when one was asked. It is
   * translated into a real Living Atlas discovery signal (or ignored when
   * the answer maps to nothing in the catalogue).
   */
  refinement?: AdaptiveRefinementId | null;
  /**
   * BUILD 2 / Pass 4 — the CANONICAL answer store. When present, the
   * discovery signal is derived from it; `refinement` is only read as a
   * legacy fallback for drafts saved before the canonical store existed.
   */
  questionHistory?: readonly QuestionAnswerEvent[];
};

export type StudioDirection = {
  signatureId: LivingAtlasSignatureId;
  /** Dimensions this direction covers strongly (affinity 3). */
  strengths: ExperienceDimensionId[];
  /** Dimensions the traveller asked for that this direction does not carry. */
  gaps: ExperienceDimensionId[];
  /**
   * Dimensions this direction carries strongly that the chosen direction
   * does not. Non-empty by construction — an alternative that adds nothing
   * new is not offered at all.
   */
  distinctStrengths: ExperienceDimensionId[];
  /** One grounded line explaining how this alternative differs. */
  note: string;
};

export type StudioIntelligence = {
  /** Null when the traveller has not given enough to reason safely. */
  profile: ExperienceProfile | null;
  decision: LivingAtlasDecision | null;
  /**
   * Preferred Signature id. Curation may honour it only when the tour is
   * already eligible and competitive — it is a preference, not an override.
   */
  preferredTourId: LivingAtlasSignatureId | null;
  /** Short, grounded "why this direction fits you" lines. Max 3. */
  reasons: string[];
  /** Up to 2 genuinely differentiated alternative directions. */
  alternatives: StudioDirection[];
  /** True when two directions are near-equal and a single question separates them. */
  needsPrecision: boolean;
};

/**
 * BUILD 2 / Pass 4 — the FULL structured semantic profile for these answers.
 *
 * This is the product-authoritative model: every explicit interest survives
 * here, with no top-3 truncation. Five or more interests stay structurally
 * present.
 */
export function buildStudioSemanticProfile(
  input: Pick<StudioIntelligenceInput, "feeling" | "interests"> &
    Partial<Pick<StudioIntelligenceInput, "rhythm" | "destinationIntent">>,
): StudioSemanticProfile {
  return deriveSemanticProfile({
    feeling: input.feeling,
    interests: input.interests,
    rhythm: input.rhythm ?? null,
    destinationIntent: input.destinationIntent ?? null,
  });
}

/**
 * COMPATIBILITY-ONLY projection onto the BUILD-0 Living Atlas
 * `ExperienceProfile` contract, which structurally accepts at most
 * `MAX_SELECTED_DIMENSIONS` dimensions.
 *
 * BUILD 2 / Pass 4: the truncation is no longer implemented here and is no
 * longer a semantic authority. It is delegated to the Pass-1 NO-LOSS
 * projection, which reports every dimension that could not fit instead of
 * silently dropping it. Read `buildStudioSemanticProfile()` (or
 * `projectSemanticProfile().deferred`) for the real, untruncated demand.
 *
 * Returns null when there is nothing to lead the day with.
 */
export function buildExperienceProfile(
  input: Pick<StudioIntelligenceInput, "feeling" | "interests">,
): ExperienceProfile | null {
  return projectSemanticProfile(buildStudioSemanticProfile(input)).legacyCompatibilityProjection;
}


function strongDimensions(signatureId: LivingAtlasSignatureId, profile: ExperienceProfile) {
  const affinity = SIGNATURE_DIMENSION_AFFINITY[signatureId];
  return profile.selected.filter((dimension) => affinity[dimension] === 3);
}

function missingDimensions(signatureId: LivingAtlasSignatureId, profile: ExperienceProfile) {
  const affinity = SIGNATURE_DIMENSION_AFFINITY[signatureId];
  return profile.selected.filter((dimension) => affinity[dimension] === 0);
}

function labelList(dimensions: ExperienceDimensionId[]): string {
  const labels = dimensions.map((d) => (DIMENSION_LABEL.get(d) ?? d).toLowerCase());
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * Compose grounded reasons for the chosen direction. Every line is derived
 * from the traveller's own dimensions and the Signature's affinity data —
 * nothing about suppliers, prices or availability is asserted here.
 */
function composeReasons(
  signatureId: LivingAtlasSignatureId,
  profile: ExperienceProfile,
  rhythm: Rhythm | null | undefined,
): string[] {
  const reasons: string[] = [];
  const leadLabels = labelList(profile.leads);
  if (leadLabels)
    reasons.push(`Built around ${leadLabels} — the part of the day you asked to lead.`);

  const strengths = strongDimensions(signatureId, profile).filter(
    (dimension) => !profile.leads.includes(dimension),
  );
  if (strengths.length > 0) {
    reasons.push(`It also carries ${labelList(strengths)} without stretching the route.`);
  }

  if (rhythm === "slow") {
    reasons.push("Fewer moments, held longer — the unhurried version of this region.");
  } else if (rhythm === "full" || rhythm === "immersive") {
    reasons.push("A fuller day, sequenced so the driving stays short between moments.");
  }

  return reasons.slice(0, 3);
}

/**
 * Canonical history is the authority. The legacy `refinement` field is a
 * fallback only, so an old draft still resolves to the same direction.
 */
function canonicalDiscoverySignals(input: StudioIntelligenceInput) {
  const derived = deriveDirectorAnswerProjection(input.questionHistory ?? []);
  if (derived.selectedDiscoverySignals.length > 0) return derived.selectedDiscoverySignals;
  const legacy = refinementToDiscoverySignal(input.refinement);
  return legacy ? [legacy] : [];
}

export function deriveStudioIntelligence(input: StudioIntelligenceInput): StudioIntelligence {
  // BUILD 2 / Pass 4 — the UNCAPPED decision profile is the scoring
  // authority. The legacy top-3 projection is only a display fallback.
  const projection = projectSemanticProfile(buildStudioSemanticProfile(input));
  const profile = projection.fullDecisionProfile ?? projection.legacyCompatibilityProjection;
  if (!profile) {
    return {
      profile: null,
      decision: null,
      preferredTourId: null,
      reasons: [],
      alternatives: [],
      needsPrecision: false,
    };
  }

  const decision = decideLivingAtlasSignature({
    profile,
    destinationIntent: input.destinationIntent ?? "no-preference",
    discoverySignals: canonicalDiscoverySignals(input),
    profileContract: "full-decision",
  });

  const ranked = decision.ranked;
  const chosen =
    decision.selectedSignatureId ??
    decision.forkCandidates[0]?.signatureId ??
    ranked[0]?.signatureId ??
    null;

  // Alternatives are only offered when they are genuinely differentiated:
  // each must carry, strongly, at least one dimension the chosen direction
  // does not. Near-duplicates of the chosen day are dropped rather than
  // padded out to a fixed count.
  const chosenStrengths = chosen ? strongDimensions(chosen, profile) : [];
  const alternatives: StudioDirection[] = [];
  for (const candidate of ranked) {
    if (alternatives.length >= 2) break;
    if (candidate.signatureId === chosen) continue;
    const strengths = strongDimensions(candidate.signatureId, profile);
    const distinctStrengths = strengths.filter((d) => !chosenStrengths.includes(d));
    if (distinctStrengths.length === 0) continue;
    if (alternatives.some((a) => a.distinctStrengths.join("|") === distinctStrengths.join("|"))) {
      continue;
    }
    const gaps = missingDimensions(candidate.signatureId, profile);
    const note = gaps.length
      ? `Leans further into ${labelList(distinctStrengths)}, with less ${labelList(gaps)}.`
      : `Leans further into ${labelList(distinctStrengths)}.`;
    alternatives.push({
      signatureId: candidate.signatureId,
      strengths,
      gaps,
      distinctStrengths,
      note,
    });
  }

  return {
    profile,
    decision,
    // Only a "clear" decision becomes a curation preference. A precision
    // fork means the engine is genuinely undecided — Studio V3 keeps its own
    // scoring in that case rather than guessing.
    preferredTourId: decision.status === "clear" ? decision.selectedSignatureId : null,
    reasons: chosen ? composeReasons(chosen, profile, input.rhythm ?? null) : [],
    alternatives,
    needsPrecision: decision.status === "precision-fork",
  };
}

/**
 * Decision-value gate for the single adaptive refinement question.
 *
 * The question is worth a screen only when the answer can actually move the
 * recommendation. Two cases qualify:
 *   1. Living Atlas reports a genuine precision fork — two directions are
 *      near-equal and one question settles them elegantly;
 *   2. at least one available answer changes the direction the engine would
 *      otherwise recommend.
 *
 * Anything already safely inferable from the traveller's earlier answers is
 * not asked. Pure and deterministic; no I/O, no state mutation.
 */
export function adaptiveQuestionAddsValue(state: StudioV3State): boolean {
  const question = resolveAdaptiveQuestion(state);
  if (!question) return false;

  const base = deriveStudioIntelligence({
    feeling: state.feeling,
    interests: state.interests,
    destinationIntent: state.destinationIntent,
    rhythm: state.rhythm,
    refinement: null,
  });
  if (base.needsPrecision) return true;

  const baseline = base.preferredTourId ?? base.decision?.ranked[0]?.signatureId ?? null;
  return question.options.some((option) => {
    const withAnswer = deriveStudioIntelligence({
      feeling: state.feeling,
      interests: state.interests,
      destinationIntent: state.destinationIntent,
      rhythm: state.rhythm,
      refinement: option.id,
    });
    const settled =
      withAnswer.preferredTourId ?? withAnswer.decision?.ranked[0]?.signatureId ?? null;
    return settled !== baseline;
  });
}
