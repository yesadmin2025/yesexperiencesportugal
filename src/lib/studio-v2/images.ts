// Studio v2 — editorial imagery, one hero per atmosphere.
// Real photography only. Used in Atmosphere choice cards, RewardImageBeat
// and the global atmospheric backdrop.

import relaxedScenic     from "@/assets/studio/atm-relaxed-scenic.jpg";
import elegantCultural   from "@/assets/studio/atm-elegant-cultural.jpg";
import foodLocal         from "@/assets/studio/atm-food-local.jpg";
import socialCelebratory from "@/assets/studio/atm-social-celebratory.jpg";
import romanticIntimate  from "@/assets/studio/atm-romantic-intimate.jpg";
import coastalCinematic  from "@/assets/studio/atm-coastal-cinematic.jpg";

import type { IntentAtmosphere } from "./profile";

export const INTENT_IMAGE: Record<IntentAtmosphere, { src: string; alt: string }> = {
  relaxed_scenic:     { src: relaxedScenic,     alt: "A vineyard road in the Arrábida easing toward the Atlantic at golden hour." },
  elegant_cultural:   { src: elegantCultural,   alt: "Quiet stone interior with azulejo panels and soft window light." },
  food_local:         { src: foodLocal,         alt: "A long Portuguese family table set under a vine pergola at dusk." },
  social_celebratory: { src: socialCelebratory, alt: "A candle-lit private terrace over Lisbon rooftops at dusk." },
  romantic_intimate:  { src: romanticIntimate,  alt: "A couple walking a quiet Atlantic cliff path at dusk." },
  coastal_cinematic:  { src: coastalCinematic,  alt: "Dramatic Atlantic cliffs at Cabo da Roca in slow gold light." },
};
