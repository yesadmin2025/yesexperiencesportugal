import type { OptionalStopType } from "@/data/regionStopPool";
import type { LivingAtlasDensity } from "@/components/studio-v3/livingAtlasComposer";
import type { LivingAtlasRouteStatus } from "@/components/studio-v3/livingAtlasRoutePlanner";
import {
  isMercadoDoLivramentoOpenOn,
  MERCADO_DO_LIVRAMENTO_STOP_ID,
} from "@/components/studio-v3/dateGuards";

export const LIVING_ATLAS_OPERATIONAL_CONDITION_IDS = [
  "verified-structure",
  "supplier-confirmation",
  "sea-conditions",
  "opening-hours",
  "weather-access",
] as const;

export type LivingAtlasOperationalConditionId =
  (typeof LIVING_ATLAS_OPERATIONAL_CONDITION_IDS)[number];

export const LIVING_ATLAS_OPERATIONAL_STATUSES = ["confirmed", "pending", "unavailable"] as const;

export type LivingAtlasOperationalStatus = (typeof LIVING_ATLAS_OPERATIONAL_STATUSES)[number];

export type LivingAtlasOperationalEvidence = Partial<
  Record<LivingAtlasOperationalConditionId, LivingAtlasOperationalStatus>
>;

export type LivingAtlasOperationalContext = {
  selectedDate?: string | null;
  stopId?: string | null;
  evidence?: LivingAtlasOperationalEvidence;
};

export type LivingAtlasOperationalCondition = {
  id: LivingAtlasOperationalConditionId;
  label: string;
  detail: string;
  status: LivingAtlasOperationalStatus;
  tone: "verified" | "check" | "unavailable";
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

type LivingAtlasOperationalConditionDefinition = {
  id: LivingAtlasOperationalConditionId;
  label: string;
  detailByStatus: Readonly<Record<LivingAtlasOperationalStatus, string>>;
};

const CONDITION_CATALOG: Readonly<
  Record<LivingAtlasOperationalConditionId, LivingAtlasOperationalConditionDefinition>
> = {
  "verified-structure": {
    id: "verified-structure",
    label: "Verified structure",
    detailByStatus: {
      confirmed: "This moment comes from verified Studio or Signature inventory.",
      pending: "The inventory structure still needs verification.",
      unavailable: "The inventory structure is not available for this day.",
    },
  },
  "supplier-confirmation": {
    id: "supplier-confirmation",
    label: "Supplier",
    detailByStatus: {
      confirmed: "Current operational evidence confirms the supplier or host for this date.",
      pending: "A real supplier or host confirmation is still required before the day is final.",
      unavailable: "The supplier or host is unavailable for the selected date.",
    },
  },
  "sea-conditions": {
    id: "sea-conditions",
    label: "Sea operation",
    detailByStatus: {
      confirmed: "Current operational evidence supports the maritime operation for this date.",
      pending: "Safe sea conditions and the maritime provider still require confirmation.",
      unavailable: "The maritime operation is unavailable for the selected date.",
    },
  },
  "opening-hours": {
    id: "opening-hours",
    label: "Opening hours",
    detailByStatus: {
      confirmed: "Opening hours have been confirmed for the selected date.",
      pending: "The selected date still needs a real opening-hours check.",
      unavailable: "The place is unavailable under the selected date rule or current evidence.",
    },
  },
  "weather-access": {
    id: "weather-access",
    label: "Weather & access",
    detailByStatus: {
      confirmed: "Current operational evidence supports comfortable access for this date.",
      pending: "Weather, season or local access conditions still require a real check.",
      unavailable:
        "Weather or access conditions make this moment unavailable for the selected date.",
    },
  },
};

const SUPPLIER_TYPES = new Set<OptionalStopType>(["boat", "winery", "workshop", "studio", "table"]);

const OPENING_HOURS_TYPES = new Set<OptionalStopType>(["market", "monument", "heritage", "garden"]);

const WEATHER_ACCESS_TYPES = new Set<OptionalStopType>(["beach", "nature", "viewpoint"]);

const STOP_BUDGET_MINUTES: Readonly<Record<LivingAtlasDensity, number>> = {
  slow: 300,
  balanced: 390,
  rich: 480,
};

const TRANSFER_BUDGET_MINUTES = 180;

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function operationalTone(
  status: LivingAtlasOperationalStatus,
): LivingAtlasOperationalCondition["tone"] {
  if (status === "confirmed") return "verified";
  if (status === "unavailable") return "unavailable";
  return "check";
}

function resolvedOperationalStatus(
  id: LivingAtlasOperationalConditionId,
  context: LivingAtlasOperationalContext,
): LivingAtlasOperationalStatus {
  if (id === "verified-structure") return "confirmed";

  const explicit = context.evidence?.[id];
  if (explicit) return explicit;

  if (
    id === "opening-hours" &&
    context.stopId === MERCADO_DO_LIVRAMENTO_STOP_ID &&
    context.selectedDate &&
    !isMercadoDoLivramentoOpenOn(context.selectedDate)
  ) {
    return "unavailable";
  }

  return "pending";
}

function resolvedOperationalDetail(
  definition: LivingAtlasOperationalConditionDefinition,
  status: LivingAtlasOperationalStatus,
  context: LivingAtlasOperationalContext,
): string {
  if (
    definition.id === "opening-hours" &&
    status === "unavailable" &&
    context.stopId === MERCADO_DO_LIVRAMENTO_STOP_ID
  ) {
    return "Mercado do Livramento is closed on Mondays, so it cannot enter this selected day.";
  }

  return definition.detailByStatus[status];
}

export function livingAtlasOperationalStatusLabel(status: LivingAtlasOperationalStatus): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "unavailable") return "Unavailable";
  return "Pending";
}

export function livingAtlasOperationalConditions(
  type: OptionalStopType,
  context: LivingAtlasOperationalContext = {},
): LivingAtlasOperationalCondition[] {
  const ids: LivingAtlasOperationalConditionId[] = ["verified-structure"];

  if (SUPPLIER_TYPES.has(type)) ids.push("supplier-confirmation");
  if (type === "boat") ids.push("sea-conditions");
  if (OPENING_HOURS_TYPES.has(type)) ids.push("opening-hours");
  if (WEATHER_ACCESS_TYPES.has(type)) ids.push("weather-access");

  return [...new Set(ids)].map((id) => {
    const definition = CONDITION_CATALOG[id];
    const status = resolvedOperationalStatus(id, context);
    return {
      id,
      label: definition.label,
      detail: resolvedOperationalDetail(definition, status, context),
      status,
      tone: operationalTone(status),
    };
  });
}

export function deriveLivingAtlasMomentOperationalStatus(
  type: OptionalStopType,
  context: LivingAtlasOperationalContext = {},
): LivingAtlasOperationalStatus {
  const statuses = livingAtlasOperationalConditions(type, context).map(
    (condition) => condition.status,
  );
  if (statuses.includes("unavailable")) return "unavailable";
  if (statuses.includes("pending")) return "pending";
  return "confirmed";
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

/* ------------------------------------------------------------------ *
 * BUILD 1 / Pass 3 — STRUCTURED OPERATIONAL VALIDATION
 *
 * One clean internal status machine for the composed day. It never competes
 * with the Pass-2 composer: TIME conflicts / tradeoffs stay composer
 * authority and are surfaced here only as reason codes, never as a parallel
 * "over-budget" state. `unverified` is a reason/confidence signal, not a
 * status. Route and schedule may change operational ORDER only — never the
 * composition membership.
 * ------------------------------------------------------------------ */

export const LIVING_ATLAS_VALIDATION_STATUSES = [
  "valid",
  "route-review",
  "schedule-review",
  "invalid",
] as const;

export type LivingAtlasValidationStatus = (typeof LIVING_ATLAS_VALIDATION_STATUSES)[number];

export type LivingAtlasValidationReasonCode =
  | "composition-invalid"
  | "composition-empty"
  | "composition-tradeoff"
  | "missing-coords"
  | "unverified-node"
  | "distance-exceeds-plan"
  | "driving-exceeds-plan"
  | "leg-exceeds-plan"
  | "window-conflict"
  | "schedule-reordered"
  | "identity-set-mutated"
  /** A declared mobility concern that inventory cannot structurally disprove. */
  | "mobility-review"
  /** A mandatory connector with no verified duration. */
  | "connector-unverified";

/**
 * Internal composition-stage signals handed to the ONE validator so review
 * status has a single owner. They never change membership.
 */
export type LivingAtlasPreValidationIssue = {
  code: "mobility-unproven" | "connector-unverified";
  detail: string;
  stopIds?: string[];
};


export type LivingAtlasValidationReason = {
  code: LivingAtlasValidationReasonCode;
  detail: string;
  stopIds?: string[];
};

export type LivingAtlasValidationResult = {
  status: LivingAtlasValidationStatus;
  reasons: LivingAtlasValidationReason[];
  /** Frozen sold identity set, sorted — proof that validation never mutates it. */
  compositionStopIds: string[];
};

type ValidationCompositionInput = {
  status: string;
  moments: ReadonlyArray<{ stopId: string }>;
};

type ValidationRoutePlanInput = {
  status: LivingAtlasRouteStatus;
  orderedMoments: ReadonlyArray<{ stopId: string }>;
  locatedMomentCount: number;
  totalMomentCount: number;
  totalEstimatedRoadKm: number;
  totalEstimatedDrivingMin: number;
  maxTotalKm: number;
  maxDrivingMin: number;
  maxLegKm: number;
  legs: ReadonlyArray<{ estimatedRoadKm: number }>;
};

/**
 * Validate a frozen composition against route and schedule output.
 *
 * @param composition frozen sold identity set (composer authority)
 * @param routePlan   geographic plan for that exact set
 * @param scheduledPlan optional plan after internal time-window constraints
 */
export function validateLivingAtlasOperations(input: {
  composition: ValidationCompositionInput;
  routePlan: ValidationRoutePlanInput;
  scheduledPlan?: ValidationRoutePlanInput | null;
  selectedDate?: string | null;
  /** Composition-stage internal signals. Additive; never a membership change. */
  preValidationIssues?: ReadonlyArray<LivingAtlasPreValidationIssue>;
}): LivingAtlasValidationResult {
  const { composition, routePlan, scheduledPlan, selectedDate } = input;

  const compositionStopIds = [...composition.moments.map((moment) => moment.stopId)].sort((a, b) =>
    a.localeCompare(b),
  );
  const reasons: LivingAtlasValidationReason[] = [];

  if (composition.status === "invalid" || composition.status === "impossible") {
    return {
      status: "invalid",
      reasons: [
        {
          code: "composition-invalid",
          detail: "The composition authority could not produce a valid day.",
        },
      ],
      compositionStopIds,
    };
  }

  if (composition.moments.length === 0) {
    return {
      status: "invalid",
      reasons: [{ code: "composition-empty", detail: "No real moments were selected." }],
      compositionStopIds,
    };
  }

  // Time conflicts remain composer authority — recorded, never re-decided.
  if (composition.status === "tradeoff") {
    reasons.push({
      code: "composition-tradeoff",
      detail: "The composer reported a truthful time tradeoff for this envelope.",
    });
  }

  const effective = scheduledPlan ?? routePlan;

  // Route/schedule may only reorder. Membership drift is a hard failure.
  const effectiveIds = [...effective.orderedMoments.map((moment) => moment.stopId)].sort((a, b) =>
    a.localeCompare(b),
  );
  const membershipPreserved =
    effectiveIds.length === compositionStopIds.length &&
    effectiveIds.every((id, index) => id === compositionStopIds[index]);
  if (!membershipPreserved) {
    return {
      status: "invalid",
      reasons: [
        {
          code: "identity-set-mutated",
          detail: "Route or schedule changed the sold composition identity set.",
        },
      ],
      compositionStopIds,
    };
  }

  // Coordinate confidence is a ROUTE certification concern: without verified
  // coordinates the internal route cannot be certified, so it is honestly
  // surfaced as route-review (never as a time/over-budget state).
  let routeReview = false;

  // Composition-stage internal signals map deterministically onto the ONE
  // status machine. They are review-only: membership is never touched.
  for (const issue of input.preValidationIssues ?? []) {
    routeReview = true;
    reasons.push({
      code: issue.code === "mobility-unproven" ? "mobility-review" : "connector-unverified",
      detail: issue.detail,
      ...(issue.stopIds ? { stopIds: issue.stopIds } : {}),
    });
  }


  if (effective.locatedMomentCount < effective.totalMomentCount) {
    routeReview = true;
    reasons.push({
      code: "missing-coords",
      detail: "At least one selected moment has no verified coordinates yet.",
    });
  }
  if (effective.status === "unavailable" || effective.status === "partial") {
    routeReview = true;
    reasons.push({
      code: "unverified-node",
      detail: "Not enough verified coordinates to certify the internal route.",
    });
  }


  // Schedule-only concerns.
  let scheduleReview = false;
  if (
    selectedDate &&
    composition.moments.some((moment) => moment.stopId === MERCADO_DO_LIVRAMENTO_STOP_ID) &&
    !isMercadoDoLivramentoOpenOn(selectedDate)
  ) {
    scheduleReview = true;
    reasons.push({
      code: "window-conflict",
      detail: "A selected moment falls outside its real operating window on this date.",
      stopIds: [MERCADO_DO_LIVRAMENTO_STOP_ID],
    });
  }

  if (scheduledPlan) {
    const before = routePlan.orderedMoments.map((moment) => moment.stopId).join("|");
    const after = scheduledPlan.orderedMoments.map((moment) => moment.stopId).join("|");
    if (before !== after) {
      reasons.push({
        code: "schedule-reordered",
        detail: "Operational time windows changed the visit order only.",
      });
    }
  }

  // Route-only concerns from the geographic plan.
  const longestLeg = Math.max(0, ...effective.legs.map((leg) => leg.estimatedRoadKm));

  if (effective.totalEstimatedRoadKm > effective.maxTotalKm) {
    routeReview = true;
    reasons.push({
      code: "distance-exceeds-plan",
      detail: "Estimated internal distance exceeds the planning cap.",
    });
  }
  if (effective.totalEstimatedDrivingMin > effective.maxDrivingMin) {
    routeReview = true;
    reasons.push({
      code: "driving-exceeds-plan",
      detail: "Estimated internal driving exceeds the planning cap.",
    });
  }
  if (longestLeg > effective.maxLegKm) {
    routeReview = true;
    reasons.push({
      code: "leg-exceeds-plan",
      detail: "At least one transfer exceeds the leg cap.",
    });
  }

  const status: LivingAtlasValidationStatus = routeReview
    ? "route-review"
    : scheduleReview
      ? "schedule-review"
      : "valid";

  return { status, reasons, compositionStopIds };
}
