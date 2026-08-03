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
  MAX_LEAD_DIMENSIONS,
  MAX_SELECTED_DIMENSIONS,
  SIGNATURE_DIMENSION_AFFINITY,
  type ExperienceDimensionId,
  type ExperienceProfile,
  type LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
import type { DestinationIntent, Feeling, Interest, Rhythm } from "@/components/studio-v3/types";

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
};

export type StudioIntelligenceInput = {
  feeling: Feeling | null;
  interests: ReadonlyArray<Interest>;
  destinationIntent?: DestinationIntent | null;
  rhythm?: Rhythm | null;
};

export type StudioDirection = {
  signatureId: LivingAtlasSignatureId;
  /** Dimensions this direction covers strongly (affinity 3). */
  strengths: ExperienceDimensionId[];
  /** Dimensions the traveller asked for that this direction does not carry. */
  gaps: ExperienceDimensionId[];
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
 * Build a Living Atlas ExperienceProfile from Studio V3 answers.
 * Returns null when there is nothing to lead the day with.
 */
export function buildExperienceProfile(
  input: Pick<StudioIntelligenceInput, "feeling" | "interests">,
): ExperienceProfile | null {
  const lead = input.feeling ? FEELING_TO_DIMENSION[input.feeling] : null;

  const fromInterests: ExperienceDimensionId[] = [];
  for (const interest of input.interests) {
    const dimension = INTEREST_TO_DIMENSION[interest];
    if (dimension && !fromInterests.includes(dimension)) fromInterests.push(dimension);
  }

  const selected: ExperienceDimensionId[] = [];
  if (lead) selected.push(lead);
  for (const dimension of fromInterests) {
    if (selected.length >= MAX_SELECTED_DIMENSIONS) break;
    if (!selected.includes(dimension)) selected.push(dimension);
  }

  if (selected.length === 0) return null;

  // The feeling leads. Without a feeling, the first interest leads.
  const leads = (lead ? [lead] : selected.slice(0, 1)).slice(0, MAX_LEAD_DIMENSIONS);
  return { selected, leads };
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

export function deriveStudioIntelligence(input: StudioIntelligenceInput): StudioIntelligence {
  const profile = buildExperienceProfile(input);
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
  });

  const ranked = decision.ranked;
  const chosen =
    decision.selectedSignatureId ??
    decision.forkCandidates[0]?.signatureId ??
    ranked[0]?.signatureId ??
    null;

  const alternatives: StudioDirection[] = ranked
    .filter((candidate) => candidate.signatureId !== chosen)
    .slice(0, 2)
    .map((candidate) => ({
      signatureId: candidate.signatureId,
      strengths: strongDimensions(candidate.signatureId, profile),
      gaps: missingDimensions(candidate.signatureId, profile),
    }));

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
