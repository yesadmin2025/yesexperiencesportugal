// Studio v2 — atmospheric tint per dominant intent.
//
// Maps the currently inferred IntentAtmosphere to a soft full-bleed image
// + tint colour used as a background layer in Phase 3 INTENTION scenes.
// Pure presentation; never invents places.

import type { IntentAtmosphere } from "./profile";
import { INTENT_IMAGE } from "./images";

export interface MoodTint {
  image: string;
  alt: string;
  /** Tint colour overlaid above the image, blended with ivory. */
  tintHex: string;
  /** Background opacity for the image layer (0–1). Keep subtle. */
  imageOpacity: number;
  /** Tint opacity for the colour wash (0–1). */
  tintOpacity: number;
}

export const MOOD_TINT: Record<IntentAtmosphere, MoodTint> = {
  romantic_intimate: {
    image: INTENT_IMAGE.romantic_intimate.src,
    alt: INTENT_IMAGE.romantic_intimate.alt,
    tintHex: "#C9A96A", // warm gold
    imageOpacity: 0.18,
    tintOpacity: 0.1,
  },
  coastal_cinematic: {
    image: INTENT_IMAGE.coastal_cinematic.src,
    alt: INTENT_IMAGE.coastal_cinematic.alt,
    tintHex: "#295B61", // teal
    imageOpacity: 0.18,
    tintOpacity: 0.08,
  },
  relaxed_scenic: {
    image: INTENT_IMAGE.relaxed_scenic.src,
    alt: INTENT_IMAGE.relaxed_scenic.alt,
    tintHex: "#C9A96A",
    imageOpacity: 0.14,
    tintOpacity: 0.08,
  },
  elegant_cultural: {
    image: INTENT_IMAGE.elegant_cultural.src,
    alt: INTENT_IMAGE.elegant_cultural.alt,
    tintHex: "#2E2E2E", // charcoal — quiet stone
    imageOpacity: 0.14,
    tintOpacity: 0.06,
  },
  food_local: {
    image: INTENT_IMAGE.food_local.src,
    alt: INTENT_IMAGE.food_local.alt,
    tintHex: "#C9A96A",
    imageOpacity: 0.18,
    tintOpacity: 0.12,
  },
  social_celebratory: {
    image: INTENT_IMAGE.social_celebratory.src,
    alt: INTENT_IMAGE.social_celebratory.alt,
    tintHex: "#C9A96A",
    imageOpacity: 0.2,
    tintOpacity: 0.12,
  },
};

export function getMoodTint(intent: IntentAtmosphere | null | undefined): MoodTint {
  return MOOD_TINT[intent ?? "relaxed_scenic"] ?? MOOD_TINT.relaxed_scenic;
}
