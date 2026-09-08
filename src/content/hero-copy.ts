/**
 * Single source of truth for the homepage hero.
 * The brand line stays editorial; the supporting copy is deliberately concrete
 * so a first-time visitor understands what YES sells within seconds.
 */
export const HERO_PHRASES = ["Portugal is the stage.", "You write the story."] as const;

export const HERO_COPY = {
  eyebrow: "DESIGNED BY YOU · CONFIRMED INSTANTLY",
  headlineLine1: "Portugal is the stage.",
  headlineLine2: "You write the story.",
  subheadline:
    "Private Portugal tours and bespoke journeys, thoughtfully composed and booked directly.",
  primaryCta: "Design your day",
  secondaryCta: "Explore Signature Experiences",
  microcopy: "700+ five-star reviews · Private · Local support · Secure checkout",
  brandLine: "Planning several days? Travel Designer →",
} as const;

export type HeroCopyKey = keyof typeof HERO_COPY;

export const HERO_COPY_VERSION = [...Object.values(HERO_COPY), ...HERO_PHRASES]
  .join("|")
  .split("")
  .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
  .toString(36);
