/**
 * FROZEN HERO COPY SPEC — approved wording for the homepage hero.
 *
 * Keep this byte-identical to the rendered HERO_COPY fields guarded by the
 * source-level and browser regression tests. When the approved hero wording
 * changes, update this frozen contract in the same change so CI validates the
 * new copy rather than an obsolete previous concept.
 */
export const HERO_COPY_SPEC = {
  eyebrow: "SHAPED AROUND YOU · CONFIRMED INSTANTLY",
  headlineLine1: "Portugal is the stage.",
  headlineLine2: "You write the story.",
  subheadline:
    "Private Portugal tours and bespoke journeys, thoughtfully composed and booked directly.",
  primaryCta: "Design your day",
  secondaryCta: "Explore Signature Experiences",
} as const;

export type HeroSpecKey = keyof typeof HERO_COPY_SPEC;
