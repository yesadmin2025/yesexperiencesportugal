/**
 * BUILD 2 — Pass 1. PURE DERIVED semantic profile.
 *
 * `StudioSemanticProfile` is derived, never persisted. It is the no-loss
 * semantic model BUILD 2 will reason over: every explicit traveller interest
 * survives here, even when a downstream compatibility projection can only
 * carry three dimensions.
 *
 * Pure, deterministic, no I/O, no AI, no mutation. Nothing in this module is
 * wired into the live Studio flow in Pass 1.
 */

import type {
  Companions,
  DestinationIntent,
  Feeling,
  Interest,
  Occasion,
  Rhythm,
} from "@/components/studio-v3/types";
import type { TravellerDurationClass } from "@/lib/studio-v3/timeDomain";
import type { QuestionAnswerEvent } from "@/lib/studio-v3/questionHistory";
import {
  DECLARED_PRIORITY_AUTHORITY,
  PROVENANCE_AUTHORITY,
  SEMANTIC_DOMAIN_PRECEDENCE,
  isExplicitExclusionProvenance,
  keepKnownSemanticEvents,
  semanticKeyOfEvent,
  type SemanticDomain,
  type SemanticKey,
  type SemanticPolarity,
  type SemanticProvenance,
  type SemanticSourceEvent,
  type SemanticValue,
  type SemanticValueByDomain,
} from "@/lib/studio-v3/semanticSourceEvents";

/** Structural, minimal canonical input. Deliberately NOT full `StudioV3State`. */
export type SemanticProfileInput = {
  feeling: Feeling | null;
  /** ALL explicit interests. Collection order is UX-only, never authority. */
  interests: readonly Interest[];
  rhythm?: Rhythm | null;
  destinationIntent?: DestinationIntent | null;
  companions?: Companions | null;
  occasion?: Occasion | null;
  experienceDurationClass?: TravellerDurationClass | null;
  /** Interests the traveller explicitly declared as leads / priorities. */
  priorityInterests?: readonly Interest[];
  /** Inert semantic source events (free text, inference, AI, rejections). */
  events?: readonly SemanticSourceEvent[];
  /** Optional question history; its semantic effects are folded in. */
  history?: readonly QuestionAnswerEvent[];
};

export type SemanticSignal = {
  key: SemanticKey;
  domain: SemanticDomain;
  value: SemanticValue;
  polarity: SemanticPolarity;
  provenance: SemanticProvenance;
  /** Lower = stronger. See PROVENANCE_AUTHORITY / DECLARED_PRIORITY_AUTHORITY. */
  authority: number;
  confidence: number;
  declaredPriority: boolean;
  /** Set when a rejection defeated this positive signal. */
  defeatedByExclusion?: boolean;
};

export type StudioSemanticProfile = {
  /** Every explicit, non-excluded interest signal, ranked by authority. */
  contentInterests: SemanticSignal[];
  /**
   * Interests the traveller EXPLICITLY declared as priorities. Nothing is
   * inferred here — a feeling never silently becomes a lead interest.
   */
  leadInterests: SemanticSignal[];
  /** Everything else that must still be honoured. */
  supportingInterests: SemanticSignal[];
  /** Rhythm / duration style preferences. */
  stylePreferences: SemanticSignal[];
  socialContext: SemanticSignal | null;
  occasion: SemanticSignal | null;
  durationPreference: SemanticSignal | null;
  destinationIntent: SemanticSignal | null;
  /**
   * EXPLICIT exclusions only (rejection / explicit UI / explicit free text).
   * Weak AI or deterministic negatives are NOT listed here; they remain in
   * `semanticSignals` with their own weak authority.
   */
  explicitExclusions: SemanticSignal[];
  /** The complete signal set, including defeated positives, ranked. */
  semanticSignals: SemanticSignal[];
  /**
   * Interest collection order, retained for UX / legacy-compatibility
   * projection ONLY. It carries no semantic authority.
   */
  interestOrderForCompatibility: Interest[];
  /** The feeling, when given. Leads the day in the compatibility projection. */
  feeling: Feeling | null;
};

function signalFromEvent(event: SemanticSourceEvent): SemanticSignal {
  const declaredPriority = event.declaredPriority === true;
  const base = PROVENANCE_AUTHORITY[event.provenance];
  return {
    key: semanticKeyOfEvent(event),
    domain: event.domain,
    value: event.value,
    polarity: event.polarity,
    provenance: event.provenance,
    // Polarity NEVER promotes authority. A negative keeps its own provenance
    // authority, so a weak AI negative cannot outrank an explicit positive.
    authority:
      event.polarity === "positive" && declaredPriority
        ? Math.min(base, DECLARED_PRIORITY_AUTHORITY)
        : base,
    confidence: event.confidence,
    declaredPriority,
  };
}

function canonicalEvent<D extends SemanticDomain>(
  domain: D,
  value: SemanticValueByDomain[D],
  provenance: SemanticProvenance,
  declaredPriority = false,
): SemanticSourceEvent {
  return {
    domain,
    value,
    provenance,
    polarity: "positive",
    confidence: 1,
    declaredPriority,
  } as SemanticSourceEvent;
}

/**
 * Deterministic ranking. Authority first, then confidence, then declared
 * domain precedence, then stable id. The last two are documented
 * display/compatibility tiebreaks only — never hidden product authority —
 * and they make ranking independent of input array order.
 */
function compareSignals(a: SemanticSignal, b: SemanticSignal): number {
  if (a.authority !== b.authority) return a.authority - b.authority;
  if (a.confidence !== b.confidence) return b.confidence - a.confidence;
  const domainDelta =
    SEMANTIC_DOMAIN_PRECEDENCE[a.domain] - SEMANTIC_DOMAIN_PRECEDENCE[b.domain];
  if (domainDelta !== 0) return domainDelta;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/** Strongest signal wins per key; the loser is dropped from the merged set. */
function mergeByKey(signals: SemanticSignal[]): SemanticSignal[] {
  const best = new Map<string, SemanticSignal>();
  for (const signal of signals) {
    const composite = `${signal.key}:${signal.polarity}`;
    const existing = best.get(composite);
    if (!existing || compareSignals(signal, existing) < 0) best.set(composite, signal);
  }
  return [...best.values()].sort(compareSignals);
}

export function deriveSemanticProfile(input: SemanticProfileInput): StudioSemanticProfile {
  const priority = new Set<Interest>(input.priorityInterests ?? []);

  const canonical: SemanticSourceEvent[] = [];
  if (input.feeling) canonical.push(canonicalEvent("feeling", input.feeling, "explicit-ui"));
  // Every distinct explicit interest is retained as its own signal — wine and
  // gastronomy never collapse into one stored signal.
  const seenInterests = new Set<Interest>();
  const interestOrder: Interest[] = [];
  for (const interest of input.interests) {
    if (seenInterests.has(interest)) continue;
    seenInterests.add(interest);
    interestOrder.push(interest);
    canonical.push(canonicalEvent("interest", interest, "explicit-ui", priority.has(interest)));
  }
  if (input.rhythm) canonical.push(canonicalEvent("rhythm", input.rhythm, "explicit-ui"));
  if (input.destinationIntent)
    canonical.push(canonicalEvent("destination", input.destinationIntent, "explicit-ui"));
  if (input.companions) canonical.push(canonicalEvent("companions", input.companions, "explicit-ui"));
  if (input.occasion) canonical.push(canonicalEvent("occasion", input.occasion, "explicit-ui"));
  if (input.experienceDurationClass)
    canonical.push(canonicalEvent("duration", input.experienceDurationClass, "explicit-ui"));

  const historyEffects: SemanticSourceEvent[] = [];
  for (const event of input.history ?? []) {
    for (const effect of event.semanticEffects) historyEffects.push(effect);
  }

  const all = keepKnownSemanticEvents([
    ...canonical,
    ...historyEffects,
    ...(input.events ?? []),
  ]).map(signalFromEvent);

  const merged = mergeByKey(all);

  const negatives = merged.filter((signal) => signal.polarity === "negative");
  // Only explicit/rejection-class negatives are traveller exclusions.
  const exclusions = negatives.filter((signal) =>
    isExplicitExclusionProvenance(signal.provenance),
  );
  const strongestNegative = new Map<string, number>();
  for (const signal of negatives) {
    const current = strongestNegative.get(signal.key);
    if (current === undefined || signal.authority < current)
      strongestNegative.set(signal.key, signal.authority);
  }

  const positives = merged
    .filter((signal) => signal.polarity === "positive")
    .map((signal) => {
      const negAuthority = strongestNegative.get(signal.key);
      // A negative suppresses a positive only when it is at least as strong.
      return negAuthority !== undefined && negAuthority <= signal.authority
        ? { ...signal, defeatedByExclusion: true }
        : signal;
    });

  const live = positives.filter((signal) => !signal.defeatedByExclusion);

  const contentInterests = live.filter((signal) => signal.domain === "interest");
  const feelingSignal = live.find((signal) => signal.domain === "feeling") ?? null;

  const declaredLeads = contentInterests.filter((signal) => signal.declaredPriority);
  const leadInterests = declaredLeads.length > 0 ? declaredLeads : [];
  const leadKeys = new Set(leadInterests.map((signal) => signal.key));
  const supportingInterests = contentInterests.filter((signal) => !leadKeys.has(signal.key));

  const pick = (domain: SemanticDomain) => live.find((signal) => signal.domain === domain) ?? null;

  const stylePreferences = live.filter(
    (signal) => signal.domain === "rhythm" || signal.domain === "duration",
  );

  return {
    contentInterests,
    leadInterests,
    supportingInterests,
    stylePreferences,
    socialContext: pick("companions"),
    occasion: pick("occasion"),
    durationPreference: pick("duration"),
    destinationIntent: pick("destination"),
    explicitExclusions: exclusions,
    semanticSignals: [...negatives, ...positives].sort(compareSignals),
    interestOrderForCompatibility: interestOrder,
    feeling: feelingSignal ? (feelingSignal.value as Feeling) : null,
  };
}
