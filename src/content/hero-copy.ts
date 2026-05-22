/**
 * Single source of truth for the home hero copy.
 *
 * The hero now opens with a 10-phrase cinematic sequence (one phrase
 * at a time, soft fade in/out) over a continuous film, before
 * revealing the closing stanza + CTAs + microcopy. `HERO_PHRASES`
 * drives the intro; `HERO_COPY` carries the closing scene strings
 * (still locked for SEO, SSR, and byte-exact e2e).
 *
 * Approved positioning:
 *   Portugal is the stage. The guest writes their story. Locals know
 *   where the hidden chapters begin. Booking is instant — no forms,
 *   no waiting.
 */
export const HERO_PHRASES = [
  "Portugal is the stage.",
  "You write your story.",
  "Hidden chapters waiting to unfold.",
  "Locals know where they begin.",
  "You decide how to live it.",
] as const;


export const HERO_COPY = {
  eyebrow: "PORTUGAL IS THE STAGE",
  headlineLine1: "Portugal is waiting to be lived.",
  headlineLine2: "You just have to start writing.",
  subheadline: "Every story is different. So is yours.",
  primaryCta: "Create Your Story",
  secondaryCta: "Explore Signature Experiences",
  microcopy: "Create it live. Confirm instantly. No forms. No waiting.",
  brandLine: "Whatever you have in mind, we say YES.",
} as const;

export type HeroCopyKey = keyof typeof HERO_COPY;

/**
 * Deterministic content-hash of every hero string. Used to bust SSR caches
 * and to expose a verifiable version on the rendered page.
 */
export const HERO_COPY_VERSION = [...Object.values(HERO_COPY), ...HERO_PHRASES]
  .join("|")
  .split("")
  .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
  .toString(36);
