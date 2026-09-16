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
    "Private days, journeys and special moments across Portugal, shaped with local knowledge and made entirely your own.",
  primaryCta: "DESIGN YOUR DAY",
  secondaryCta: "EXPLORE EXPERIENCES",
  microcopy: "700+ five-star reviews · Private · Local support · Secure checkout",
} as const;

export type HeroSpecKey = keyof typeof HERO_COPY_SPEC;
