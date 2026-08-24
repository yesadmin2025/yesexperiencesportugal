import type { AdaptiveQuestionKind } from "./adaptiveQuestions";
import type { RefineIntentId } from "./refineIntents";
import { hasExplicitWineIntent } from "./studioWineIntent";
import type {
  Companions,
  DestinationIntent,
  Feeling,
  Interest,
  Rhythm,
  StudioV3State,
} from "./types";

/**
 * Studio V3 intent advisor.
 *
 * This module is deliberately product-blind: it contains no stop names,
 * supplier identities, prices, availability, durations or itinerary prose.
 * The model may only help prioritise choices that the deterministic Studio
 * engine has already declared valid.
 */

export const STUDIO_INTENT_SCHEMA_VERSION = "1" as const;
export const STUDIO_INTENT_MODEL = "openai/gpt-5.6-luna" as const;
export const STUDIO_INTENT_PROMPT_VERSION = "2026-08-24.v1" as const;

export const STUDIO_PREFERENCE_KEYS = [
  "wine",
  "gastronomy",
  "nature",
  "coast",
  "heritage",
  "photography",
  "wellness",
  "local-life",
  "faith",
  "hands-on",
] as const;

export type StudioPreferenceKey = (typeof STUDIO_PREFERENCE_KEYS)[number];
export type StudioPreferenceWeight = 0 | 1 | 2 | 3;
export type StudioPaceBias = "slower" | "balanced" | "fuller";
export type StudioIntentConfidence = "low" | "medium" | "high";
export type StudioIntentRationaleCode =
  | "clear-fit"
  | "pace-sensitive"
  | "coast-led"
  | "wine-led"
  | "culture-led"
  | "local-led"
  | "faith-led"
  | "photo-led"
  | "mixed";

export interface StudioIntentAdvisorInput {
  schemaVersion: typeof STUDIO_INTENT_SCHEMA_VERSION;
  feeling: Feeling;
  companions: Companions;
  interests: Interest[];
  rhythm: Rhythm;
  destinationIntent: DestinationIntent;
  refinementAnswered: boolean;
  availableAdaptiveKinds: AdaptiveQuestionKind[];
  allowedRefineIntentIds: RefineIntentId[];
}

export interface StudioIntentInterpretation {
  schemaVersion: typeof STUDIO_INTENT_SCHEMA_VERSION;
  confidence: StudioIntentConfidence;
  preferenceWeights: Record<StudioPreferenceKey, StudioPreferenceWeight>;
  paceBias: StudioPaceBias;
  preferredAdaptiveKind: AdaptiveQuestionKind | null;
  suggestedRefineIntentIds: RefineIntentId[];
  rationaleCode: StudioIntentRationaleCode;
}

export interface StudioIntentAdvisorResult {
  interpretation: StudioIntentInterpretation | null;
  source: "ai" | "fallback" | "rate-limited";
}

const ADAPTIVE_KINDS: ReadonlySet<AdaptiveQuestionKind> = new Set([
  "coast",
  "wine",
  "hands",
  "local",
  "faith",
  "photo",
]);
const REFINE_IDS: ReadonlySet<RefineIntentId> = new Set(["more-ocean", "less-wine", "slower"]);
const CONFIDENCE: ReadonlySet<StudioIntentConfidence> = new Set(["low", "medium", "high"]);
const PACE: ReadonlySet<StudioPaceBias> = new Set(["slower", "balanced", "fuller"]);
const RATIONALES: ReadonlySet<StudioIntentRationaleCode> = new Set([
  "clear-fit",
  "pace-sensitive",
  "coast-led",
  "wine-led",
  "culture-led",
  "local-led",
  "faith-led",
  "photo-led",
  "mixed",
]);

/**
 * Build the only payload that may leave the browser for intent advice.
 * It selects safe fields explicitly instead of spreading StudioV3State, which
 * also contains firstName, guestDraft and other data that must never reach AI.
 */
export function buildStudioIntentAdvisorInput(
  state: StudioV3State,
  availableAdaptiveKinds: ReadonlyArray<AdaptiveQuestionKind>,
  allowedRefineIntentIds: ReadonlyArray<RefineIntentId> = ["more-ocean", "less-wine", "slower"],
): StudioIntentAdvisorInput | null {
  if (!state.feeling || !state.companions || !state.rhythm || state.interests.length === 0) {
    return null;
  }

  return {
    schemaVersion: STUDIO_INTENT_SCHEMA_VERSION,
    feeling: state.feeling,
    companions: state.companions,
    interests: [...state.interests],
    rhythm: state.rhythm,
    destinationIntent: state.destinationIntent,
    refinementAnswered: state.refinement != null,
    availableAdaptiveKinds: availableAdaptiveKinds.filter((kind) => ADAPTIVE_KINDS.has(kind)),
    allowedRefineIntentIds: allowedRefineIntentIds.filter((id) => REFINE_IDS.has(id)),
  };
}

/** Stable key for client cache/dedupe. Contains no identity or contact data. */
export function studioIntentAdvisorKey(input: StudioIntentAdvisorInput): string {
  return JSON.stringify({
    v: input.schemaVersion,
    f: input.feeling,
    c: input.companions,
    i: [...input.interests].sort(),
    r: input.rhythm,
    d: input.destinationIntent,
    a: input.refinementAnswered,
    q: [...input.availableAdaptiveKinds].sort(),
    x: [...input.allowedRefineIntentIds].sort(),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readWeight(value: unknown): StudioPreferenceWeight | null {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : null;
}

/**
 * Trust boundary. Model output is never consumed directly.
 * Unknown values, low confidence, repeated questions and impossible refinements
 * are discarded. Deterministic owner rules always win.
 */
export function validateStudioIntentInterpretation(
  raw: unknown,
  input: StudioIntentAdvisorInput,
): StudioIntentInterpretation | null {
  if (!isRecord(raw) || raw.schemaVersion !== STUDIO_INTENT_SCHEMA_VERSION) return null;
  if (!CONFIDENCE.has(raw.confidence as StudioIntentConfidence)) return null;
  const confidence = raw.confidence as StudioIntentConfidence;
  if (confidence === "low") return null;
  if (!PACE.has(raw.paceBias as StudioPaceBias)) return null;
  if (!RATIONALES.has(raw.rationaleCode as StudioIntentRationaleCode)) return null;
  if (!isRecord(raw.preferenceWeights)) return null;

  const preferenceWeights = {} as Record<StudioPreferenceKey, StudioPreferenceWeight>;
  for (const key of STUDIO_PREFERENCE_KEYS) {
    const weight = readWeight(raw.preferenceWeights[key]);
    if (weight == null) return null;
    preferenceWeights[key] = weight;
  }

  const explicitWine = hasExplicitWineIntent({
    feeling: input.feeling,
    interests: input.interests,
    destinationIntent: input.destinationIntent,
  });
  if (!explicitWine) preferenceWeights.wine = 0;

  let preferredAdaptiveKind: AdaptiveQuestionKind | null = null;
  if (raw.preferredAdaptiveKind != null) {
    if (!ADAPTIVE_KINDS.has(raw.preferredAdaptiveKind as AdaptiveQuestionKind)) return null;
    const proposed = raw.preferredAdaptiveKind as AdaptiveQuestionKind;
    if (
      !input.refinementAnswered &&
      input.availableAdaptiveKinds.includes(proposed) &&
      (proposed !== "wine" || explicitWine)
    ) {
      preferredAdaptiveKind = proposed;
    }
  }

  if (!Array.isArray(raw.suggestedRefineIntentIds)) return null;
  const suggestedRefineIntentIds: RefineIntentId[] = [];
  for (const candidate of raw.suggestedRefineIntentIds.slice(0, 2)) {
    if (typeof candidate !== "string" || !REFINE_IDS.has(candidate as RefineIntentId)) return null;
    const id = candidate as RefineIntentId;
    if (input.allowedRefineIntentIds.includes(id) && !suggestedRefineIntentIds.includes(id)) {
      suggestedRefineIntentIds.push(id);
    }
  }

  return {
    schemaVersion: STUDIO_INTENT_SCHEMA_VERSION,
    confidence,
    preferenceWeights,
    paceBias: raw.paceBias as StudioPaceBias,
    preferredAdaptiveKind,
    suggestedRefineIntentIds,
    rationaleCode: raw.rationaleCode as StudioIntentRationaleCode,
  };
}

/**
 * Stable reorder only. The advisor cannot create or execute a refinement;
 * it may merely move already-resolved deterministic intents to the front.
 */
export function prioritiseResolvedRefineIntents<T extends { id: RefineIntentId }>(
  resolved: ReadonlyArray<T>,
  preferred: ReadonlyArray<RefineIntentId>,
): T[] {
  if (preferred.length === 0) return [...resolved];
  const byId = new Map(resolved.map((item) => [item.id, item]));
  const seen = new Set<RefineIntentId>();
  const head: T[] = [];
  for (const id of preferred) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      head.push(item);
      seen.add(id);
    }
  }
  return [...head, ...resolved.filter((item) => !seen.has(item.id))];
}
