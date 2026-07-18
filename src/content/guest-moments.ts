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

import barrelCellar from "@/assets/owner-photos/barrel-cellar-tasting.jpeg.asset.json";
import azulejoMaster from "@/assets/owner-photos/azulejo-master-painter.jpeg.asset.json";
import couplePetiscos from "@/assets/owner-photos/couple-petiscos-patio.jpeg.asset.json";
import portinhoBoardwalk from "@/assets/owner-photos/portinho-boardwalk-couple.jpeg.asset.json";
import moscatelVats from "@/assets/owner-photos/moscatel-giant-vats-guide.jpeg.asset.json";
import azulejoBlueCat from "@/assets/owner-photos/azulejo-blue-cat.jpeg.asset.json";
import portinhoAerial from "@/assets/owner-photos/portinho-aerial-bay.jpeg.asset.json";
import tastingFlight from "@/assets/owner-photos/tasting-flight-full.jpeg.asset.json";
import sintraGroup from "@/assets/owner-photos/sintra-group-selfie.jpeg.asset.json";
import arrabidaViewpointWomen from "@/assets/owner-photos/arrabida-viewpoint-women.jpeg.asset.json";

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

export const MOMENT_BARREL_CELLAR: GuestMoment = {
  src: barrelCellar.url,
  alt: "A private group tasting wine at long wooden benches inside a Setúbal peninsula barrel cellar.",
  caption: "In the barrel room, wine tells its own story.",
};

export const MOMENT_AZULEJO_MASTER: GuestMoment = {
  src: azulejoMaster.url,
  alt: "A master tile-painter tracing a hand-drawn azulejo pattern at his Azeitão workshop bench.",
  caption: "A tile, drawn by hand — the way it has always been done.",
};

export const MOMENT_COUPLE_PETISCOS: GuestMoment = {
  src: couplePetiscos.url,
  alt: "A young couple enjoying white wine and a petiscos board on the terrace of a Setúbal peninsula winery.",
  caption: "A glass, a board of petiscos, no rush at all.",
};

export const MOMENT_PORTINHO_BOARDWALK: GuestMoment = {
  src: portinhoBoardwalk.url,
  alt: "A couple sharing a kiss on the wooden Portinho da Arrábida boardwalk with the Tróia sandbar behind them.",
  caption: "Above Portinho — the view no one wants to leave.",
};

export const MOMENT_MOSCATEL_VATS: GuestMoment = {
  src: moscatelVats.url,
  alt: "A guide presenting the giant 19th-century oak Moscatel vats to a small group inside a historic Setúbal cellar.",
  caption: "Twenty thousand litres, aging quietly since 1834.",
};

export const MOMENT_AZULEJO_BLUE_CAT: GuestMoment = {
  src: azulejoBlueCat.url,
  alt: "An artisan hand-painting a blue cat motif onto a raw ceramic tile during a workshop in Azeitão.",
  caption: "One brush, one cat, one afternoon in Azeitão.",
};

export const MOMENT_PORTINHO_AERIAL: GuestMoment = {
  src: portinhoAerial.url,
  alt: "Aerial view of Portinho da Arrábida — turquoise water, anchored boats, wooded cliffs above the beach.",
  caption: "Portinho da Arrábida — Portugal's quiet Caribbean.",
};

export const MOMENT_TASTING_FLIGHT: GuestMoment = {
  src: tastingFlight.url,
  alt: "A tray of tasting glasses lined up — dry white, red, and aged Moscatel — at a Setúbal peninsula cellar.",
  caption: "A full flight — from crisp white to aged Moscatel.",
};

export const MOMENT_SINTRA_GROUP: GuestMoment = {
  src: sintraGroup.url,
  alt: "A large private group photographed with their local guide on a cobbled Sintra street in the morning.",
  caption: "Sintra mornings — the whole group, one story.",
};

export const MOMENT_ARRABIDA_VIEWPOINT_WOMEN: GuestMoment = {
  src: arrabidaViewpointWomen.url,
  alt: "Two women looking out from the Serra da Arrábida viewpoint over the turquoise bay and Tróia sandbar.",
  caption: "The Serra viewpoint — Tróia stretching out below.",
};

// Curated sets per surface. HOMEPAGE + CORPORATE are people-only
// (highest conversion signal). Landscape / still-life scenes moved to
// <AmbientLandscapeStrip> ambient blocks.
export const HOMEPAGE_MOMENTS = [
  MOMENT_PORTINHO_BOARDWALK,
  MOMENT_WINE_CHEERS,
  MOMENT_SINTRA_GROUP,
  MOMENT_COUPLE_PETISCOS,
  MOMENT_AZULEJO_MASTER,
  MOMENT_ARRABIDA_VIEW,
  MOMENT_TASTING_CAKE,
  MOMENT_ARRABIDA_VIEWPOINT_WOMEN,
];

export const ABOUT_MOMENTS = [
  MOMENT_SINTRA_GROUP,
  MOMENT_ARRABIDA_VIEWPOINT_WOMEN,
  MOMENT_AZULEJO_MASTER,
  MOMENT_TASTING_CAKE,
];

export const CORPORATE_MOMENTS = [
  MOMENT_SINTRA_GROUP,
  MOMENT_WINERY_GROUP,
  MOMENT_BARREL_CELLAR,
  MOMENT_WINE_CHEERS,
  MOMENT_MOSCATEL_VATS,
  MOMENT_ARRABIDA_VIEW,
];

export const MULTI_DAY_MOMENTS = [
  MOMENT_ARRABIDA_VIEW,
  MOMENT_TASTING_FLIGHT,
  MOMENT_MOSCATEL_VATS,
  MOMENT_AZULEJO_BLUE_CAT,
];

