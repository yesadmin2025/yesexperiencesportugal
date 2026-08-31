/**
 * BUILD 2 — Pass 1. Inert semantic source-event primitives.
 *
 * These types describe semantics that could NOT later be reconstructed from
 * canonical Studio UI state (free-text interpretation, deterministic
 * inference, AI interpretation, explicit rejection). Nothing in this module
 * is wired into the live Studio flow in Pass 1.
 *
 * Hard rules enforced by design here:
 *   - CLOSED semantic key space at the TYPE boundary. `SemanticSourceEvent` is
 *     a discriminated union keyed by domain, so an arbitrary activity / stop /
 *     supplier string is a compile error, not just a runtime filter miss.
 *     `keepKnownSemanticEvents` remains for untrusted parsed input later.
 *   - `eventId` and `createdAt` are opaque transport metadata. They are NEVER
 *     semantic authority and are NEVER part of ranking or any fingerprint.
 *   - Pure module: no wall clock, no randomness, no UUID generation, no I/O.
 */

import {
  FEELING_IDS,
  INTEREST_IDS,
  type Companions,
  type DestinationIntent,
  type Feeling,
  type Interest,
  type Occasion,
  type Rhythm,
} from "@/components/studio-v3/types";
import {
  TRAVELLER_DURATION_CLASSES,
  type TravellerDurationClass,
} from "@/lib/studio-v3/timeDomain";

/** Where a semantic signal came from. Ordered later by authority, not by name. */
export const SEMANTIC_PROVENANCES = [
  "rejection",
  "explicit-ui",
  "explicit-free-text",
  "refinement-answer",
  "deterministic-inference",
  "ai-interpretation",
] as const;

export type SemanticProvenance = (typeof SEMANTIC_PROVENANCES)[number];

/**
 * Binding authority precedence (lower number = stronger).
 *   1. rejection — a CONFIRMED explicit negation (UI de-selection, explicit
 *      free-text negation, explicit "not this" answer). Only this provenance
 *      carries exclusion authority.
 *   2. traveller-declared priority / lead (a flag on the signal, see below)
 *   3. explicit UI / explicit free-text
 *   4. refinement / question answer
 *   5. deterministic inference
 *   6. AI interpretation
 *
 * Polarity NEVER promotes authority. An AI or deterministic *inferred*
 * negative keeps its own weak authority (6 / 5) and therefore can never
 * suppress an explicit traveller positive.
 */
export const PROVENANCE_AUTHORITY: Readonly<Record<SemanticProvenance, number>> = {
  rejection: 1,
  "explicit-ui": 3,
  "explicit-free-text": 3,
  "refinement-answer": 4,
  "deterministic-inference": 5,
  "ai-interpretation": 6,
};

/** Declared traveller priority sits between rejection and explicit selection. */
export const DECLARED_PRIORITY_AUTHORITY = 2 as const;

/**
 * Provenances whose negative signals count as an EXPLICIT exclusion. A weak
 * AI / deterministic negative is retained as a signal but is never labelled
 * an explicit traveller exclusion.
 */
export const EXPLICIT_EXCLUSION_PROVENANCES: readonly SemanticProvenance[] = [
  "rejection",
  "explicit-ui",
  "explicit-free-text",
];

export function isExplicitExclusionProvenance(provenance: SemanticProvenance): boolean {
  return EXPLICIT_EXCLUSION_PROVENANCES.includes(provenance);
}

/** Closed semantic domains. */
export const SEMANTIC_DOMAINS = [
  "interest",
  "feeling",
  "rhythm",
  "destination",
  "companions",
  "occasion",
  "duration",
] as const;

export type SemanticDomain = (typeof SEMANTIC_DOMAINS)[number];

/** Closed domain -> value type map, built from the existing Studio types. */
export type SemanticValueByDomain = {
  interest: Interest;
  feeling: Feeling;
  rhythm: Rhythm;
  destination: DestinationIntent;
  companions: Companions;
  occasion: Occasion;
  duration: TravellerDurationClass;
};

/** Union of every legal semantic value across all domains. */
export type SemanticValue = SemanticValueByDomain[SemanticDomain];

/**
 * Deterministic domain precedence used ONLY as a display / compatibility
 * tiebreak between otherwise equal-authority signals. It is not hidden
 * product authority.
 */
export const SEMANTIC_DOMAIN_PRECEDENCE: Readonly<Record<SemanticDomain, number>> = {
  feeling: 0,
  interest: 1,
  destination: 2,
  rhythm: 3,
  duration: 4,
  companions: 5,
  occasion: 6,
};

const RHYTHM_VALUES: readonly Rhythm[] = ["slow", "balanced", "full", "immersive"];

const COMPANION_VALUES: readonly Companions[] = [
  "solo",
  "couple",
  "family",
  "friends",
  "celebration",
  "proposal",
  "corporate",
];

const OCCASION_VALUES: readonly Occasion[] = [
  "none",
  "proposal",
  "anniversary",
  "birthday",
  "honeymoon",
  "family-day",
  "corporate",
  "celebration",
];

const DESTINATION_VALUES: readonly DestinationIntent[] = [
  "no-preference",
  "lisbon-sintra-cascais",
  "arrabida-setubal-azeitao",
  "alentejo-evora-wine",
  "alentejo-roman-talha",
  "vicentine-coast",
  "comporta-troia",
  "spiritual-coast",
  "central-portugal",
  "anywhere-special",
];

/** The closed value space per domain. Anything else is rejected fail-closed. */
export const SEMANTIC_DOMAIN_VALUES: {
  readonly [D in SemanticDomain]: readonly SemanticValueByDomain[D][];
} = {
  interest: INTEREST_IDS,
  feeling: FEELING_IDS,
  rhythm: RHYTHM_VALUES,
  destination: DESTINATION_VALUES,
  companions: COMPANION_VALUES,
  occasion: OCCASION_VALUES,
  duration: TRAVELLER_DURATION_CLASSES,
};

/** Stable, CLOSED semantic key: `<domain>:<value>` for that domain only. */
export type SemanticKeyOf<D extends SemanticDomain> = `${D}:${SemanticValueByDomain[D]}`;

export type SemanticKey = { [D in SemanticDomain]: SemanticKeyOf<D> }[SemanticDomain];

/**
 * Type-safe key builder. An unknown domain/value pair cannot be passed here,
 * so nothing arbitrary is ever blessed as semantic truth.
 */
export function makeSemanticKey<D extends SemanticDomain>(
  domain: D,
  value: SemanticValueByDomain[D],
): SemanticKeyOf<D> {
  return `${domain}:${value}` as SemanticKeyOf<D>;
}

export function isKnownSemanticValue(domain: SemanticDomain, value: string): boolean {
  return (SEMANTIC_DOMAIN_VALUES[domain] as readonly string[]).includes(value);
}

export type SemanticPolarity = "positive" | "negative";

type SemanticEventBase = {
  provenance: SemanticProvenance;
  polarity: SemanticPolarity;
  /** 0..1. Explicit traveller input should be 1. Never quantized for identity. */
  confidence: number;
  /** Traveller explicitly declared this as a priority / lead. */
  declaredPriority?: boolean;
  /** Opaque, non-semantic. NEVER used for authority or fingerprints. */
  eventId?: string;
  /** Opaque, non-semantic. NEVER used for authority or fingerprints. */
  createdAt?: string;
};

export type SemanticEventOf<D extends SemanticDomain> = SemanticEventBase & {
  domain: D;
  value: SemanticValueByDomain[D];
};

/**
 * An inert semantic source event. Discriminated union: each domain's value is
 * closed at compile time.
 */
export type SemanticSourceEvent = {
  [D in SemanticDomain]: SemanticEventOf<D>;
}[SemanticDomain];

/** Key of an event. Safe because the union already closes domain/value. */
export function semanticKeyOfEvent(event: SemanticSourceEvent): SemanticKey {
  return `${event.domain}:${event.value}` as SemanticKey;
}

/** Semantic identity of an event — provably free of eventId / createdAt. */
export type SemanticEventIdentity = {
  provenance: SemanticProvenance;
  key: SemanticKey;
  polarity: SemanticPolarity;
  /** Full finite confidence. Never rounded — rounding would collide. */
  confidence: number;
  declaredPriority: boolean;
};

export function semanticEventIdentity(event: SemanticSourceEvent): SemanticEventIdentity {
  return {
    provenance: event.provenance,
    key: semanticKeyOfEvent(event),
    polarity: event.polarity,
    confidence: event.confidence,
    declaredPriority: event.declaredPriority === true,
  };
}

/**
 * Canonical, collision-safe string form of the semantic identity.
 * Structured JSON over an explicitly ordered tuple — delimiter characters in
 * values cannot forge another identity, and confidence keeps full precision.
 */
export function semanticEventFingerprint(event: SemanticSourceEvent): string {
  const id = semanticEventIdentity(event);
  return JSON.stringify([
    id.provenance,
    id.key,
    id.polarity,
    id.confidence,
    id.declaredPriority,
  ]);
}

/** Fail-closed filter for untrusted / parsed input. */
export function keepKnownSemanticEvents(
  events: readonly SemanticSourceEvent[] | undefined,
): SemanticSourceEvent[] {
  if (!events) return [];
  return events.filter(
    (event) =>
      SEMANTIC_DOMAINS.includes(event.domain) &&
      isKnownSemanticValue(event.domain, event.value) &&
      Number.isFinite(event.confidence) &&
      event.confidence >= 0 &&
      event.confidence <= 1,
  );
}
