/**
 * TURBO 2 — IMAGE-LED FORK MEDIA.
 *
 * A Director fork becomes image-led ONLY when every option it offers has an
 * honest, DISTINCT photograph already in the project. Two options may never
 * share a frame, and no option ever gets an invented or unrelated picture.
 * Anything that fails those rules stays a text fork — the Director's decision
 * and option order are untouched either way.
 *
 * Presentation only. Never a signal, never a recommendation.
 */

import atmCoastal from "@/assets/studio/atm-coastal-cinematic.jpg";
import atmCultural from "@/assets/studio/atm-elegant-cultural.jpg";
import atmScenic from "@/assets/studio/atm-relaxed-scenic.jpg";
import editCoastalRoad from "@/assets/edit-coastal-road.jpg";
import editMarket from "@/assets/edit-market.jpg";
import editViewpoint from "@/assets/edit-viewpoint.jpg";
import editWinery from "@/assets/edit-winery.jpg";
import expCoastal from "@/assets/exp-coastal.jpg";
import expGastronomy from "@/assets/exp-gastronomy.jpg";
import expNature from "@/assets/exp-nature.jpg";
import expStreet from "@/assets/exp-street.jpg";
import expWine from "@/assets/exp-wine.jpg";

import type { StudioMedia } from "@/lib/studio-v3/studioMediaResolver";

type ForkImage = { id: string; src: string; alt: string };

/** Closed map. An option absent from here can never be shown image-led. */
const FORK_IMAGE: Readonly<Record<string, ForkImage>> = {
  "coast-from-the-water": {
    id: "media:fork:coast-from-the-water",
    src: expCoastal,
    alt: "A cove below Arrábida cliffs, seen from the water.",
  },
  "coast-wild-beaches": {
    id: "media:fork:coast-wild-beaches",
    src: atmCoastal,
    alt: "Open Atlantic sand with cliffs behind and nobody in sight.",
  },
  "coast-clifftop-views": {
    id: "media:fork:coast-clifftop-views",
    src: editViewpoint,
    alt: "A clifftop viewpoint with long evening light over the ocean.",
  },
  "coast-remote-southwest": {
    id: "media:fork:coast-remote-southwest",
    src: editCoastalRoad,
    alt: "A quiet road tracing the wild southwest coastline.",
  },
  "wine-cellar-depth": {
    id: "media:fork:wine-cellar-depth",
    src: expWine,
    alt: "A cool cellar tasting of Portuguese wine.",
  },
  "wine-table-and-cheese": {
    id: "media:fork:wine-table-and-cheese",
    src: expGastronomy,
    alt: "A regional table of cheese, bread and wine.",
  },
  "wine-vineyard-views": {
    id: "media:fork:wine-vineyard-views",
    src: editWinery,
    alt: "Vine rows running away from a working estate.",
  },
  "wine-monumental-estates": {
    id: "media:fork:wine-monumental-estates",
    src: atmScenic,
    alt: "A wide estate landscape under an open southern sky.",
  },
  "hands-paint-tile": {
    id: "media:fork:hands-paint-tile",
    src: atmCultural,
    alt: "Azulejo panels and stonework in soft window light.",
  },
  "hands-make-cheese": {
    id: "media:fork:hands-make-cheese",
    src: editMarket,
    alt: "Local hands at work at a Portuguese market stall.",
  },
  "hands-just-watch": {
    id: "media:fork:hands-just-watch",
    src: expStreet,
    alt: "A Portuguese street in ordinary afternoon light.",
  },
  "local-river-and-rice": {
    id: "media:fork:local-river-and-rice",
    src: expNature,
    alt: "Flat water and green fields opening toward the horizon.",
  },
  "local-market-morning": {
    id: "media:fork:local-market-morning",
    src: editMarket,
    alt: "A morning market counter piled with regional produce.",
  },
  "local-artisans": {
    id: "media:fork:local-artisans",
    src: atmCultural,
    alt: "Handmade tile and stone detail in a workshop interior.",
  },
};

/**
 * Media for one ordered fork, or `null` when the fork must stay textual.
 * Returns entries in the SAME order it received the ids.
 */
export function resolveForkMedia(orderedOptionIds: readonly string[]): StudioMedia[] | null {
  if (orderedOptionIds.length < 2) return null;
  const resolved: StudioMedia[] = [];
  const seenSrc = new Set<string>();
  for (const id of orderedOptionIds) {
    const image = FORK_IMAGE[id];
    if (!image) return null;
    if (seenSrc.has(image.src)) return null;
    seenSrc.add(image.src);
    resolved.push({ ...image, role: "studio_fork", source: "mood" });
  }
  return resolved;
}
