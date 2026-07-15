/**
 * Guest moments — real, owner-supplied photography with editorial
 * captions. Single source of truth used by Homepage / About /
 * Corporate / Multi-day via <GuestMomentsStrip />.
 *
 * NEVER invent captions for photos we cannot verify. Every entry here
 * is a real, on-brand scene from an actual YES journey.
 */
import arrabidaGroup from "@/assets/owner-photos/arrabida-viewpoint-group.jpeg.asset.json";
import wineryGroup from "@/assets/owner-photos/winery-group-orange-tree.jpeg.asset.json";
import tastingCake from "@/assets/owner-photos/tasting-cake-moment.jpeg.asset.json";
import wineCheers from "@/assets/owner-photos/wine-cheers-arch.jpeg.asset.json";
import coupleVineyard from "@/assets/owner-photos/couple-vineyard.jpeg.asset.json";
import corkHarvest from "@/assets/owner-photos/cork-harvesters-alentejo.jpeg.asset.json";
import potter from "@/assets/owner-photos/potter-wheel-azeitao.jpeg.asset.json";
import ceramicPainter from "@/assets/owner-photos/ceramic-painter-plate.jpeg.asset.json";

import type { GuestMoment } from "@/components/ui/GuestMomentsStrip";

export const MOMENT_ARRABIDA_VIEW: GuestMoment = {
  src: arrabidaGroup.url,
  alt: "A group of guests pausing at the Serra da Arrábida viewpoint, Atlantic behind them.",
  caption: "Serra da Arrábida — the pause everyone remembers.",
};

export const MOMENT_WINERY_GROUP: GuestMoment = {
  src: wineryGroup.url,
  alt: "A large private group welcomed at the gate of a Setúbal peninsula winery, orange trees in bloom.",
  caption: "A whole group, welcomed at the winery gate.",
};

export const MOMENT_TASTING_CAKE: GuestMoment = {
  src: tastingCake.url,
  alt: "A guest slicing a house-baked chocolate cake at a Portuguese winery lunch table.",
  caption: "House-baked chocolate cake, poured slowly.",
};

export const MOMENT_WINE_CHEERS: GuestMoment = {
  src: wineCheers.url,
  alt: "Guests raising sparkling wine glasses under an arched veranda at Quinta Catralvos.",
  caption: "Sparkling under the arch, mid-afternoon.",
};

export const MOMENT_COUPLE_VINEYARD: GuestMoment = {
  src: coupleVineyard.url,
  alt: "A couple embracing between winter vines in a Setúbal peninsula vineyard.",
  caption: "Between the vines, in low winter light.",
};

export const MOMENT_CORK_HARVEST: GuestMoment = {
  src: corkHarvest.url,
  alt: "Two Alentejo cork harvesters carefully stripping bark from a cork oak in high summer.",
  caption: "Cork harvest, Alentejo — nine years of patience.",
};

export const MOMENT_POTTER: GuestMoment = {
  src: potter.url,
  alt: "An Azeitão potter shaping a clay bowl on a wheel in his workshop.",
  caption: "The potter's wheel, Azeitão.",
};

export const MOMENT_CERAMIC_PAINTER: GuestMoment = {
  src: ceramicPainter.url,
  alt: "A ceramist hand-painting a botanical motif on an unfired plate.",
  caption: "One line, one leaf, one plate at a time.",
};

// Curated sets per surface.
export const HOMEPAGE_MOMENTS = [
  MOMENT_ARRABIDA_VIEW,
  MOMENT_WINERY_GROUP,
  MOMENT_TASTING_CAKE,
  MOMENT_WINE_CHEERS,
  MOMENT_COUPLE_VINEYARD,
];

export const ABOUT_MOMENTS = [
  MOMENT_ARRABIDA_VIEW,
  MOMENT_WINERY_GROUP,
  MOMENT_TASTING_CAKE,
  MOMENT_WINE_CHEERS,
];

export const CORPORATE_MOMENTS = [MOMENT_WINERY_GROUP, MOMENT_WINE_CHEERS, MOMENT_TASTING_CAKE];

export const MULTI_DAY_MOMENTS = [
  MOMENT_CORK_HARVEST,
  MOMENT_POTTER,
  MOMENT_CERAMIC_PAINTER,
  MOMENT_COUPLE_VINEYARD,
];
