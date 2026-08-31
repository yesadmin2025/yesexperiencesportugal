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
import {
  deriveSemanticMemory,
  type StudioSemanticMemory,
  type StudioSemanticTheme,
} from "./studioSemanticMemory";
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

/**
 * TEMPORARY BRIDGE WIRING (BUILD 0). The three refinements below
 * (`wine-monumental-estates`, `wine-clay-talha`, `coast-remote-southwest`)
 * exist so that Évora, Roman Talha and the southwest Vicentine coast have a
 * real traveller-facing door and can be certified as publicly reachable.
 * They are fixed-question compatibility wiring only and are expected to be
 * REPLACED by the AI Question Director in BUILD 2. Do not add further fixed
 * questions here and do not redesign these cosmetically in the meantime.
 *
 * Alentejo wine has two genuinely different products: monumental Évora with
 * classic estates, and the intimate Roman/clay-talha family cellar. Without
 * these two answers neither direction had any traveller-facing door. Only
 * offered while the destination is still open; the fixed Alentejo intents
 * already resolve a single product, so asking would be theatre.
 */
const ALENTEJO_WINE_DESTINATIONS = new Set(["no-preference", "anywhere-special"]);

/**
 * The remote southwest coast is a real alternative to the Arrábida beaches.
 * Only offered where the destination is still open — a traveller who already
 * chose the Vicentine coast has nothing left to separate.
 */
const REMOTE_COAST_DESTINATIONS = new Set(["no-preference", "anywhere-special"]);


export const REFINEMENT_TO_SIGNAL: Readonly<
  Record<AdaptiveRefinementId, LivingAtlasDiscoverySignal | null>
> = {

  "coast-from-the-water": "arrabida-from-water",
  "coast-wild-beaches": "arrabida-beach-picnic",
  "coast-clifftop-views": null,
  "coast-remote-southwest": "wild-vicentine-coast",
  "wine-cellar-depth": "arrabida-family-wine",
  "wine-table-and-cheese": "make-azeitao-cheese",
  "wine-vineyard-views": null,
  "wine-monumental-estates": "monumental-alentejo",
  "wine-clay-talha": "roman-talha-family",
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
  "coast-remote-southwest": "A remote, wild stretch of southwest coast",
  "wine-cellar-depth": "Time inside the cellar",
  "wine-table-and-cheese": "The table, cheese and local produce",
  "wine-vineyard-views": "Vineyard views over tasting notes",
  "wine-monumental-estates": "Monumental Évora and its classic estates",
  "wine-clay-talha": "A family cellar and its clay talhas",
  "hands-paint-tile": "Painting an azulejo tile",
  "hands-make-cheese": "Making Azeitão cheese by hand",
  "hands-just-watch": "No workshop — observing only",
  "local-river-and-rice": "Rice fields and river villages",
  "local-market-morning": "A market morning among locals",
  "local-artisans": "Artisans at work",
  "faith-sanctuary-time": "Sanctuary time",
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

/**
 * Diagnostic (read-only): every public refinement answer that emits the given
 * Living Atlas discovery signal. An empty array means the signal exists in the
 * catalogue but no traveller-facing question can currently produce it.
 */
export function refinementIdsForSignal(
  signal: LivingAtlasDiscoverySignal,
): AdaptiveRefinementId[] {
  return (Object.keys(REFINEMENT_TO_SIGNAL) as AdaptiveRefinementId[]).filter(
    (id) => REFINEMENT_TO_SIGNAL[id] === signal,
  );
}


/**
 * Semantic gate. A question is only eligible when it asks for a genuinely NEW
 * dimension of an already-known theme (which direction, how, which thread) —
 * never to reconfirm a theme the traveller has already stated, and never for a
 * theme they never stated at all.
 */
const KIND_THEME: Readonly<Record<AdaptiveQuestionKind, StudioSemanticTheme>> = {
  coast: "theme.coast",
  wine: "theme.wine",
  hands: "activity.hands-on",
  local: "interest.local-life",
  faith: "theme.faith",
  photo: "intent.photography",
};

function addsNewDimension(memory: StudioSemanticMemory, kind: AdaptiveQuestionKind): boolean {
  // Every supported question refines a known theme's direction. If the theme is
  // unknown, asking it would be an invented interest, not a refinement.
  return memory.has(KIND_THEME[kind]);
}

function coastRelevant(state: StudioV3State): boolean {
  if (
    !ARRABIDA_REFINEMENT_DESTINATIONS.has(state.destinationIntent) &&
    !REMOTE_COAST_DESTINATIONS.has(state.destinationIntent)
  ) {
    return false;
  }
  return state.feeling === "coastal" || state.interests.includes("coast");
}

function wineRelevant(state: StudioV3State): boolean {
  if (
    !ARRABIDA_REFINEMENT_DESTINATIONS.has(state.destinationIntent) &&
    !ALENTEJO_WINE_DESTINATIONS.has(state.destinationIntent)
  ) {
    return false;
  }
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
  // EXPLICIT hands-on intent only. Heritage, culture, local life and hidden
  // Portugal are never workshop intent.
  return state.feeling === "hands-on" || state.interests.includes("hands-on");
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
  const memory = deriveSemanticMemory(state);
  const available: AdaptiveQuestionKind[] = [];
  if (faithRelevant(state)) available.push("faith");
  if (coastRelevant(state)) available.push("coast");
  if (wineRelevant(state)) available.push("wine");
  if (handsRelevant(state)) available.push("hands");
  if (localRelevant(state)) available.push("local");
  if (photoRelevant(state)) available.push("photo");

  const eligible = available.filter((kind) => addsNewDimension(memory, kind));

  const leadFirst: AdaptiveQuestionKind | null =
    state.feeling === "faith"
      ? "faith"
      : state.feeling === "coastal"
        ? "coast"
        : state.feeling === "wine-food"
          ? "wine"
          : state.feeling === "hands-on"
            ? "hands"
            : state.feeling === "hidden"
              ? "local"
              : null;

  if (leadFirst && eligible.includes(leadFirst)) {
    return [leadFirst, ...eligible.filter((kind) => kind !== leadFirst)];
  }
  return eligible;
}


/**
 * Coast answers. The Arrábida trio is offered wherever those routes exist; the
 * remote southwest is only offered where the Vicentine product is reachable.
 */
function coastOptions(state: StudioV3State): ChoiceOption<AdaptiveRefinementId>[] {
  const options: ChoiceOption<AdaptiveRefinementId>[] = [];

  if (ARRABIDA_REFINEMENT_DESTINATIONS.has(state.destinationIntent)) {
    options.push(
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
    );
  }

  if (REMOTE_COAST_DESTINATIONS.has(state.destinationIntent)) {
    options.push({
      id: "coast-remote-southwest",
      label: "Far from everything",
      whisper: "The wild southwest: river mouths, villages and open Atlantic.",
    });
  }

  return options;
}

/**
 * Wine answers. Arrábida asks how the wine is met; Alentejo asks which
 * Alentejo — monumental estates or an intimate clay-talha family cellar.
 */
function wineOptions(state: StudioV3State): ChoiceOption<AdaptiveRefinementId>[] {
  const options: ChoiceOption<AdaptiveRefinementId>[] = [];

  if (ARRABIDA_REFINEMENT_DESTINATIONS.has(state.destinationIntent)) {
    options.push(
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
    );
  }

  if (ALENTEJO_WINE_DESTINATIONS.has(state.destinationIntent)) {
    options.push(
      {
        id: "wine-monumental-estates",
        label: "Évora and its estates",
        whisper: "A monumental town and the classic houses of Alentejo wine.",
      },
      {
        id: "wine-clay-talha",
        label: "Clay talhas, one family",
        whisper: "Roman roots, amphora wine and a cellar still run by hand.",
      },
    );
  }

  return options;
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

/** Adaptive question kinds currently available for this state. */
export function availableAdaptiveQuestionKinds(state: StudioV3State): AdaptiveQuestionKind[] {
  return orderedKinds(state);
}

export function resolveAdaptiveQuestion(
  state: StudioV3State,
  preferredKind: AdaptiveQuestionKind | null = null,
): AdaptiveQuestion | null {
  if (!state.feeling && state.interests.length === 0) return null;

  const available = orderedKinds(state);
  const kind = preferredKind && available.includes(preferredKind) ? preferredKind : available[0];
  if (!kind) return null;

  if (kind === "faith") {
    return {
      kind,
      eyebrow: "Quiet ground",
      title: "You chose a more reflective day.",
      titleAccent: "Which thread matters more?",
      hint: "",
      options: [
        {
          id: "faith-sanctuary-time",
          label: "Sanctuary time",
          whisper: "Unhurried time where people come to pray.",
        },
        {
          id: "faith-templar-heritage",
          label: "Sacred heritage",
          whisper: "Centuries of stone, orders and scholarship.",
        },
        {
          id: "faith-quiet-reflection",
          label: "Keep it simply quiet",
          whisper: "No religious stop or programme — just space to reflect.",
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
      hint: "",
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
    const options = coastOptions(state);
    if (options.length < 2) return null;
    return {
      kind,
      eyebrow: "The Atlantic",
      title: "How should the coast",
      titleAccent: "reach you?",
      hint: "",
      options,
    };
  }

  if (kind === "wine") {
    const options = wineOptions(state);
    if (options.length < 2) return null;
    return {
      kind,
      eyebrow: "The table",
      title: "What should the wine",
      titleAccent: "be about?",
      hint: "",
      options,
    };
  }

  if (kind === "hands") {
    return {
      kind,
      eyebrow: "By hand",
      title: "Which craft would you rather",
      titleAccent: "get your hands into?",
      hint: "",
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
          label: "No workshop — I'd rather observe",
          whisper: "No workshop is added to your day.",
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
    hint: "",
    options,
  };
}

export function isAdaptiveQuestionRelevant(state: StudioV3State): boolean {
  return resolveAdaptiveQuestion(state) !== null;
}
