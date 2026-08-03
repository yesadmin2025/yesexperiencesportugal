import type { DestinationIntent } from "@/components/studio-v3/types";
import {
  LIVING_ATLAS_DISCOVERY_SIGNAL_IDS,
  type LivingAtlasDiscoverySignal,
} from "@/components/studio-v3/livingAtlasDecision";
import type { LivingAtlasReplacementMap } from "@/components/studio-v3/livingAtlasAlternatives";
import {
  DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES,
  type LivingAtlasPreviewPreferences,
} from "@/components/studio-v3/livingAtlasPreviewComposition";
import {
  EXPERIENCE_DIMENSIONS,
  MAX_LEAD_DIMENSIONS,
  MAX_SELECTED_DIMENSIONS,
  type ExperienceDimensionId,
} from "@/components/studio-v3/livingAtlasTaxonomy";

export const LIVING_ATLAS_PREVIEW_STORAGE_KEY = "yes.living-atlas-preview.v1";

export const LIVING_ATLAS_PREVIEW_STAGES = [
  "entry",
  "destination",
  "interests",
  "priority",
  "result",
  "shape",
] as const;
export type LivingAtlasPreviewStage = (typeof LIVING_ATLAS_PREVIEW_STAGES)[number];

export const LIVING_ATLAS_PREVIEW_PATH_MODES = ["discover", "destination"] as const;
export type LivingAtlasPreviewPathMode = (typeof LIVING_ATLAS_PREVIEW_PATH_MODES)[number];

const DESTINATION_INTENTS: readonly DestinationIntent[] = [
  "no-preference",
  "lisbon-sintra-cascais",
  "arrabida-setubal-azeitao",
  "alentejo-evora-wine",
  "alentejo-roman-talha",
  "vicentine-coast",
  "comporta-troia",
  "spiritual-coast",
  "central-portugal",
  "anywhere-special",
];

const DIMENSION_IDS = new Set<string>(EXPERIENCE_DIMENSIONS.map((item) => item.id));
const DISCOVERY_SIGNAL_IDS = new Set<string>(LIVING_ATLAS_DISCOVERY_SIGNAL_IDS);
const STAGE_IDS = new Set<string>(LIVING_ATLAS_PREVIEW_STAGES);
const PATH_MODE_IDS = new Set<string>(LIVING_ATLAS_PREVIEW_PATH_MODES);
const DESTINATION_IDS = new Set<string>(DESTINATION_INTENTS);

export type LivingAtlasPreviewPersistedState = {
  version: 1;
  stage: LivingAtlasPreviewStage;
  pathMode: LivingAtlasPreviewPathMode | null;
  destinationIntent: DestinationIntent;
  selected: ExperienceDimensionId[];
  leads: ExperienceDimensionId[];
  discoverySignal: LivingAtlasDiscoverySignal | null;
  preferences: LivingAtlasPreviewPreferences;
  replacements: LivingAtlasReplacementMap;
  updatedAt: string;
};

export type LivingAtlasPreviewStateInput = Omit<
  LivingAtlasPreviewPersistedState,
  "version" | "updatedAt"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueDimensions(value: unknown, max: number): ExperienceDimensionId[] {
  if (!Array.isArray(value)) return [];
  const dimensions = value.filter(
    (item): item is ExperienceDimensionId => typeof item === "string" && DIMENSION_IDS.has(item),
  );
  return [...new Set(dimensions)].slice(0, max);
}

function safePreferences(value: unknown): LivingAtlasPreviewPreferences {
  if (!isRecord(value)) return DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES;
  const density = ["slow", "balanced", "rich"].includes(String(value.density))
    ? (value.density as LivingAtlasPreviewPreferences["density"])
    : DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES.density;
  const wineEmphasis = ["one-winery", "wine-centred"].includes(String(value.wineEmphasis))
    ? (value.wineEmphasis as LivingAtlasPreviewPreferences["wineEmphasis"])
    : DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES.wineEmphasis;
  const atlanticMode = ["coast", "boat"].includes(String(value.atlanticMode))
    ? (value.atlanticMode as LivingAtlasPreviewPreferences["atlanticMode"])
    : DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES.atlanticMode;
  const localMoment = ["market", "village"].includes(String(value.localMoment))
    ? (value.localMoment as LivingAtlasPreviewPreferences["localMoment"])
    : DEFAULT_LIVING_ATLAS_PREVIEW_PREFERENCES.localMoment;

  return { density, wineEmphasis, atlanticMode, localMoment };
}

function safeReplacements(value: unknown): LivingAtlasReplacementMap {
  if (!isRecord(value)) return {};
  const replacements: LivingAtlasReplacementMap = {};
  for (const [slotId, stopId] of Object.entries(value).slice(0, 20)) {
    if (
      slotId.length > 0 &&
      slotId.length <= 120 &&
      typeof stopId === "string" &&
      stopId.length > 0 &&
      stopId.length <= 120
    ) {
      replacements[slotId] = stopId;
    }
  }
  return replacements;
}

function correctStage(input: {
  requested: LivingAtlasPreviewStage;
  selected: ExperienceDimensionId[];
  leads: ExperienceDimensionId[];
  pathMode: LivingAtlasPreviewPathMode | null;
}): LivingAtlasPreviewStage {
  if (input.requested === "entry" || input.requested === "destination") return input.requested;
  if (input.selected.length === 0)
    return input.pathMode === "destination" ? "destination" : "entry";
  if (["result", "shape"].includes(input.requested) && input.leads.length === 0) {
    return input.selected.length > 1 ? "priority" : "interests";
  }
  return input.requested;
}

export function parseLivingAtlasPreviewState(
  raw: string | null,
): LivingAtlasPreviewPersistedState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return null;

    const selected = uniqueDimensions(parsed.selected, MAX_SELECTED_DIMENSIONS);
    const leads = uniqueDimensions(parsed.leads, MAX_LEAD_DIMENSIONS).filter((item) =>
      selected.includes(item),
    );
    const requestedStage = STAGE_IDS.has(String(parsed.stage))
      ? (parsed.stage as LivingAtlasPreviewStage)
      : "entry";
    const pathMode =
      parsed.pathMode == null
        ? null
        : PATH_MODE_IDS.has(String(parsed.pathMode))
          ? (parsed.pathMode as LivingAtlasPreviewPathMode)
          : null;
    const destinationIntent = DESTINATION_IDS.has(String(parsed.destinationIntent))
      ? (parsed.destinationIntent as DestinationIntent)
      : "no-preference";
    const discoverySignal =
      parsed.discoverySignal == null
        ? null
        : DISCOVERY_SIGNAL_IDS.has(String(parsed.discoverySignal))
          ? (parsed.discoverySignal as LivingAtlasDiscoverySignal)
          : null;
    const stage = correctStage({ requested: requestedStage, selected, leads, pathMode });

    return {
      version: 1,
      stage,
      pathMode,
      destinationIntent,
      selected,
      leads,
      discoverySignal,
      preferences: safePreferences(parsed.preferences),
      replacements: safeReplacements(parsed.replacements),
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeLivingAtlasPreviewState(input: LivingAtlasPreviewStateInput): string {
  const state: LivingAtlasPreviewPersistedState = {
    ...input,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(state);
}

export function loadLivingAtlasPreviewState(): LivingAtlasPreviewPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    return parseLivingAtlasPreviewState(
      window.localStorage.getItem(LIVING_ATLAS_PREVIEW_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function saveLivingAtlasPreviewState(input: LivingAtlasPreviewStateInput): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      LIVING_ATLAS_PREVIEW_STORAGE_KEY,
      serializeLivingAtlasPreviewState(input),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearLivingAtlasPreviewState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LIVING_ATLAS_PREVIEW_STORAGE_KEY);
  } catch {
    // Storage is a progressive enhancement. The preview still works without it.
  }
}
