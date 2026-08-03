import { REGION_STOP_POOL, type OptionalStop, type OptionalStopType } from "@/data/regionStopPool";
import { ADD_ON_CATALOG } from "@/data/signatureAddOns";
import {
  MERCADO_DO_LIVRAMENTO_STOP_ID,
  isMercadoDoLivramentoOpenOn,
} from "@/components/studio-v3/dateGuards";
import {
  applyLivingAtlasReplacements,
  buildLivingAtlasAlternatives,
  type LivingAtlasAlternativesBySlot,
  type LivingAtlasReplacementMap,
  type LivingAtlasResolvedComposition,
} from "@/components/studio-v3/livingAtlasAlternatives";
import {
  composeLivingAtlasDay,
  type LivingAtlasComposition,
  type LivingAtlasCompositionRequest,
  type LivingAtlasDensity,
} from "@/components/studio-v3/livingAtlasComposer";
import {
  planLivingAtlasRoute,
  type LivingAtlasRoutePlan,
} from "@/components/studio-v3/livingAtlasRoutePlanner";
import { applyLivingAtlasSchedule } from "@/components/studio-v3/livingAtlasSchedule";
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

export type LivingAtlasPreviewResolution = {
  request: LivingAtlasCompositionRequest;
  baseComposition: LivingAtlasComposition;
  composition: LivingAtlasResolvedComposition;
  alternativesBySlot: LivingAtlasAlternativesBySlot;
  routePlan: LivingAtlasRoutePlan;
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
  const addOn = ADD_ON_CATALOG["lisbon-arrabida"].find((item) => item.id === "coastal-boat-ride");
  if (!addOn) return null;

  return {
    id: addOn.id,
    region: "arrabida-setubal",
    subregion: "Sesimbra",
    name: addOn.label,
    type: "boat",
    coords: { lat: 38.4444, lng: -9.1011 },
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
      "Verified sibling-Signature experience from the existing add-on catalogue. Sesimbra coordinates are used for planning orientation only; departure point, sea and supplier conditions still require confirmation.",
  };
}

/** Preview-only inventory overlay. No Supabase or production mutation. */
export function getLivingAtlasPreviewPool(): OptionalStop[] {
  const boat = verifiedArrabidaBoatStop();
  if (!boat || REGION_STOP_POOL.some((stop) => stop.id === boat.id)) {
    return [...REGION_STOP_POOL];
  }
  return [...REGION_STOP_POOL, boat];
}

function poolForDate(pool: readonly OptionalStop[], selectedDate: string | null | undefined) {
  if (!selectedDate || isMercadoDoLivramentoOpenOn(selectedDate)) return [...pool];
  return pool.filter((stop) => stop.id !== MERCADO_DO_LIVRAMENTO_STOP_ID);
}

export function deriveLivingAtlasPreviewRequest(input: {
  anchorSignatureId: LivingAtlasSignatureId;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  selectedDate?: string | null;
  pool?: readonly OptionalStop[];
}): LivingAtlasCompositionRequest {
  const { anchorSignatureId, profile, preferences, selectedDate } = input;
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
    if (preferences.atlanticMode === "boat" && isArrabida) {
      requiredTypes.push("boat");
    }
    if (preferences.atlanticMode === "coast") {
      preferredTypes.push("beach", "viewpoint", "nature");
      if (isArrabida) mustIncludeStopIds.push("parque-natural-arrabida");
    }
  }

  if (profile.selected.includes("local-life") && isArrabida) {
    if (preferences.localMoment === "market") {
      if (!selectedDate || isMercadoDoLivramentoOpenOn(selectedDate)) {
        mustIncludeStopIds.push(MERCADO_DO_LIVRAMENTO_STOP_ID);
      } else {
        preferredTypes.push("village");
      }
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
    mustIncludeStopIds: unique(mustIncludeStopIds),
    pool: input.pool ?? getLivingAtlasPreviewPool(),
  };
}

export function resolveLivingAtlasPreviewDay(input: {
  anchorSignatureId: LivingAtlasSignatureId;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  selectedDate?: string | null;
  replacements?: LivingAtlasReplacementMap;
  pool?: readonly OptionalStop[];
}): LivingAtlasPreviewResolution {
  const rawPool = input.pool ?? getLivingAtlasPreviewPool();
  const pool = poolForDate(rawPool, input.selectedDate);
  const request = deriveLivingAtlasPreviewRequest({ ...input, pool });
  const baseComposition = composeLivingAtlasDay(request);
  const composition = applyLivingAtlasReplacements({
    baseComposition,
    request,
    replacements: input.replacements,
    pool,
  });
  const alternativesBySlot = buildLivingAtlasAlternatives({
    baseComposition,
    composition,
    request,
    replacements: composition.appliedReplacements,
    pool,
  });
  const geographicRoute = planLivingAtlasRoute({ composition, pool });
  const routePlan = applyLivingAtlasSchedule({
    routePlan: geographicRoute,
    pool,
    selectedDate: input.selectedDate ?? null,
  });

  return { request, baseComposition, composition, alternativesBySlot, routePlan };
}

export function composeLivingAtlasPreviewDay(input: {
  anchorSignatureId: LivingAtlasSignatureId;
  profile: ExperienceProfile;
  preferences: LivingAtlasPreviewPreferences;
  selectedDate?: string | null;
  replacements?: LivingAtlasReplacementMap;
  pool?: readonly OptionalStop[];
}): LivingAtlasResolvedComposition {
  return resolveLivingAtlasPreviewDay(input).composition;
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
export function livingAtlasPreviewDayTitle(
  composition: Pick<LivingAtlasComposition, "moments">,
): string {
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
