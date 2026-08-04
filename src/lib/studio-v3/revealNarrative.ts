/**
 * Deterministic narrative for the Studio V3 final reveal.
 *
 * The reveal used to branch on a single `feeling`, which read the same for
 * travellers who had answered very differently. This module composes the
 * closing narrative from the answers the traveller actually gave, reasoned
 * through the single existing intelligence layer (`deriveStudioIntelligence`
 * → Living Atlas). It is pure, synchronous and testable.
 *
 * Guarantees:
 *   - No invention. Suppliers, stops, timings, inclusions, availability and
 *     prices are never asserted here.
 *   - No runtime AI. Same answers in, same sentences out.
 *   - At most three short reason signals, each covering a distinct idea.
 *   - Personal data (name, contact, notes) never enters this module.
 */

import { deriveStudioIntelligence } from "@/lib/studio-v3/livingAtlasBridge";
import { refinementSummaryLabel } from "@/components/studio-v3/adaptiveQuestions";
import {
  EXPERIENCE_DIMENSIONS,
  type ExperienceDimensionId,
} from "@/components/studio-v3/livingAtlasTaxonomy";
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

/** Kept verbatim — operationally true because the date locks availability. */
export const REVEAL_CONFIRMATION_TAIL =
  "Every moment below is confirmed and yours the second you say yes.";

export interface RevealNarrativeInput {
  readonly feeling: Feeling | null;
  readonly interests: ReadonlyArray<Interest>;
  readonly rhythm: Rhythm | null;
  readonly destinationIntent: DestinationIntent | null;
  readonly refinement: AdaptiveRefinementId | null;
  /** Human region label already resolved by the caller (never invented here). */
  readonly region: string;
  /** Labels of the add-ons the traveller actually selected. */
  readonly addOnLabels?: ReadonlyArray<string>;
}

export interface RevealNarrative {
  /** Opening paragraph of the reveal, including the confirmation tail. */
  readonly intro: string;
  /** Up to three short signals explaining why this day fits this traveller. */
  readonly signals: ReadonlyArray<string>;
}

function openerFor(feeling: Feeling | null, region: string): string {
  switch (feeling) {
    case "wine-food":
      return `Your day in ${region} settles around the table — long lunches, cellars that take their time, nothing rushed.`;
    case "coastal":
    case "adventure":
      return `Your day in ${region} follows the Atlantic light — open roads, sea air, room for the country to breathe.`;
    case "romance":
      return `Your day in ${region} is built for two — soft pacing, quiet corners, the country meeting you gently.`;
    case "hidden":
      return `Your day in ${region} keeps to the quieter roads — small doors, unshowy places, nothing that performs.`;
    case "slow-luxury":
      return `Your day in ${region} moves gently — fewer moments, held longer, nothing asked of you.`;
    case "culture":
      return `Your day in ${region} reads the country through what was built and kept — old stone, old streets, real context.`;
    default:
      return `Your day in ${region} unfolds at its own pace — private, unhurried, shaped around your answers.`;
  }
}

function rhythmClause(rhythm: Rhythm | null): string | null {
  switch (rhythm) {
    case "slow":
      return "Fewer moments, held longer";
    case "full":
      return "A fuller day, with short drives between moments";
    case "immersive":
      return "A long day, sequenced so the driving stays short";
    case "balanced":
      return "An even rhythm, with time to stop when it is worth stopping";
    default:
      return null;
  }
}

function addOnClause(addOnLabels: ReadonlyArray<string>): string | null {
  const first = addOnLabels.find((l) => l.trim().length > 0);
  if (!first) return null;
  return addOnLabels.length > 1
    ? `Your additions are built into the day, starting with the ${first.trim().toLowerCase()}`
    : `The ${first.trim().toLowerCase()} is built into the day, not bolted on`;
}

const MAX_SIGNALS = 3;

/**
 * Compose the closing narrative. Signals are ordered by decision weight:
 * what leads the day → the precision answer that separated two real
 * directions → a second dimension the day also carries → rhythm →
 * chosen additions. Each idea appears at most once.
 */
export function buildRevealNarrative(input: RevealNarrativeInput): RevealNarrative {
  const intelligence = deriveStudioIntelligence({
    feeling: input.feeling,
    interests: input.interests,
    destinationIntent: input.destinationIntent,
    rhythm: input.rhythm,
    refinement: input.refinement,
  });

  const profile = intelligence.profile;
  const leads = profile?.leads ?? [];
  const secondary = (profile?.selected ?? []).filter((d) => !leads.includes(d));

  const signals: string[] = [];
  const seen = new Set<string>();
  const push = (value: string | null | undefined) => {
    if (!value) return;
    const text = value.trim().replace(/\.$/, "");
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (signals.length < MAX_SIGNALS) signals.push(text);
  };

  const leadLabel = leads[0] ? DIMENSION_LABEL.get(leads[0]) : null;
  if (leadLabel) push(`Led by ${leadLabel.toLowerCase()}`);

  push(refinementSummaryLabel(input.refinement));

  const secondLabel = secondary[0] ? DIMENSION_LABEL.get(secondary[0]) : null;
  if (secondLabel) push(`${secondLabel} woven in, without stretching the route`);

  push(rhythmClause(input.rhythm));
  push(addOnClause(input.addOnLabels ?? []));

  return {
    intro: `${openerFor(input.feeling, input.region)} ${REVEAL_CONFIRMATION_TAIL}`,
    signals,
  };
}

export default buildRevealNarrative;
