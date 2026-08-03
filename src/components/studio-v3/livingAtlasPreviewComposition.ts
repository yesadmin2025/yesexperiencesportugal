import {
  REGION_STOP_POOL,
  type OptionalStop,
  type OptionalStopType,
} from "@/data/regionStopPool";
import { ADD_ON_CATALOG } from "@/data/signatureAddOns";
import {
  composeLivingAtlasDay,
  type LivingAtlasComposition,
  type LivingAtlasCompositionRequest,
  type LivingAtlasDensity,
} from "@/components/studio-v3/livingAtlasComposer";
import type {
  ExperienceDimensionId,
  ExperienceProfile,
  LivingAtlasSignatureId,
} from "@/components/studio-v3/livingAtlasTaxonomy";

export type LivingAtlasWineEmphasis = "one-winery" | "wine-centred";
export type LivingAtlasAtlanticMode = "coast" | "boat";
export type LivingAtlasLocalMoment = "market" | "village";

export type LivingAtlasPreviewPreferences = {
  density: LivingAtlasDensity;
  wineEmphasis: LivingAtlasWineEmphasis;
  atlanticMode: LivingAtlasAtlanticMode;
  localMoment: LivingAtlasLocalMoment;
};

export const DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES: LivingAtlasPreviewPreferences = {
  density: "balanced",
  wineEmphasis: "one-winery",
  atlanticMode: "coast",
  localMoment: "market",
};

const ARRABIDA_SIGNATURES = new Set<LivingAtlasSignatureId>([
  "arrabida-wine-allinclusive",
  "arrabida-boat",
  "wild-beaches-picnic",
  "tiles-workshop",
  "azeitao-cheese",
]);

const DIMENSION_TYPE_PREFERENCES: Readonly<
  Record<ExperienceDimensionId, readonly OptionalStopType[]>
> = {
  "faith-reflection": ["monument", "heritage"],
  "history-heritage": ["monument", "heritage", "village"],
  "wine-table": ["winery", "table", "market"],
  "atlantic-coast": ["boat", "beach", "viewpoint", "nature"],
  "hands-on-traditions": ["workshop", "studio"],
  "local-life": ["market", "village", "table"],
  "nature-landscapes": ["nature", "viewpoint", "beach"],
};

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function verifiedArrabidaBoatStop(): OptionalStop | null {
  const addOn = ADD_ON_CATALOG["lisbon-arrabida"].find(
    (item) => item.id === "coastal-boat-ride",
  );
  if (!addOn) return null;

  return {
    id: addOn.id,
    region: "arrabida-setubal",
    subregion: "Sesimbra",
    name: addOn.label,
    type: "boat",
    suitsInterests: ["coast", "nature", "wonder"],
    suitsRhythm: ["slow", "balanced", "full", "immersive"],
    suitsCompanions: ["solo", "couple", "family", "friends"],
    suitsInvestment: ["considered", "elevated", "bespoke"],
    durationMin: addOn.durationMinutes,
    source: "signature-core",
    signatureTourId: addOn.sourceTourId,
    routeCluster: "arrabida-azeitao-sesimbra",
    active: true,
    notes:
      "Verified sibling-Signature experience from the existing add-on catalogue. Sea and supplier conditions still require confirmation.",
  };
}

/**
 * Preview-only inventory overlay.
 *
 * It reuses the production optional-stop pool and adds one already verified
 * sibling-Signature experience that exists in the add-on catalogue. It does
 * not mutate Supabase or the live Studio inventory.
 */
export function getLivingAtlasPreviewPool(): OptionalStop[] {
  const boat = verifiedArrabidaBoatStop();
  if (!boat || REGION_STOP_POOL.some((stop) => stop.id === boat.id)) {
    return [...REGION_STOP_POOL];
  }
  return [...REGION_STOP_POOL, boat];
}

export function deriveLivingAtlasPreviewRequest(input: {
  anchorSignatureId: LivingAtlasSignatureId;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  pool?: readonly OptionalStop[];
}): LivingAtlasCompositionRequest {
  const { anchorSignatureId, profile, preferences } = input;
  const isArrabida = ARRABIDA_SIGNATURES.has(anchorSignatureId);
  const requiredTypes: OptionalStopType[] = [];
  const preferredTypes = unique(
    profile.selected.flatMap((dimension) => DIMENSION_TYPE_PREFERENCES[dimension]),
  );
  const maxByType: Partial<Record<OptionalStopType, number>> = {};
  const mustIncludeStopIds: string[] = [];

  if (profile.selected.includes("wine-table")) {
    requiredTypes.push("winery");
    if (preferences.wineEmphasis === "one-winery") maxByType.winery = 1;
  }

  if (profile.selected.includes("atlantic-coast")) {
    if (preferences.atlanticMode === "boat" && isArrabida) requiredTypes.push("boat");
    if (preferences.atlanticMode === "coast") preferredTypes.push("beach", "viewpoint");
  }

  if (profile.selected.includes("local-life") && isArrabida) {
    if (preferences.localMoment === "market") {
      mustIncludeStopIds.push("mercado-do-livramento");
    } else {
      preferredTypes.push("village");
    }
  }

  if (profile.selected.includes("hands-on-traditions")) requiredTypes.push("workshop");

  return {
    anchorSignatureId,
    profile,
    density: preferences.density,
    requiredTypes: unique(requiredTypes),
    preferredTypes: unique(preferredTypes),
    maxByType,
    mustIncludeStopIds,
    pool: input.pool ?? getLivingAtlasPreviewPool(),
  };
}

export function composeLivingAtlasPreviewDay(input: {
  anchorSignatureId: LivingAtlasSignatureId;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  pool?: readonly OptionalStop[];
}): LivingAtlasComposition {
  return composeLivingAtlasDay(deriveLivingAtlasPreviewRequest(input));
}

const TYPE_TITLE: Partial<Record<OptionalStopType, string>> = {
  market: "Market",
  winery: "Wine",
  boat: "the Atlantic",
  workshop: "Local Craft",
  village: "Village Life",
  monument: "Living History",
  heritage: "Heritage",
  nature: "Open Landscapes",
  viewpoint: "Wide Horizons",
  beach: "the Coast",
  table: "the Portuguese Table",
};

/** The traveller-facing title comes from the composed day, never the hidden Signature title. */
export function livingAtlasPreviewDayTitle(composition: LivingAtlasComposition): string {
  const chapters = unique(
    composition.moments.map((moment) => TYPE_TITLE[moment.type] ?? moment.label),
  ).slice(0, 3);

  if (chapters.length === 0) return "Your Portugal Day";
  if (chapters.length === 1) return chapters[0];
  if (chapters.length === 2) return `${chapters[0]} & ${chapters[1]}`;
  return `${chapters[0]}, ${chapters[1]} & ${chapters[2]}`;
}

export function formatLivingAtlasDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
