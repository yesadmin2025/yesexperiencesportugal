/**
 * FROZEN HERO COPY SPEC — approved wording for the homepage hero.
 *
 * Keep this byte-identical to the rendered HERO_COPY fields guarded by the
 * source-level and browser regression tests. When the approved hero wording
 * changes, update this frozen contract in the same change so CI validates the
 * new copy rather than an obsolete previous concept.
 */
export const HERO_COPY_SPEC = {
  eyebrow: "DESIGNED BY YOU · AND AROUND YOU",
  headlineLine1: "Portugal is the stage.",
  headlineLine2: "You write the story.",
  subheadline:
    "Design your private day and confirm instantly. Choose a Signature experience, or let a local Travel Designer create your journey or special moment.",
  primaryCta: "CREATE YOUR DAY",
  secondaryCta: "Explore Signature Experiences",
  microcopy: "700+ five-star reviews · Private · Local support · Secure checkout",
} as const;

export type HeroSpecKey = keyof typeof HERO_COPY_SPEC;
