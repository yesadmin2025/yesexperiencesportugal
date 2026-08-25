/**
 * Studio V3 — P7 "Director's Read".
 *
 * One non-blocking interpretation beat, rendered immediately before Logistics.
 * It turns the Studio's silent inference (feeling, company, taste, rhythm,
 * inherited intent) into two or three short editorial sentences, so the
 * traveller feels read rather than processed.
 *
 * Hard rules (non-negotiable):
 *   - Pure and deterministic. Same state in, same words out. No AI, no LLM
 *     call, no randomness, no clock, no network.
 *   - Never mutates state and never feeds curation, pricing, stops, suppliers,
 *     availability, maps or checkout.
 *   - Never invents an itinerary stop, region, partner, inclusion or price.
 *     Every phrase talks about intent, not about the day's contents.
 *   - Never echoes the visible option labels. The copy is written in lowercase
 *     prose that deliberately avoids the capitalised label vocabulary in
 *     `types.ts`, so no surface can degrade into "Coastal · Wine · Slow".
 *   - Too little signal → a short neutral bridge, never invented detail.
 *
 * The themes the read actually voices are returned alongside the copy, so the
 * P6 acknowledgement ledger can keep refinement / Logistics / reveal quiet
 * about anything already said here. Operational facts (date, pickup, party,
 * region) are NOT acknowledgements and are never expressed by this module.
 */

import { deriveInheritedIntent } from "./studioInheritedIntent";
import type { StudioSemanticTheme } from "./studioSemanticMemory";
import type { Companions, Feeling, Interest, Rhythm } from "./types";

export interface DirectorsReadState {
  readonly feeling?: Feeling | null;
  readonly companions?: Companions | null;
  readonly interests?: ReadonlyArray<Interest> | null;
  readonly rhythm?: Rhythm | null;
}

export interface DirectorsReadContent {
  readonly eyebrow: string;
  readonly headline: string;
  /** Two or three short sentences. Never a list, never labels. */
  readonly body: ReadonlyArray<string>;
  /** Semantic themes this read has already voiced on screen. */
  readonly themes: ReadonlyArray<StudioSemanticTheme>;
  /** Stable identity of this exact read — used for once-per-read effects. */
  readonly signature: string;
  /** True when there was not enough signal for a real interpretation. */
  readonly neutral: boolean;
}

export const DIRECTORS_READ_EYEBROW = "The director's read";

/**
 * Where Back from the read should land. The beat sits in the Logistics slot,
 * so it must walk back to whatever the traveller actually saw last: the
 * adaptive refinement question when one was shown, otherwise rhythm.
 */
export function directorsReadBackTarget(
  hasAdaptiveQuestion: boolean,
): "refinement" | "rhythm" {
  return hasAdaptiveQuestion ? "refinement" : "rhythm";
}

/** Opening acknowledgement. Chosen by feeling so it never reads generic. */
const HEADLINE_BY_FEELING: Readonly<Record<Feeling, string>> = {
  coastal: "I can already see the shape of this.",
  "wine-food": "I know where this one is going.",
  hidden: "This one wants the quieter roads.",
  romance: "This is a day for two, and it should read like one.",
  culture: "There's depth in this one.",
  adventure: "This one wants some horizon in it.",
  "slow-luxury": "This should be short, and very well made.",
  faith: "This asks for stillness more than distance.",
  "hands-on": "This one should leave something in your hands.",
};

const NEUTRAL_HEADLINE = "Let me read this back to you.";

/** How the day feels. Written as prose, never as the option label. */
const FEELING_PHRASE: Readonly<Record<Feeling, string>> = {
  coastal: "a day that keeps returning to the Atlantic",
  "wine-food": "a day built around the table",
  hidden: "a day away from the obvious roads",
  romance: "a day with the two of you at the centre of it",
  culture: "a day that leans on old stone and older stories",
  adventure: "a day with open air and some effort in it",
  "slow-luxury": "a day with very little in it, done properly",
  faith: "a day with room to pause",
  "hands-on": "a day where your hands do some of the work",
};

/** Who it is for. Deliberately warmer than a party-size fact. */
const COMPANY_PHRASE: Readonly<Record<Companions, string>> = {
  solo: "shaped around one person's attention",
  couple: "for the two of you",
  family: "for a family that moves at more than one speed",
  friends: "for people who travel well together",
  celebration: "for a day that has something to mark",
  proposal: "for one moment that has to land perfectly",
  corporate: "for a private group that expects discretion",
};

/** What the day should make room for. Intent only — never a stop or supplier. */
const INTEREST_PHRASE: Readonly<Partial<Record<Interest, string>>> = {
  wine: "wine with room to linger",
  gastronomy: "a lunch nobody has to hurry",
  nature: "green ground and open sky",
  coast: "the shoreline",
  heritage: "the weight of old stone",
  photography: "light worth stopping for",
  wellness: "quiet, unhurried space",
  "local-life": "somewhere Portugal still feels lived-in",
  faith: "somewhere quiet enough to reflect",
  "hands-on": "something made by hand",
};

/** How it should move. */
const RHYTHM_PHRASE: Readonly<Record<Rhythm, string>> = {
  slow: "Nothing about it should feel rushed — fewer places, longer in each.",
  balanced:
    "It should move without hurrying: enough places to feel varied, enough time to settle into each.",
  full: "You want a full day, so we'll keep it moving without letting it turn into a schedule.",
  immersive: "You want the whole arc of it, from the early light to the last of the evening.",
};

/** Theme each expressible signal stands for, mirroring `studioSemanticMemory`. */
const FEELING_THEME: Readonly<Partial<Record<Feeling, StudioSemanticTheme>>> = {
  coastal: "theme.coast",
  "wine-food": "theme.wine",
  faith: "theme.faith",
  "hands-on": "activity.hands-on",
  hidden: "interest.local-life",
};

const INTEREST_THEME: Readonly<Partial<Record<Interest, StudioSemanticTheme>>> = {
  coast: "theme.coast",
  wine: "theme.wine",
  faith: "theme.faith",
  "hands-on": "activity.hands-on",
  "local-life": "interest.local-life",
  photography: "intent.photography",
};

/** Sentence-case the first character without touching the rest. */
function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function joinTwo(a: string, b: string): string {
  return `${a} and ${b}`;
}

/**
 * The read for the current Studio state. Always returns content — when there
 * is nothing meaningful to interpret, `neutral` is true and the copy is a
 * short bridge rather than an invented observation.
 */
export function composeDirectorsRead(state: DirectorsReadState): DirectorsReadContent {
  const feeling = state.feeling ?? null;
  const companions = state.companions ?? null;
  const rhythm = state.rhythm ?? null;
  const interests = state.interests ?? [];

  // Inherited themes are already carried by the feeling sentence, so they are
  // woven in semantically instead of being listed a second time.
  const inherited = deriveInheritedIntent({ feeling, interests, rhythm });
  const spokenInterests = interests.filter(
    (id) => !inherited.interestIds.includes(id) && INTEREST_PHRASE[id],
  );

  const themes: StudioSemanticTheme[] = [];
  const addTheme = (theme: StudioSemanticTheme | undefined) => {
    if (theme && !themes.includes(theme)) themes.push(theme);
  };

  const body: string[] = [];

  // 1 — atmosphere + company.
  if (feeling) {
    const phrase = FEELING_PHRASE[feeling];
    body.push(
      companions
        ? `${sentenceCase(phrase)}, ${COMPANY_PHRASE[companions]}.`
        : `${sentenceCase(phrase)}.`,
    );
    addTheme(FEELING_THEME[feeling]);
  } else if (companions) {
    body.push(`${sentenceCase(COMPANY_PHRASE[companions])}, and Portugal around it.`);
  }

  // 2 — taste, at most two clauses so it stays a sentence and not a list.
  const clauses = spokenInterests.slice(0, 2).map((id) => INTEREST_PHRASE[id] as string);
  if (clauses.length > 0) {
    const joined = clauses.length === 2 ? joinTwo(clauses[0], clauses[1]) : clauses[0];
    body.push(`There should be room for ${joined}.`);
    for (const id of spokenInterests.slice(0, 2)) addTheme(INTEREST_THEME[id]);
  }

  // 3 — rhythm.
  if (rhythm) {
    body.push(RHYTHM_PHRASE[rhythm]);
    addTheme("pace.rhythm");
  }

  const neutral = body.length === 0;
  if (neutral) {
    body.push("There's little to go on yet, so let's make the day real first.");
  }

  const signature = JSON.stringify({
    f: feeling,
    c: companions,
    i: [...interests].sort(),
    r: rhythm,
  });

  return {
    eyebrow: DIRECTORS_READ_EYEBROW,
    headline: feeling ? HEADLINE_BY_FEELING[feeling] : NEUTRAL_HEADLINE,
    body,
    themes,
    signature,
    neutral,
  };
}
