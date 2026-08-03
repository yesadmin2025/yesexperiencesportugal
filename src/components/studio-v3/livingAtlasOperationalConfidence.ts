import type { OptionalStopType } from "@/data/regionStopPool";
import type { LivingAtlasDensity } from "@/components/studio-v3/livingAtlasComposer";
import type { LivingAtlasRouteStatus } from "@/components/studio-v3/livingAtlasRoutePlanner";

export const LIVING_ATLAS_OPERATIONAL_CONDITION_IDS = [
  "verified-structure",
  "supplier-confirmation",
  "sea-conditions",
  "opening-hours",
  "weather-access",
] as const;

export type LivingAtlasOperationalConditionId =
  (typeof LIVING_ATLAS_OPERATIONAL_CONDITION_IDS)[number];

export type LivingAtlasOperationalCondition = {
  id: LivingAtlasOperationalConditionId;
  label: string;
  detail: string;
  tone: "verified" | "check";
};

export type LivingAtlasPaceStatus = "open" | "balanced" | "full" | "review" | "partial";

export type LivingAtlasPaceSummary = {
  status: LivingAtlasPaceStatus;
  label: string;
  detail: string;
  stopMinutes: number;
  transferMinutes: number;
  visiblePlanningMinutes: number;
  stopBudgetMinutes: number;
  stopLoadRatio: number;
  transferLoadRatio: number | null;
};

const CONDITION_CATALOG: Readonly<
  Record<LivingAtlasOperationalConditionId, LivingAtlasOperationalCondition>
> = {
  "verified-structure": {
    id: "verified-structure",
    label: "Verified structure",
    detail: "This moment comes from confirmed Studio or Signature inventory.",
    tone: "verified",
  },
  "supplier-confirmation": {
    id: "supplier-confirmation",
    label: "Supplier confirmation",
    detail: "The experience needs a real supplier or host confirmation before booking.",
    tone: "check",
  },
  "sea-conditions": {
    id: "sea-conditions",
    label: "Sea conditions",
    detail: "Operation depends on safe sea conditions and the confirmed maritime provider.",
    tone: "check",
  },
  "opening-hours": {
    id: "opening-hours",
    label: "Opening hours",
    detail: "The visit must be checked against the selected date and opening schedule.",
    tone: "check",
  },
  "weather-access": {
    id: "weather-access",
    label: "Weather & access",
    detail: "Comfort or access may change with weather, season or local conditions.",
    tone: "check",
  },
};

const SUPPLIER_TYPES = new Set<OptionalStopType>([
  "boat",
  "winery",
  "workshop",
  "studio",
  "table",
]);

const OPENING_HOURS_TYPES = new Set<OptionalStopType>([
  "market",
  "monument",
  "heritage",
  "garden",
]);

const WEATHER_ACCESS_TYPES = new Set<OptionalStopType>([
  "beach",
  "nature",
  "viewpoint",
]);

const STOP_BUDGET_MINUTES: Readonly<Record<LivingAtlasDensity, number>> = {
  slow: 300,
  balanced: 390,
  rich: 480,
};

const TRANSFER_BUDGET_MINUTES = 180;

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

export function livingAtlasOperationalConditions(
  type: OptionalStopType,
): LivingAtlasOperationalCondition[] {
  const ids: LivingAtlasOperationalConditionId[] = ["verified-structure"];

  if (SUPPLIER_TYPES.has(type)) ids.push("supplier-confirmation");
  if (type === "boat") ids.push("sea-conditions");
  if (OPENING_HOURS_TYPES.has(type)) ids.push("opening-hours");
  if (WEATHER_ACCESS_TYPES.has(type)) ids.push("weather-access");

  return [...new Set(ids)].map((id) => CONDITION_CATALOG[id]);
}

export function deriveLivingAtlasPaceSummary(input: {
  density: LivingAtlasDensity;
  stopMinutes: number;
  transferMinutes: number;
  routeStatus: LivingAtlasRouteStatus;
}): LivingAtlasPaceSummary {
  const stopBudgetMinutes = STOP_BUDGET_MINUTES[input.density];
  const stopLoadRatio = roundRatio(input.stopMinutes / stopBudgetMinutes);
  const transferLoadRatio =
    input.routeStatus === "unavailable"
      ? null
      : roundRatio(input.transferMinutes / TRANSFER_BUDGET_MINUTES);
  const visiblePlanningMinutes = input.stopMinutes + input.transferMinutes;

  if (input.routeStatus === "unavailable") {
    return {
      status: "partial",
      label: "Partial load view",
      detail:
        "Stop time is visible, but internal transfer time cannot yet be estimated from the verified coordinates.",
      stopMinutes: input.stopMinutes,
      transferMinutes: input.transferMinutes,
      visiblePlanningMinutes,
      stopBudgetMinutes,
      stopLoadRatio,
      transferLoadRatio,
    };
  }

  if (input.routeStatus === "over-budget") {
    return {
      status: "review",
      label: "Operational review needed",
      detail:
        "The current route exceeds at least one internal distance or driving guideline, even if the stop rhythm still looks comfortable.",
      stopMinutes: input.stopMinutes,
      transferMinutes: input.transferMinutes,
      visiblePlanningMinutes,
      stopBudgetMinutes,
      stopLoadRatio,
      transferLoadRatio,
    };
  }

  const partialSuffix =
    input.routeStatus === "partial" ? " Some unplaced transfers are still outside this view." : "";

  if (stopLoadRatio <= 0.75 && (transferLoadRatio ?? 0) <= 0.6) {
    return {
      status: "open",
      label: "Room to breathe",
      detail:
        "The visible stops and estimated internal transfers leave generous planning space." +
        partialSuffix,
      stopMinutes: input.stopMinutes,
      transferMinutes: input.transferMinutes,
      visiblePlanningMinutes,
      stopBudgetMinutes,
      stopLoadRatio,
      transferLoadRatio,
    };
  }

  if (stopLoadRatio <= 1 && (transferLoadRatio ?? 0) <= 1) {
    return {
      status: "balanced",
      label: "Balanced visible load",
      detail:
        "The selected moments and estimated transfers fit the chosen rhythm without using its full tolerance." +
        partialSuffix,
      stopMinutes: input.stopMinutes,
      transferMinutes: input.transferMinutes,
      visiblePlanningMinutes,
      stopBudgetMinutes,
      stopLoadRatio,
      transferLoadRatio,
    };
  }

  if (stopLoadRatio <= 1.1 && (transferLoadRatio ?? 0) <= 1.1) {
    return {
      status: "full",
      label: "A full day",
      detail:
        "The visible plan is close to the practical limit for this rhythm. Buffers and supplier timings need careful review." +
        partialSuffix,
      stopMinutes: input.stopMinutes,
      transferMinutes: input.transferMinutes,
      visiblePlanningMinutes,
      stopBudgetMinutes,
      stopLoadRatio,
      transferLoadRatio,
    };
  }

  return {
    status: "review",
    label: "Load review needed",
    detail:
      "The visible stop and transfer load is above the selected rhythm's planning tolerance. A moment should be shortened, replaced or removed." +
      partialSuffix,
    stopMinutes: input.stopMinutes,
    transferMinutes: input.transferMinutes,
    visiblePlanningMinutes,
    stopBudgetMinutes,
    stopLoadRatio,
    transferLoadRatio,
  };
}
