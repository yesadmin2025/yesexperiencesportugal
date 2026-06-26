/**
 * FROZEN HERO COPY SPEC — approved wording for the closing hero scene
 * that follows the 10-phrase cinematic intro.
 */
export const HERO_COPY_SPEC = {
  eyebrow: "PORTUGAL IS THE STAGE",
  headlineLine1: "Portugal is waiting to be lived.",
  headlineLine2: "You just have to start writing.",
  subheadline: "Every story is different. So is yours.",
  primaryCta: "Create Your Story",
  secondaryCta: "Explore Signature Experiences",
  microcopy: "Designed in real time, with you. Reserve when it feels right — final price shown before payment.",
} as const;

export type HeroSpecKey = keyof typeof HERO_COPY_SPEC;
