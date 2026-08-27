/**
 * Studio V3 — P7 "Director's Read".
 *
 * One non-blocking interpretation beat, rendered immediately before Logistics.
 * It connects the traveller's choices instead of reading those choices back.
 *
 * Hard rules (non-negotiable):
 *   - Pure and deterministic. Same state in, same words out. No AI, no LLM
 *     call, no randomness, no clock, no network.
 *   - Never mutates state and never feeds curation, pricing, stops, suppliers,
 *     availability, maps or checkout.
 *   - Never invents an itinerary stop, region, partner, inclusion or price.
 *   - Never echoes visible option labels or repeats a reaction beat as prose.
 *   - Interests have already been acknowledged visually before this beat, so
 *     the read does not list or paraphrase them again.
 *   - Too little signal → a short neutral bridge, never invented detail.
 *
 * `themes` contains only semantic themes the read really voices. That keeps
 * the P6 acknowledgement ledger honest while Logistics stays operational.
 */

import type { StudioSemanticTheme } from "./studioSemanticMemory";
import type { Companions, Feeling, Interest, Rhythm } from "./types";

export interface DirectorsReadState {
  readonly feeling?: Feeling | null;
  readonly companions?: Companions | null;
  /**
   * Kept in the input contract because Interests are part of the Studio state,
   * but deliberately not narrated here. Changing only Interests must not
   * trigger the same read again.
   */
  readonly interests?: ReadonlyArray<Interest> | null;
  readonly rhythm?: Rhythm | null;
}

export interface DirectorsReadContent {
  readonly eyebrow: string;
  readonly headline: string;
  /** One to three short sentences. Never a list, never labels. */
  readonly body: ReadonlyArray<string>;
  /** Semantic themes this read has actually voiced on screen. */
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
export function directorsReadBackTarget(hasAdaptiveQuestion: boolean): "refinement" | "rhythm" {
  return hasAdaptiveQuestion ? "refinement" : "rhythm";
}

/**
 * The Feeling reaction has already painted the atmosphere. These headlines
 * therefore express an editorial judgement, not the same mood in new words.
 */
const HEADLINE_BY_FEELING: Readonly<Record<Feeling, string>> = {
  coastal: "The direction is clear. I can work with this.",
  "wine-food": "The direction is clear. I know how to hold it.",
  hidden: "There is a strong point of view here.",
  romance: "This needs restraint more than decoration.",
  culture: "There is enough here to make a real point of view.",
  adventure: "The structure matters more than adding more.",
  "slow-luxury": "This will benefit from editing.",
  faith: "The direction is clear. Nothing more needs adding.",
  "hands-on": "The direction is clear. Now it can become a day.",
};

const NEUTRAL_HEADLINE = "Let me read this back to you.";

/**
 * Cross-signal interpretation: Who + Rhythm become one editorial judgement.
 * These lines deliberately avoid the words used by the Who reaction and the
 * Rhythm beat. Dense = full / immersive; otherwise the day has more breathing
 * room. No operational promises are made.
 */
function companySynthesis(companions: Companions, rhythm: Rhythm | null): string {
  const dense = rhythm === "full" || rhythm === "immersive";
  switch (companions) {
    case "solo":
      return dense
        ? "There is room for range because only one person's attention has to be protected."
        : "There is no reason to fill every silence; the day can follow one person's attention.";
    case "couple":
      return dense
        ? "The day can carry more movement, but it should still feel shared rather than scheduled."
        : "The strongest version leaves enough room for the day to feel shared, not scheduled.";
    case "family":
      return dense
        ? "The day can carry more, but nobody should feel as if they are chasing the route."
        : "The route should make different energies feel easy together, not negotiate with the clock.";
    case "friends":
      return dense
        ? "The route can keep moving, but conversation should never become the thing squeezed between stops."
        : "The flow should protect conversation as much as discovery.";
    case "celebration":
      return "The reason for the day should sit inside it naturally, not turn every hour into an event.";
    case "proposal":
      return "Everything around the key moment should feel effortless, so the moment itself can carry the weight.";
    case "corporate":
      return dense
        ? "The programme can carry substance without making the group feel managed."
        : "The organisation should disappear into the background so the group can stay present.";
  }
}

/**
 * Rhythm already had a pace beat. This second-order sentence explains what
 * that pace means for editing the day, without saying "slow", "full",
 * "fewer stops" or another paraphrase of the reaction.
 */
const RHYTHM_SYNTHESIS: Readonly<Record<Rhythm, string>> = {
  slow: "The edit matters more than the count; anything that does not earn its place can stay out.",
  balanced: "Variety only helps if the day still has room to breathe.",
  full: "The order will matter: range is welcome, but the day still needs one clear line.",
  immersive: "The arc needs to feel intentional from beginning to end, not simply long.",
};

/**
 * The read for the current Studio state. Reaction beats confirm individual
 * choices; this beat only interprets the relationship between them.
 */
export function composeDirectorsRead(state: DirectorsReadState): DirectorsReadContent {
  const feeling = state.feeling ?? null;
  const companions = state.companions ?? null;
  const rhythm = state.rhythm ?? null;
  const body: string[] = [];
  const themes: StudioSemanticTheme[] = [];

  // 1 — interpretation of the person/group + chosen structure. The Who beat
  // already acknowledged company, so this is a relationship, not a recap.
  if (companions) {
    body.push(companySynthesis(companions, rhythm));
  } else if (feeling) {
    body.push("There is enough signal now to make choices with intent.");
  }

  // 2 — structural consequence of the rhythm, not a second pace label.
  if (rhythm) {
    body.push(RHYTHM_SYNTHESIS[rhythm]);
    themes.push("pace.rhythm");
  }

  const neutral = body.length === 0;
  if (neutral) {
    body.push("There's little to go on yet, so let's make the day real first.");
  }

  // The signature follows the COPY, not every field in state. Interests are
  // intentionally absent: changing only an interest must not interrupt the
  // traveller with an identical read a second time.
  const signature = JSON.stringify({
    f: feeling,
    c: companions,
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
