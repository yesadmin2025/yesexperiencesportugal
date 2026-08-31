/**
 * TURBO 1 — REMOVABLE PRESENTATION ADAPTER.
 *
 * Behaviour is immutable. The Director alone decides IF a question exists,
 * WHICH question it is, and the EXACT ORDERED options. A presentation
 * candidate (deterministic today, optionally AI-authored later) may only
 * supply wording: eyebrow, title, hint, per-option microcopy, short recap.
 *
 * Validation is total and fail-closed: unknown, missing, duplicated or
 * reordered option ids reject the WHOLE candidate and the deterministic
 * fallback from `presentDirectorQuestion` is used instead.
 *
 * Pure. No provider is configured or called here — no secrets, no model.
 */

import {
  presentDirectorQuestion,
  type DirectorQuestionPresentation,
} from "@/components/studio-v3/directorQuestionPresentation";
import { isWineryStopLabel } from "@/components/studio-v3/studioWineryPresentation";
import type { StudioQuestionDecision } from "@/lib/studio-v3/studioQuestionDirector";

export type PresentationOptionCandidate = {
  /** MUST equal the Director's choiceKey, in the Director's order. */
  id: string;
  label?: string;
  whisper?: string;
};

export type PresentationCandidate = {
  questionKey: string;
  eyebrow?: string;
  title?: string;
  titleAccent?: string;
  hint?: string;
  /** Short, factual recap. Never a recommendation or a match score. */
  recap?: string;
  options: readonly PresentationOptionCandidate[];
};

export type PresentationRejection =
  | "no-decision"
  | "question-key-mismatch"
  | "option-count-mismatch"
  | "option-order-mismatch"
  | "unsafe-copy";

export type AdaptedPresentation = {
  presentation: DirectorQuestionPresentation;
  /** True when the candidate was accepted; false when the fallback was used. */
  adapted: boolean;
  rejection?: PresentationRejection;
};

/**
 * Cache / identity fingerprint. Includes the question key, the ORDERED option
 * ids and the semantic profile fingerprint — reordering the options changes
 * the identity, so cached copy can never be replayed against another order.
 */
export function presentationFingerprint(input: {
  questionKey: string;
  orderedOptionIds: readonly string[];
  semanticFingerprint: string;
}): string {
  return JSON.stringify([
    "presentation",
    input.questionKey,
    [...input.orderedOptionIds],
    input.semanticFingerprint,
  ]);
}

/**
 * Copy that would misrepresent the Studio is never rendered.
 *
 * This is the FINAL LOCAL boundary: the model prompt is a hint, never a
 * safety guarantee. Anything an AI candidate could smuggle in — supplier or
 * private venue names, clock times, prices, percentages, unsupported numeric
 * facts, internal keys, exclamation marks, AI/match/recommendation wording or
 * sales hype — is rejected here and the deterministic copy is used instead.
 */
const FORBIDDEN_COPY = [
  /\bai\b/i,
  /\bmatch(es|ed|ing)?\b/i,
  /\brecommend/i,
  /\bour pick\b/i,
  /\bsuggested\b/i,
  /%/,
  /[€$£]/,
  /\b(eur|euros?|usd|dollars?|price[sd]?|pricing|cost[s]?|fee[s]?|free of charge)\b/i,
  // Clock times: 15:00, 15h30, 3pm, 9 am
  /\b\d{1,2}\s?[:h]\s?\d{2}\b/i,
  /\b\d{1,2}\s?(am|pm)\b/i,
  // Any digit at all — no unsupported numeric factual claims in question copy.
  /\d/,
  // Spelled-out quantified claims ("three wineries", "two hours").
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\s+\p{L}+s\b/iu,
  /!/,
  // Machine / internal keys: namespaced or snake_case identifiers.
  /\b[a-z0-9]+(?:[_:][a-z0-9]+)+\b/,
  // Sales superlatives and hype.
  /\b(best|world[- ]class|unbeatable|number one|top[- ]rated|must[- ]see|hand[- ]picked|guaranteed|amazing|incredible|ultimate|exclusive offer|once[- ]in[- ]a[- ]lifetime)\b/i,
];

/** Word windows of a copy string, for supplier-identity detection. */
function copyWindows(value: string): string[] {
  const words = value.split(/[^\p{L}\p{N}'’-]+/u).filter(Boolean);
  const out: string[] = [];
  for (let size = 2; size <= 4; size += 1) {
    for (let i = 1; i + size <= words.length + 1; i += 1) {
      const window = words.slice(i, i + size);
      // Only mid-sentence capitalised runs can name a private venue; generic
      // category language ("a local winery") is lower case and stays allowed.
      if (!window.some((word) => /^\p{Lu}/u.test(word))) continue;
      out.push(window.join(" "));
    }
  }
  return out;
}

/**
 * Private venue naming pattern: a venue-kind word immediately followed by a
 * proper name ("Quinta de Alcube", "Herdade do Peso"). Generic category
 * language without a proper name is not matched.
 */
const PRIVATE_VENUE_NAME =
  /\b(quinta|herdade|casa|adega|caves?|bodega|monte|solar|palácio|palacio|convento|villa|vinícola)\s+(d[aeo]s?\s+)?\p{Lu}/iu;

function copyIsSafe(value: string | undefined): boolean {
  if (value === undefined) return true;
  if (value.trim().length === 0) return false;
  if (FORBIDDEN_COPY.some((pattern) => pattern.test(value))) return false;
  if (PRIVATE_VENUE_NAME.test(value)) return false;
  // Reuse the repo's existing supplier/venue identity authority rather than
  // maintaining a competing blacklist here. Only named (capitalised) runs are
  // tested, so safe generic category wording is never rejected.
  return !copyWindows(value).some((window) => isWineryStopLabel(window));
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Apply a presentation candidate to a Director decision, or fall back.
 * The returned presentation ALWAYS carries the Director's exact ordered ids.
 */
export function adaptDirectorQuestion(
  decision: StudioQuestionDecision,
  candidate?: PresentationCandidate | null,
): AdaptedPresentation | null {
  const fallback = presentDirectorQuestion(decision);
  if (!fallback) return null;
  if (!candidate) return { presentation: fallback, adapted: false, rejection: "no-decision" };

  if (candidate.questionKey !== fallback.questionKey) {
    return { presentation: fallback, adapted: false, rejection: "question-key-mismatch" };
  }

  const offered = fallback.offeredOptionIds;
  const candidateIds = candidate.options.map((option) => option.id);
  if (candidateIds.length !== offered.length || new Set(candidateIds).size !== offered.length) {
    return { presentation: fallback, adapted: false, rejection: "option-count-mismatch" };
  }
  if (!sameOrder(candidateIds, offered)) {
    return { presentation: fallback, adapted: false, rejection: "option-order-mismatch" };
  }

  const copyFields = [
    candidate.eyebrow,
    candidate.title,
    candidate.titleAccent,
    candidate.hint,
    candidate.recap,
    ...candidate.options.flatMap((option) => [option.label, option.whisper]),
  ];
  if (!copyFields.every(copyIsSafe)) {
    return { presentation: fallback, adapted: false, rejection: "unsafe-copy" };
  }

  const presentation: DirectorQuestionPresentation = {
    ...fallback,
    eyebrow: candidate.eyebrow ?? fallback.eyebrow,
    title: candidate.title ?? fallback.title,
    titleAccent: candidate.titleAccent ?? fallback.titleAccent,
    hint: candidate.hint ?? fallback.hint,
    options: fallback.options.map((option, index) => {
      const supplied = candidate.options[index];
      return {
        ...option,
        label: supplied.label ?? option.label,
        whisper: supplied.whisper ?? option.whisper,
      };
    }),
    offeredOptionIds: [...offered],
  };

  return { presentation, adapted: true };
}
