/**
 * TURBO 1 — Scope A. DETERMINISTIC free-text interpreter.
 *
 * One optional sentence from the traveller ("Anything this day should know?")
 * becomes STRUCTURED semantics inside the existing closed vocabularies:
 * interests, feelings and explicit exclusions of catalogued Director options.
 *
 * Hard rules:
 *   - Pure. No wall clock, no randomness, no I/O, no AI.
 *   - CLOSED output vocabulary. A phrase that maps to nothing is ignored —
 *     never turned into a new interest, stop, supplier, claim or price.
 *   - Deterministic negation FIRST. An explicit negation is emitted with
 *     `rejection` provenance, which is the only exclusion authority in the
 *     semantic model, and can never be weakened by an optional AI overlay.
 *   - Same normalized text ⇒ identical structured effects, in a stable order.
 *   - No confidence percentage is ever surfaced to the traveller.
 */

import type { Feeling, Interest } from "@/components/studio-v3/types";
import {
  isDirectorOptionId,
  type DirectorOptionId,
} from "@/lib/studio-v3/questionOptionCatalog";
import {
  keepKnownSemanticEvents,
  semanticKeyOfEvent,
  type SemanticSourceEvent,
} from "@/lib/studio-v3/semanticSourceEvents";

/* ------------------------------------------------------------------ */
/* Normalization                                                        */
/* ------------------------------------------------------------------ */

/** Lowercase, de-accent, strip punctuation, collapse whitespace. */
export function normalizeFreeText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clause boundaries: punctuation is already gone, so split on connectives. */
const CLAUSE_SPLIT = /\s(?:but|however|though|although|yet|while|and|plus|also)\s/;

/**
 * Clauses of the RAW note: hard punctuation first (it is a real boundary a
 * traveller typed), then connectives inside each piece.
 */
function clausesOf(raw: string): string[] {
  return raw
    .split(/[,.;:!?\n]+/)
    .flatMap((piece) => normalizeFreeText(piece).split(CLAUSE_SPLIT))
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}


/* ------------------------------------------------------------------ */
/* Closed lexicon                                                       */
/* ------------------------------------------------------------------ */

type LexiconTarget =
  | { kind: "interest"; value: Interest }
  | { kind: "feeling"; value: Feeling }
  /** Explicit dislike of a THING that is only representable as a Director option. */
  | { kind: "option-exclusion"; options: readonly DirectorOptionId[] };

type LexiconEntry = { phrase: string; target: LexiconTarget };

/**
 * Phrases are matched longest-first, so "not into wine tasting" resolves the
 * wine interest once, not twice. Every target is an EXISTING canonical id.
 */
const LEXICON: readonly LexiconEntry[] = [
  // --- interests -----------------------------------------------------
  { phrase: "wine tasting", target: { kind: "interest", value: "wine" } },
  { phrase: "wineries", target: { kind: "interest", value: "wine" } },
  { phrase: "winery", target: { kind: "interest", value: "wine" } },
  { phrase: "vineyards", target: { kind: "interest", value: "wine" } },
  { phrase: "vineyard", target: { kind: "interest", value: "wine" } },
  { phrase: "wine", target: { kind: "interest", value: "wine" } },

  { phrase: "gastronomy", target: { kind: "interest", value: "gastronomy" } },
  { phrase: "restaurants", target: { kind: "interest", value: "gastronomy" } },
  { phrase: "seafood", target: { kind: "interest", value: "gastronomy" } },
  { phrase: "eating", target: { kind: "interest", value: "gastronomy" } },
  { phrase: "food", target: { kind: "interest", value: "gastronomy" } },

  { phrase: "hiking", target: { kind: "interest", value: "nature" } },
  { phrase: "countryside", target: { kind: "interest", value: "nature" } },
  { phrase: "landscape", target: { kind: "interest", value: "nature" } },
  { phrase: "nature", target: { kind: "interest", value: "nature" } },

  { phrase: "beaches", target: { kind: "interest", value: "coast" } },
  { phrase: "beach", target: { kind: "interest", value: "coast" } },
  { phrase: "ocean", target: { kind: "interest", value: "coast" } },
  { phrase: "atlantic", target: { kind: "interest", value: "coast" } },
  { phrase: "seaside", target: { kind: "interest", value: "coast" } },
  { phrase: "coastline", target: { kind: "interest", value: "coast" } },
  { phrase: "coast", target: { kind: "interest", value: "coast" } },

  { phrase: "museums", target: { kind: "interest", value: "heritage" } },
  { phrase: "museum", target: { kind: "interest", value: "heritage" } },
  { phrase: "monuments", target: { kind: "interest", value: "heritage" } },
  { phrase: "castles", target: { kind: "interest", value: "heritage" } },
  { phrase: "palaces", target: { kind: "interest", value: "heritage" } },
  { phrase: "history", target: { kind: "interest", value: "heritage" } },
  { phrase: "heritage", target: { kind: "interest", value: "heritage" } },

  { phrase: "photography", target: { kind: "interest", value: "photography" } },
  { phrase: "photos", target: { kind: "interest", value: "photography" } },
  { phrase: "taking pictures", target: { kind: "interest", value: "photography" } },

  { phrase: "spa", target: { kind: "interest", value: "wellness" } },
  { phrase: "wellness", target: { kind: "interest", value: "wellness" } },
  { phrase: "unwind", target: { kind: "interest", value: "wellness" } },

  { phrase: "how people live", target: { kind: "interest", value: "local-life" } },
  { phrase: "local life", target: { kind: "interest", value: "local-life" } },
  { phrase: "locals", target: { kind: "interest", value: "local-life" } },
  { phrase: "markets", target: { kind: "interest", value: "local-life" } },
  { phrase: "market", target: { kind: "interest", value: "local-life" } },
  { phrase: "villages", target: { kind: "interest", value: "local-life" } },

  { phrase: "church", target: { kind: "interest", value: "faith" } },
  { phrase: "churches", target: { kind: "interest", value: "faith" } },
  { phrase: "sanctuary", target: { kind: "interest", value: "faith" } },
  { phrase: "pilgrimage", target: { kind: "interest", value: "faith" } },

  // Making / craft. Deliberately generous: "how people still make things".
  { phrase: "how people still make things", target: { kind: "interest", value: "hands-on" } },
  { phrase: "how things are made", target: { kind: "interest", value: "hands-on" } },
  { phrase: "make things", target: { kind: "interest", value: "hands-on" } },
  { phrase: "making things", target: { kind: "interest", value: "hands-on" } },
  { phrase: "workshop", target: { kind: "interest", value: "hands-on" } },
  { phrase: "workshops", target: { kind: "interest", value: "hands-on" } },
  { phrase: "artisans", target: { kind: "interest", value: "hands-on" } },
  { phrase: "artisan", target: { kind: "interest", value: "hands-on" } },
  { phrase: "craft", target: { kind: "interest", value: "hands-on" } },
  { phrase: "crafts", target: { kind: "interest", value: "hands-on" } },
  { phrase: "hands on", target: { kind: "interest", value: "hands-on" } },
  { phrase: "pottery", target: { kind: "interest", value: "hands-on" } },
  { phrase: "cheese making", target: { kind: "interest", value: "hands-on" } },

  // --- feelings ------------------------------------------------------
  { phrase: "off the beaten path", target: { kind: "feeling", value: "hidden" } },
  { phrase: "hidden portugal", target: { kind: "feeling", value: "hidden" } },
  { phrase: "romantic", target: { kind: "feeling", value: "romance" } },
  { phrase: "honeymoon", target: { kind: "feeling", value: "romance" } },
  { phrase: "adventure", target: { kind: "feeling", value: "adventure" } },

  // --- things only representable as Director options -----------------
  // A dislike of boats can never become a positive water discovery.
  {
    phrase: "boat trips",
    target: { kind: "option-exclusion", options: ["coast-from-the-water"] },
  },
  { phrase: "boat trip", target: { kind: "option-exclusion", options: ["coast-from-the-water"] } },
  { phrase: "boats", target: { kind: "option-exclusion", options: ["coast-from-the-water"] } },
  { phrase: "boat", target: { kind: "option-exclusion", options: ["coast-from-the-water"] } },
  { phrase: "sailing", target: { kind: "option-exclusion", options: ["coast-from-the-water"] } },
  { phrase: "the sea", target: { kind: "option-exclusion", options: ["coast-from-the-water"] } },
];

const SORTED_LEXICON = [...LEXICON].sort((a, b) => b.phrase.length - a.phrase.length);

/** Negation cues, matched as whole words before the phrase in the clause. */
const NEGATION_CUES: readonly string[] = [
  "not",
  "no",
  "never",
  "dont",
  "don't",
  "doesnt",
  "doesn't",
  "wont",
  "won't",
  "cant",
  "can't",
  "hate",
  "hates",
  "dislike",
  "dislikes",
  "avoid",
  "avoiding",
  "skip",
  "without",
  "rather not",
  "no interest in",
  "not into",
  "less interested in",
  "prefer not",
];

/** "don't care about X" / "not fussed about X" read as a negation of X. */
const NEGATION_PHRASES: readonly string[] = [
  "dont care about",
  "don't care about",
  "not interested in",
  "no interest in",
  "not into",
  "rather not",
  "prefer not to",
  "would rather skip",
];

function clauseIsNegatedBefore(clause: string, phraseStart: number): boolean {
  const before = clause.slice(0, phraseStart);
  const words = before.split(" ").filter(Boolean);
  // Only the LOCAL window matters. A negation earlier in the same clause must
  // not silently invert an unrelated later phrase.
  const window = words.slice(-5);
  const windowText = window.join(" ");
  if (NEGATION_PHRASES.some((p) => windowText.includes(p))) return true;
  return window.slice(-4).some((word) => NEGATION_CUES.includes(word));
}


/* ------------------------------------------------------------------ */
/* Interpretation                                                       */
/* ------------------------------------------------------------------ */

export interface FreeTextInterpretation {
  /** The normalized text the interpretation was derived from. */
  normalizedText: string;
  /** Closed-vocabulary semantic effects, deterministic order. */
  effects: SemanticSourceEvent[];
  /** Catalogued Director options the traveller explicitly ruled out. */
  excludedOptionIds: DirectorOptionId[];
  /** Lexicon phrases that matched, for tests/diagnostics. Never shown raw. */
  matchedPhrases: string[];
  /** True when the sentence produced nothing representable. */
  empty: boolean;
}

const EMPTY_INTERPRETATION: FreeTextInterpretation = {
  normalizedText: "",
  effects: [],
  excludedOptionIds: [],
  matchedPhrases: [],
  empty: true,
};

/**
 * Interpret one optional free-text note.
 *
 * Positives carry `explicit-free-text` provenance; negations carry
 * `rejection`, the only provenance with exclusion authority. When the same
 * key appears in both polarities, the negation wins — an explicit "not wine"
 * is never softened by an incidental mention of wine elsewhere.
 */
export function interpretFreeText(raw: string | null | undefined): FreeTextInterpretation {
  if (!raw) return EMPTY_INTERPRETATION;
  const normalizedText = normalizeFreeText(raw);
  if (!normalizedText) return EMPTY_INTERPRETATION;

  const positives = new Map<string, SemanticSourceEvent>();
  const negatives = new Map<string, SemanticSourceEvent>();
  const excluded = new Set<DirectorOptionId>();
  const matched: string[] = [];

  for (const clause of clausesOf(raw)) {
    const consumed: Array<[number, number]> = [];
    const overlaps = (start: number, end: number) =>
      consumed.some(([s, e]) => start < e && end > s);

    for (const entry of SORTED_LEXICON) {
      const pattern = new RegExp(`(?:^|\\s)${entry.phrase.replace(/'/g, "'")}(?:$|\\s)`, "g");
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(clause)) !== null) {
        const start = match.index + (match[0].startsWith(" ") ? 1 : 0);
        const end = start + entry.phrase.length;
        pattern.lastIndex = end;
        if (overlaps(start, end)) continue;
        consumed.push([start, end]);
        matched.push(entry.phrase);

        const negated = clauseIsNegatedBefore(clause, start);
        if (entry.target.kind === "option-exclusion") {
          // Only an explicit dislike is representable. A neutral mention of a
          // boat never becomes a positive water discovery.
          if (negated) for (const id of entry.target.options) excluded.add(id);
          continue;
        }

        const event: SemanticSourceEvent =
          entry.target.kind === "interest"
            ? {
                domain: "interest",
                value: entry.target.value,
                polarity: negated ? "negative" : "positive",
                provenance: negated ? "rejection" : "explicit-free-text",
                confidence: 1,
              }
            : {
                domain: "feeling",
                value: entry.target.value,
                polarity: negated ? "negative" : "positive",
                provenance: negated ? "rejection" : "explicit-free-text",
                confidence: 1,
              };
        const key = semanticKeyOfEvent(event);
        if (negated) negatives.set(key, event);
        else if (!positives.has(key)) positives.set(key, event);
      }
    }
  }

  // Explicit negation beats an incidental positive for the same key.
  for (const key of negatives.keys()) positives.delete(key);

  const effects = [...negatives.values(), ...positives.values()].sort((a, b) =>
    semanticKeyOfEvent(a).localeCompare(semanticKeyOfEvent(b)),
  );

  return {
    normalizedText,
    effects: keepKnownSemanticEvents(effects),
    excludedOptionIds: [...excluded].filter(isDirectorOptionId).sort(),
    matchedPhrases: matched.sort(),
    empty: effects.length === 0 && excluded.size === 0,
  };
}

/** Semantic keys the traveller explicitly excluded through free text. */
export function freeTextExclusionKeys(interpretation: FreeTextInterpretation): string[] {
  return interpretation.effects
    .filter((event) => event.polarity === "negative")
    .map(semanticKeyOfEvent)
    .sort();
}

/**
 * OPTIONAL AI OVERLAY — additive only, and only inside the closed vocabulary.
 *
 * Candidate events are filtered to known domain/value pairs, forced to
 * `ai-interpretation` provenance and positive polarity, and dropped entirely
 * when the deterministic pass already excluded that key. An overlay can
 * therefore never remove, weaken or invert an explicit traveller exclusion.
 *
 * This function exists so an AI hook is safe by construction. No provider is
 * configured or called here.
 */
export function mergeInterpreterOverlay(
  deterministic: FreeTextInterpretation,
  candidates: readonly SemanticSourceEvent[] | undefined,
): FreeTextInterpretation {
  const known = keepKnownSemanticEvents(candidates);
  if (known.length === 0) return deterministic;

  const excludedKeys = new Set(freeTextExclusionKeys(deterministic));
  const existing = new Set(deterministic.effects.map(semanticKeyOfEvent));
  const additions: SemanticSourceEvent[] = [];

  for (const candidate of known) {
    const key = semanticKeyOfEvent(candidate);
    if (excludedKeys.has(key) || existing.has(key)) continue;
    if (candidate.polarity !== "positive") continue; // AI may never exclude.
    additions.push({
      ...candidate,
      provenance: "ai-interpretation",
      declaredPriority: false,
    } as SemanticSourceEvent);
    existing.add(key);
  }
  if (additions.length === 0) return deterministic;

  const effects = [...deterministic.effects, ...additions].sort((a, b) =>
    semanticKeyOfEvent(a).localeCompare(semanticKeyOfEvent(b)),
  );
  return { ...deterministic, effects, empty: false };
}
