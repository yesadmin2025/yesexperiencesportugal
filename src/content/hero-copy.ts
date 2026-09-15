/**
 * Single source of truth for the homepage hero.
 * The brand line stays editorial; the supporting copy is deliberately concrete
 * so a first-time visitor understands what YES sells within seconds.
 */
export const HERO_PHRASES = ["Portugal is the stage.", "You write the story."] as const;

export const HERO_COPY = {
  eyebrow: "DESIGNED BY YOU · AND AROUND YOU",
  headlineLine1: "Portugal is the stage.",
  headlineLine2: "You write the story.",
  subheadline:
    "Design and book a private day instantly. Choose a Signature experience, or let a local expert shape a full journey or special moment around you.",
  primaryCta: "DESIGN YOUR DAY",
  secondaryCta: "Explore Signature Experiences",
  microcopy: "700+ five-star reviews · Private · Local support · Secure checkout",
  brandLine: "Continue the story across Portugal →",
} as const;

export type HeroCopyKey = keyof typeof HERO_COPY;

export const HERO_COPY_VERSION = [...Object.values(HERO_COPY), ...HERO_PHRASES]
  .join("|")
  .split("")
  .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
  .toString(36);
