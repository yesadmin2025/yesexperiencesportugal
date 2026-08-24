/**
 * Adaptive (conditional) refinement question for Studio V3.
 *
 * At most one extra question is asked, and only when the traveller's answers
 * can safely distinguish between real Signature directions in the selected
 * region. When nothing materially useful can be learned, the phase is skipped.
 *
 * Every answer maps to an existing Living Atlas discovery signal or to null.
 * Nothing here creates a stop, supplier, inclusion, availability claim or price.
 */

import type { LivingAtlasDiscoverySignal } from "@/components/studio-v3/livingAtlasDecision";
import { hasExplicitWineIntent } from "./studioWineIntent";
import type {
  AdaptiveRefinementId,
  ChoiceOption,
  StudioV3State,
} from "@/components/studio-v3/types";

export type AdaptiveQuestionKind = "coast" | "wine" | "hands" | "local" | "faith" | "photo";

export interface AdaptiveQuestion {
  kind: AdaptiveQuestionKind;
  eyebrow: string;
  title: string;
  titleAccent: string;
  hint: string;
  options: ChoiceOption<AdaptiveRefinementId>[];
}

/**
 * These questions currently distinguish real alternatives inside the Arrábida
 * family of Signature routes. For fixed single-Signature destinations, asking
 * them would add theatre without changing the composition, so they are skipped.
 */
const ARRABIDA_REFINEMENT_DESTINATIONS = new Set([
  "no-preference",
  "anywhere-special",
  "arrabida-setubal-azeitao",
]);

/** Local-life has one additional safe branch for Comporta/Tróia. */
const LOCAL_REFINEMENT_DESTINATIONS = new Set([
  ...ARRABIDA_REFINEMENT_DESTINATIONS,
  "comporta-troia",
]);

/** Faith only branches where a sanctuary or sacred-heritage route exists. */
const FAITH_DESTINATIONS = new Set([
  "no-preference",
  "anywhere-special",
  "spiritual-coast",
  "central-portugal",
]);

/** Photography only branches where the landmark alternative is real. */
const PHOTO_DESTINATIONS = new Set([
  "no-preference",
  "anywhere-special",
  "lisbon-sintra-cascais",
]);

const RIVER_DESTINATIONS = new Set(["no-preference", "anywhere-special", "comporta-troia"]);
const ARTISAN_DESTINATIONS = new Set([
  "no-preference",
  "anywhere-special",
  "arrabida-setubal-azeitao",
]);

const REFINEMENT_TO_SIGNAL: Readonly<
  Record<AdaptiveRefinementId, LivingAtlasDiscoverySignal | null>
> = {
  "coast-from-the-water": "arrabida-from-water",
  "coast-wild-beaches": "arrabida-beach-picnic",
  "coast-clifftop-views": null,
  "wine-cellar-depth": "arrabida-family-wine",
  "wine-table-and-cheese": "make-azeitao-cheese",
  "wine-vineyard-views": null,
  "hands-paint-tile": "paint-azulejo",
  "hands-make-cheese": "make-azeitao-cheese",
  "hands-just-watch": null,
  "local-river-and-rice": "comporta-rice-fields",
  "local-market-morning": null,
  "local-artisans": "paint-azulejo",
  "faith-sanctuary-time": "living-faith-and-coast",
  "faith-templar-heritage": "templars-and-university",
  "faith-quiet-reflection": null,
  "photo-golden-hour": null,
  "photo-landmarks": "palaces-and-atlantic",
  "photo-no-preference": null,
};

const REFINEMENT_SUMMARY: Readonly<Record<AdaptiveRefinementId, string>> = {
  "coast-from-the-water": "The coast seen from the water",
  "coast-wild-beaches": "Wild beaches and a long pause",
  "coast-clifftop-views": "Clifftop views over the Atlantic",
  "wine-cellar-depth": "Time inside the cellar",
  "wine-table-and-cheese": "The table, cheese and local produce",
  "wine-vineyard-views": "Vineyard views over tasting notes",
  "hands-paint-tile": "Painting an azulejo tile",
  "hands-make-cheese": "Making Azeitão cheese by hand",
  "hands-just-watch": "Watching the craft, hands free",
  "local-river-and-rice": "Rice fields and river villages",
  "local-market-morning": "A market morning among locals",
  "local-artisans": "Artisans at work",
  "faith-sanctuary-time": "Time inside the sanctuary",
  "faith-templar-heritage": "Sacred heritage and its history",
  "faith-quiet-reflection": "Quiet reflection, without a set programme",
  "photo-golden-hour": "The day paced around the best light",
  "photo-landmarks": "The landmarks, properly framed",
  "photo-no-preference": "No photography preference",
};

export function refinementToDiscoverySignal(
  refinement: AdaptiveRefinementId | null | undefined,
): LivingAtlasDiscoverySignal | null {
  if (!refinement) return null;
  return REFINEMENT_TO_SIGNAL[refinement] ?? null;
}

export function refinementSummaryLabel(
  refinement: AdaptiveRefinementId | null | undefined,
): string | null {
  if (!refinement) return null;
  return REFINEMENT_SUMMARY[refinement] ?? null;
}

function coastRelevant(state: StudioV3State): boolean {
  if (!ARRABIDA_REFINEMENT_DESTINATIONS.has(state.destinationIntent)) return false;
  return (
    state.feeling === "coastal" ||
    state.feeling === "adventure" ||
    state.interests.includes("coast")
  );
}

function wineRelevant(state: StudioV3State): boolean {
  if (!ARRABIDA_REFINEMENT_DESTINATIONS.has(state.destinationIntent)) return false;
  // Explicit wine intent ONLY. Gastronomy is food, not wine; coast, nature,
  // heritage and slow-luxury never earn a cellar/vines question.
  return hasExplicitWineIntent({
    feeling: state.feeling,
    interests: state.interests,
    destinationIntent: state.destinationIntent,
  });
}

function handsRelevant(state: StudioV3State): boolean {
  if (!ARRABIDA_REFINEMENT_DESTINATIONS.has(state.destinationIntent)) return false;
  return (
    state.interests.includes("hands-on") ||
    state.interests.includes("local-life") ||
    state.interests.includes("heritage") ||
    state.feeling === "hands-on" ||
    state.feeling === "hidden" ||
    state.feeling === "culture"
  );
}

function faithRelevant(state: StudioV3State): boolean {
  if (!FAITH_DESTINATIONS.has(state.destinationIntent)) return false;
  return state.feeling === "faith" || state.interests.includes("faith");
}

function photoRelevant(state: StudioV3State): boolean {
  if (!PHOTO_DESTINATIONS.has(state.destinationIntent)) return false;
  return state.interests.includes("photography");
}

function localRelevant(state: StudioV3State): boolean {
  if (!LOCAL_REFINEMENT_DESTINATIONS.has(state.destinationIntent)) return false;
  return state.interests.includes("local-life") || state.feeling === "hidden";
}

function orderedKinds(state: StudioV3State): AdaptiveQuestionKind[] {
  const available: AdaptiveQuestionKind[] = [];
  if (faithRelevant(state)) available.push("faith");
  if (coastRelevant(state)) available.push("coast");
  if (wineRelevant(state)) available.push("wine");
  if (handsRelevant(state)) available.push("hands");
  if (localRelevant(state)) available.push("local");
  if (photoRelevant(state)) available.push("photo");

  const leadFirst: AdaptiveQuestionKind | null =
    state.feeling === "faith"
      ? "faith"
      : state.feeling === "coastal" || state.feeling === "adventure"
      ? "coast"
      : state.feeling === "wine-food"
        ? "wine"
        : state.feeling === "culture" || state.feeling === "hands-on"
          ? "hands"
          : state.feeling === "hidden"
            ? "local"
            : null;

  if (leadFirst && available.includes(leadFirst)) {
    return [leadFirst, ...available.filter((kind) => kind !== leadFirst)];
  }
  return available;
}

function localOptions(state: StudioV3State): ChoiceOption<AdaptiveRefinementId>[] {
  const options: ChoiceOption<AdaptiveRefinementId>[] = [
    {
      id: "local-market-morning",
      label: "A market morning",
      whisper: "Food, conversation and the rhythm of a working town.",
    },
  ];

  if (ARTISAN_DESTINATIONS.has(state.destinationIntent)) {
    options.push({
      id: "local-artisans",
      label: "Artisans at work",
      whisper: "A closer look at craft traditions still practised locally.",
    });
  }

  if (RIVER_DESTINATIONS.has(state.destinationIntent)) {
    options.push({
      id: "local-river-and-rice",
      label: "Rice fields and river villages",
      whisper: "Water, open landscapes and low white houses.",
    });
  }

  return options;
}

export function resolveAdaptiveQuestion(state: StudioV3State): AdaptiveQuestion | null {
  if (!state.feeling && state.interests.length === 0) return null;

  const kind = orderedKinds(state)[0];
  if (!kind) return null;

  if (kind === "faith") {
    return {
      kind,
      eyebrow: "Quiet ground",
      title: "How should the sacred part",
      titleAccent: "of the day feel?",
      hint: "Shown only where a sanctuary or sacred-heritage route can hold it.",
      options: [
        {
          id: "faith-sanctuary-time",
          label: "Time in the sanctuary",
          whisper: "Unhurried time where people come to pray.",
        },
        {
          id: "faith-templar-heritage",
          label: "Sacred heritage",
          whisper: "Centuries of stone, orders and scholarship.",
        },
        {
          id: "faith-quiet-reflection",
          label: "Simply quiet",
          whisper: "Space to reflect, with nothing scheduled around it.",
        },
      ],
    };
  }

  if (kind === "photo") {
    return {
      kind,
      eyebrow: "The light",
      title: "What should the camera",
      titleAccent: "come home with?",
      hint: "This shapes pacing and where the longer pauses fall.",
      options: [
        {
          id: "photo-golden-hour",
          label: "The best light",
          whisper: "We pace the day around golden hour.",
        },
        {
          id: "photo-landmarks",
          label: "The landmarks",
          whisper: "Palaces and the Atlantic, properly framed.",
        },
        {
          id: "photo-no-preference",
          label: "No preference",
          whisper: "Keep the day as it is — the light will come.",
        },
      ],
    };
  }

  if (kind === "coast") {
    return {
      kind,
      eyebrow: "The Atlantic",
      title: "How should the coast",
      titleAccent: "reach you?",
      hint: "This helps us choose the coastal direction that best fits your day.",
      options: [
        {
          id: "coast-from-the-water",
          label: "From the water",
          whisper: "Coastal caves and cliffs seen from the sea.",
        },
        {
          id: "coast-wild-beaches",
          label: "On a wild beach",
          whisper: "Sand, open space and time to slow down.",
        },
        {
          id: "coast-clifftop-views",
          label: "From above",
          whisper: "Atlantic viewpoints with your feet on solid ground.",
        },
      ],
    };
  }

  if (kind === "wine") {
    return {
      kind,
      eyebrow: "The table",
      title: "What should the wine",
      titleAccent: "be about?",
      hint: "This helps us choose the wine direction that best fits your day.",
      options: [
        {
          id: "wine-cellar-depth",
          label: "Inside the cellar",
          whisper: "The people, the process and how the wine is made.",
        },
        {
          id: "wine-table-and-cheese",
          label: "Around the table",
          whisper: "Cheese, bread and regional produce, unhurried.",
        },
        {
          id: "wine-vineyard-views",
          label: "Out among the vines",
          whisper: "The landscape first, with the tasting woven around it.",
        },
      ],
    };
  }

  if (kind === "hands") {
    return {
      kind,
      eyebrow: "By hand",
      title: "Would you like to",
      titleAccent: "make something?",
      hint: "Shown only where a supported hands-on experience can fit the route.",
      options: [
        {
          id: "hands-paint-tile",
          label: "Paint an azulejo",
          whisper: "Explore the tradition with a local maker.",
        },
        {
          id: "hands-make-cheese",
          label: "Make Azeitão cheese",
          whisper: "Take part in the process with local producers.",
        },
        {
          id: "hands-just-watch",
          label: "Just watch",
          whisper: "See the craft without adding a workshop to your day.",
        },
      ],
    };
  }

  const options = localOptions(state);
  if (options.length < 2) return null;

  return {
    kind: "local",
    eyebrow: "Local life",
    title: "Where do you want to",
    titleAccent: "meet the everyday?",
    hint: "This helps us choose the quieter local thread of the day.",
    options,
  };
}

export function isAdaptiveQuestionRelevant(state: StudioV3State): boolean {
  return resolveAdaptiveQuestion(state) !== null;
}
