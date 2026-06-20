/**
 * Single source of truth for the home hero copy.
 *
 * Hero v4 — "One Breath": a single held cinematic clip behind one
 * centered two-line stanza, then delayed minimal CTAs. `HERO_PHRASES`
 * holds the two stanza lines; `HERO_COPY` carries the closing /
 * locked strings used by SEO, SSR probes and byte-exact e2e.
 */
export const HERO_PHRASES = ["Portugal is the stage.", "You write the story."] as const;

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
