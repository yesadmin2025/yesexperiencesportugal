/**
 * Adaptive (conditional) refinement question for Studio V3.
 *
 * ONE extra question, asked only when the traveller's own answers make it
 * genuinely useful. When nothing relevant applies the phase is skipped
 * entirely (see `isPhaseRelevant` in curation.ts), so the Studio never
 * feels like a form.
 *
 * Rules encoded here:
 *   - Boat / coast refinement only when Atlantic or coastal intent is present
 *     AND the chosen destination can actually reach the Atlantic.
 *   - Winery emphasis only when wine or the Portuguese table is selected or leads.
 *   - Market / local-life refinement only when local life is selected, with
 *     options limited to what the chosen region really offers.
 *   - Hands-on refinement only for the regions whose Signature routes include
 *     real workshops (Azeitão tiles, Azeitão cheese).
 *   - Child ages stay where they belong: the guest composition step, shown only
 *     when minors travel (pricing + suitability).
 *
 * Every answer maps to an existing Living Atlas discovery signal (or to
 * nothing at all). Nothing here invents a stop, a supplier or a price.
 */

import type { LivingAtlasDiscoverySignal } from "@/components/studio-v3/livingAtlasDecision";
import type { AdaptiveRefinementId, ChoiceOption, StudioV3State } from "@/components/studio-v3/types";

export type AdaptiveQuestionKind = "coast" | "wine" | "hands" | "local";

export interface AdaptiveQuestion {
  kind: AdaptiveQuestionKind;
  eyebrow: string;
  title: string;
  titleAccent: string;
  hint: string;
  options: ChoiceOption<AdaptiveRefinementId>[];
}

/** Destinations whose Signature routes actually meet the Atlantic. */
const COASTAL_DESTINATIONS = new Set([
  "no-preference",
  "anywhere-special",
  "arrabida-setubal-azeitao",
  "vicentine-coast",
  "comporta-troia",
  "lisbon-sintra-cascais",
  "spiritual-coast",
]);

/** Destinations with a real hands-on workshop in the catalogue. */
const HANDS_ON_DESTINATIONS = new Set([
  "no-preference",
  "anywhere-special",
  "arrabida-setubal-azeitao",
]);

/** Destinations where rice fields and river villages are on the route. */
const RIVER_DESTINATIONS = new Set(["no-preference", "anywhere-special", "comporta-troia"]);

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
};

/** Customer-safe short label used in the Travel File "what you asked for" list. */
const REFINEMENT_SUMMARY: Readonly<Record<AdaptiveRefinementId, string>> = {
  "coast-from-the-water": "The coast seen from the water",
  "coast-wild-beaches": "Wild beaches and a long pause",
  "coast-clifftop-views": "Clifftop views over the Atlantic",
  "wine-cellar-depth": "Time inside the cellar",
  "wine-table-and-cheese": "The table, cheese and local produce",
  "wine-vineyard-views": "Vineyard views over tasting notes",
  "hands-paint-tile": "Painting your own azulejo tile",
  "hands-make-cheese": "Making Azeitão cheese by hand",
  "hands-just-watch": "Watching the craft, hands free",
  "local-river-and-rice": "Rice fields and river villages",
  "local-market-morning": "A market morning among locals",
  "local-artisans": "Artisans at work",
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
  if (!COASTAL_DESTINATIONS.has(state.destinationIntent)) return false;
  return (
    state.feeling === "coastal" ||
    state.feeling === "adventure" ||
    state.interests.includes("coast")
  );
}

function wineRelevant(state: StudioV3State): boolean {
  return (
    state.feeling === "wine-food" ||
    state.interests.includes("wine") ||
    state.interests.includes("gastronomy")
  );
}

function handsRelevant(state: StudioV3State): boolean {
  if (!HANDS_ON_DESTINATIONS.has(state.destinationIntent)) return false;
  // Hands-on only makes sense when the traveller leans local or heritage —
  // it is never offered as a generic upsell.
  return (
    state.interests.includes("local-life") ||
    state.interests.includes("heritage") ||
    state.feeling === "hidden" ||
    state.feeling === "culture"
  );
}

function localRelevant(state: StudioV3State): boolean {
  return state.interests.includes("local-life") || state.feeling === "hidden";
}

/**
 * Priority: whatever the traveller said should LEAD the day gets refined
 * first. Only one question is ever asked.
 */
function orderedKinds(state: StudioV3State): AdaptiveQuestionKind[] {
  const available: AdaptiveQuestionKind[] = [];
  if (coastRelevant(state)) available.push("coast");
  if (wineRelevant(state)) available.push("wine");
  if (handsRelevant(state)) available.push("hands");
  if (localRelevant(state)) available.push("local");

  const leadFirst: AdaptiveQuestionKind | null =
    state.feeling === "coastal" || state.feeling === "adventure"
      ? "coast"
      : state.feeling === "wine-food" || state.feeling === "slow-luxury"
        ? "wine"
        : state.feeling === "culture"
          ? "hands"
          : state.feeling === "hidden"
            ? "local"
            : null;

  if (leadFirst && available.includes(leadFirst)) {
    return [leadFirst, ...available.filter((k) => k !== leadFirst)];
  }
  return available;
}

export function resolveAdaptiveQuestion(state: StudioV3State): AdaptiveQuestion | null {
  // Nothing to refine before the traveller has told us how the day should
  // feel and what belongs in it.
  if (!state.feeling && state.interests.length === 0) return null;

  const kind = orderedKinds(state)[0];
  if (!kind) return null;

  if (kind === "coast") {
    return {
      kind,
      eyebrow: "The Atlantic",
      title: "How should the coast",
      titleAccent: "reach you?",
      hint: "This shapes how the shoreline enters your day.",
      options: [
        {
          id: "coast-from-the-water",
          label: "From the water",
          whisper: "Caves and cliffs seen from a private boat.",
        },
        {
          id: "coast-wild-beaches",
          label: "On a wild beach",
          whisper: "Sand, a long pause, nobody around.",
        },
        {
          id: "coast-clifftop-views",
          label: "From above",
          whisper: "Clifftop viewpoints, feet on solid ground.",
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
      hint: "This shapes where the longest pause of the day happens.",
      options: [
        {
          id: "wine-cellar-depth",
          label: "Inside the cellar",
          whisper: "Barrels, the family, how it is really made.",
        },
        {
          id: "wine-table-and-cheese",
          label: "Around the table",
          whisper: "Cheese, bread and local produce, unhurried.",
        },
        {
          id: "wine-vineyard-views",
          label: "Out among the vines",
          whisper: "The landscape first, the glass second.",
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
      hint: "Only offered where a real workshop is part of the route.",
      options: [
        {
          id: "hands-paint-tile",
          label: "Paint an azulejo",
          whisper: "Your own tile, fired and sent to you.",
        },
        {
          id: "hands-make-cheese",
          label: "Make Azeitão cheese",
          whisper: "Hands in the curd, with the producers.",
        },
        {
          id: "hands-just-watch",
          label: "Just watch",
          whisper: "See the craft, keep your hands free.",
        },
      ],
    };
  }

  const riverOption: ChoiceOption<AdaptiveRefinementId> = {
    id: "local-river-and-rice",
    label: "Rice fields and river villages",
    whisper: "Water, storks and low white houses.",
  };
  return {
    kind: "local",
    eyebrow: "Local life",
    title: "Where do you want to",
    titleAccent: "meet the everyday?",
    hint: "This decides which quiet part of the region we build around.",
    options: [
      {
        id: "local-market-morning",
        label: "A market morning",
        whisper: "Fish, fruit and the language of a working town.",
      },
      {
        id: "local-artisans",
        label: "Artisans at work",
        whisper: "Workshops that still smell of clay and paint.",
      },
      ...(RIVER_DESTINATIONS.has(state.destinationIntent) ? [riverOption] : []),
    ],
  };
}

/** True when the adaptive refinement step should be shown at all. */
export function isAdaptiveQuestionRelevant(state: StudioV3State): boolean {
  return resolveAdaptiveQuestion(state) !== null;
}
