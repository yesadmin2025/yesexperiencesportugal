import fs from "node:fs";

const ROOT = process.cwd();

function write(path, content) {
  fs.writeFileSync(`${ROOT}/${path}`, content, "utf8");
}

function replaceOnce(path, before, after) {
  const fullPath = `${ROOT}/${path}`;
  const source = fs.readFileSync(fullPath, "utf8");
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Expected snippet not found in ${path}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected snippet appears more than once in ${path}`);
  }
  fs.writeFileSync(fullPath, source.replace(before, after), "utf8");
}

write(
  "src/components/studio-v3/livingAtlasOperationalConfidence.ts",
  `import type { OptionalStopType } from "@/data/regionStopPool";
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

export const LIVING_ATLAS_OPERATIONAL_STATUSES = [
  "confirmed",
  "pending",
  "unavailable",
] as const;

export type LivingAtlasOperationalStatus =
  (typeof LIVING_ATLAS_OPERATIONAL_STATUSES)[number];

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
      unavailable: "Weather or access conditions make this moment unavailable for the selected date.",
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

export function livingAtlasOperationalStatusLabel(
  status: LivingAtlasOperationalStatus,
): string {
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
`,
);

write(
  "src/components/studio-v3/LivingAtlasOperationalConfidence.tsx",
  `import type { ReactNode } from "react";
import {
  BadgeCheck,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CloudSun,
  Gauge,
  Handshake,
  Waves,
} from "lucide-react";

import type { OptionalStopType } from "@/data/regionStopPool";
import {
  LIVING_ATLAS_OPERATIONAL_STATUSES,
  livingAtlasOperationalConditions,
  livingAtlasOperationalStatusLabel,
  type LivingAtlasOperationalCondition,
  type LivingAtlasOperationalConditionId,
  type LivingAtlasOperationalEvidence,
  type LivingAtlasOperationalStatus,
  type LivingAtlasPaceSummary,
} from "@/components/studio-v3/livingAtlasOperationalConfidence";
import { formatLivingAtlasDrivingTime } from "@/components/studio-v3/livingAtlasRoutePlanner";

const CONDITION_ICON: Readonly<Record<LivingAtlasOperationalConditionId, ReactNode>> = {
  "verified-structure": <BadgeCheck size={11} aria-hidden />,
  "supplier-confirmation": <Handshake size={11} aria-hidden />,
  "sea-conditions": <Waves size={11} aria-hidden />,
  "opening-hours": <CalendarClock size={11} aria-hidden />,
  "weather-access": <CloudSun size={11} aria-hidden />,
};

const STATUS_ICON: Readonly<Record<LivingAtlasOperationalStatus, ReactNode>> = {
  confirmed: <CheckCircle2 size={11} aria-hidden />,
  pending: <Clock3 size={11} aria-hidden />,
  unavailable: <Ban size={11} aria-hidden />,
};

const STATUS_EXPLANATION: Readonly<Record<LivingAtlasOperationalStatus, string>> = {
  confirmed: "Supported by verified structure or explicit current operational evidence.",
  pending: "A real-world supplier, schedule, sea, weather or access check is still required.",
  unavailable: "Blocked by the selected date rule or explicit current operational evidence.",
};

function conditionStyle(condition: LivingAtlasOperationalCondition): {
  borderColor: string;
  color: string;
  background: string;
} {
  if (condition.status === "confirmed") {
    return {
      borderColor: "color-mix(in oklab, var(--gold) 34%, transparent)",
      color: "var(--gold)",
      background: "color-mix(in oklab, var(--gold) 8%, transparent)",
    };
  }

  if (condition.status === "unavailable") {
    return {
      borderColor: "color-mix(in oklab, #d78b62 58%, transparent)",
      color: "#e2aa88",
      background: "color-mix(in oklab, #d78b62 10%, transparent)",
    };
  }

  return {
    borderColor: "color-mix(in oklab, var(--ivory) 16%, transparent)",
    color: "color-mix(in oklab, var(--ivory) 68%, transparent)",
    background: "color-mix(in oklab, var(--ivory) 3%, transparent)",
  };
}

function statusPillStyle(status: LivingAtlasOperationalStatus): {
  borderColor: string;
  color: string;
  background: string;
} {
  if (status === "confirmed") {
    return {
      borderColor: "color-mix(in oklab, var(--gold) 38%, transparent)",
      color: "var(--gold)",
      background: "color-mix(in oklab, var(--gold) 12%, transparent)",
    };
  }

  if (status === "unavailable") {
    return {
      borderColor: "color-mix(in oklab, #d78b62 58%, transparent)",
      color: "#e2aa88",
      background: "color-mix(in oklab, #d78b62 12%, transparent)",
    };
  }

  return {
    borderColor: "color-mix(in oklab, var(--ivory) 20%, transparent)",
    color: "color-mix(in oklab, var(--ivory) 72%, transparent)",
    background: "color-mix(in oklab, var(--ivory) 5%, transparent)",
  };
}

export function LivingAtlasOperationalBadges({
  type,
  compact = false,
  selectedDate = null,
  stopId = null,
  evidence,
}: {
  type: OptionalStopType;
  compact?: boolean;
  selectedDate?: string | null;
  stopId?: string | null;
  evidence?: LivingAtlasOperationalEvidence;
}) {
  const conditions = livingAtlasOperationalConditions(type, {
    selectedDate,
    stopId,
    evidence,
  });

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Operational status">
      {conditions.map((condition) => (
        <span
          key={condition.id}
          className={
            compact
              ? "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em]"
              : "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.11em]"
          }
          style={conditionStyle(condition)}
          title={condition.detail}
          aria-label={`${condition.label}: ${livingAtlasOperationalStatusLabel(condition.status)}. ${condition.detail}`}
        >
          {CONDITION_ICON[condition.id]}
          <span aria-hidden>{condition.label}</span>
          <span
            aria-hidden
            className="rounded-full border px-1.5 py-0.5 text-[0.86em] tracking-[0.08em]"
            style={statusPillStyle(condition.status)}
          >
            {livingAtlasOperationalStatusLabel(condition.status)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function LivingAtlasOperationalLegend() {
  return (
    <section
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in oklab, var(--ivory) 14%, transparent)",
        background: "color-mix(in oklab, var(--ivory) 3%, transparent)",
      }}
      aria-label="Operational status meaning"
    >
      <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]">
        What each status means
      </h2>
      <div className="mt-3 space-y-2">
        {LIVING_ATLAS_OPERATIONAL_STATUSES.map((status) => (
          <div key={status} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em]"
              style={statusPillStyle(status)}
            >
              {STATUS_ICON[status]}
              {livingAtlasOperationalStatusLabel(status)}
            </span>
            <p
              className="text-[10px] leading-4"
              style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}
            >
              {STATUS_EXPLANATION[status]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LivingAtlasPaceCard({ summary }: { summary: LivingAtlasPaceSummary }) {
  const review = summary.status === "review";
  const partial = summary.status === "partial";

  return (
    <section
      className="rounded-2xl border p-4"
      style={{
        borderColor: review
          ? "color-mix(in oklab, #d78b62 56%, transparent)"
          : "color-mix(in oklab, var(--gold) 30%, transparent)",
        background: review
          ? "color-mix(in oklab, #d78b62 8%, transparent)"
          : "color-mix(in oklab, var(--ivory) 4%, transparent)",
      }}
      aria-label="Visible plan load"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            background: review
              ? "color-mix(in oklab, #d78b62 18%, transparent)"
              : "color-mix(in oklab, var(--gold) 16%, transparent)",
            color: review ? "#e2aa88" : "var(--gold)",
          }}
        >
          <Gauge size={15} aria-hidden />
        </span>
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]">{summary.label}</h2>
          <p
            className="mt-1 text-[11px] leading-5"
            style={{ color: "color-mix(in oklab, var(--ivory) 62%, transparent)" }}
          >
            {summary.detail}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric
          label="Visible plan"
          value={formatLivingAtlasDrivingTime(summary.visiblePlanningMinutes)}
        />
        <Metric label="Moments" value={formatLivingAtlasDrivingTime(summary.stopMinutes)} />
        <Metric
          label="Transfers"
          value={partial ? "Pending" : formatLivingAtlasDrivingTime(summary.transferMinutes)}
        />
      </div>

      <p
        className="mt-4 border-t pt-3 text-[9px] leading-4"
        style={{
          borderColor: "color-mix(in oklab, var(--ivory) 10%, transparent)",
          color: "color-mix(in oklab, var(--ivory) 42%, transparent)",
        }}
      >
        Visible moments plus estimated internal transfers. Pickup, meals, comfort buffers, opening
        schedules and supplier timings are not yet included.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border p-2.5"
      style={{ borderColor: "color-mix(in oklab, var(--ivory) 12%, transparent)" }}
    >
      <p
        className="text-[8px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "color-mix(in oklab, var(--ivory) 46%, transparent)" }}
      >
        {label}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold">{value}</p>
    </div>
  );
}
`,
);

replaceOnce(
  "src/components/studio-v3/LivingAtlasShapeStep.tsx",
  `import {
  LivingAtlasOperationalBadges,
  LivingAtlasPaceCard,
} from "@/components/studio-v3/LivingAtlasOperationalConfidence";`,
  `import {
  LivingAtlasOperationalBadges,
  LivingAtlasOperationalLegend,
  LivingAtlasPaceCard,
} from "@/components/studio-v3/LivingAtlasOperationalConfidence";`,
);

replaceOnce(
  "src/components/studio-v3/LivingAtlasShapeStep.tsx",
  `          <LivingAtlasPaceCard summary={paceSummary} />
          <PreferencePanel`,
  `          <LivingAtlasPaceCard summary={paceSummary} />
          <LivingAtlasOperationalLegend />
          <PreferencePanel`,
);

replaceOnce(
  "src/components/studio-v3/LivingAtlasShapeStep.tsx",
  `                          <LivingAtlasOperationalBadges type={moment.type} />`,
  `                          <LivingAtlasOperationalBadges
                            type={moment.type}
                            selectedDate={selectedDate}
                            stopId={moment.stopId}
                          />`,
);

replaceOnce(
  "src/components/studio-v3/LivingAtlasShapeStep.tsx",
  `                                <LivingAtlasOperationalBadges
                                  type={alternative.moment.type}
                                  compact
                                />`,
  `                                <LivingAtlasOperationalBadges
                                  type={alternative.moment.type}
                                  selectedDate={selectedDate}
                                  stopId={alternative.moment.stopId}
                                  compact
                                />`,
);

write(
  "src/components/studio-v3/__tests__/living-atlas-operational-confidence.test.ts",
  `import { describe, expect, it } from "vitest";

import { MERCADO_DO_LIVRAMENTO_STOP_ID } from "../dateGuards";
import {
  deriveLivingAtlasMomentOperationalStatus,
  deriveLivingAtlasPaceSummary,
  livingAtlasOperationalConditions,
} from "../livingAtlasOperationalConfidence";

describe("Living Atlas operational confidence", () => {
  it("marks a boat as verified while exposing supplier and sea dependencies", () => {
    const conditions = livingAtlasOperationalConditions("boat");

    expect(conditions.map((condition) => condition.id)).toEqual([
      "verified-structure",
      "supplier-confirmation",
      "sea-conditions",
    ]);
    expect(conditions.map((condition) => condition.status)).toEqual([
      "confirmed",
      "pending",
      "pending",
    ]);
    expect(deriveLivingAtlasMomentOperationalStatus("boat")).toBe("pending");
  });

  it("maps opening schedules and outdoor access without inventing availability", () => {
    expect(livingAtlasOperationalConditions("market").map((condition) => condition.id)).toEqual([
      "verified-structure",
      "opening-hours",
    ]);
    expect(livingAtlasOperationalConditions("nature").map((condition) => condition.id)).toEqual([
      "verified-structure",
      "weather-access",
    ]);
    expect(
      livingAtlasOperationalConditions("nature").find(
        (condition) => condition.id === "weather-access",
      )?.status,
    ).toBe("pending");
  });

  it("marks Mercado do Livramento unavailable on Monday and pending on another valid day", () => {
    const monday = livingAtlasOperationalConditions("market", {
      selectedDate: "2026-08-03",
      stopId: MERCADO_DO_LIVRAMENTO_STOP_ID,
    });
    const tuesday = livingAtlasOperationalConditions("market", {
      selectedDate: "2026-08-04",
      stopId: MERCADO_DO_LIVRAMENTO_STOP_ID,
    });

    expect(monday.find((condition) => condition.id === "opening-hours")).toMatchObject({
      status: "unavailable",
    });
    expect(deriveLivingAtlasMomentOperationalStatus("market", {
      selectedDate: "2026-08-03",
      stopId: MERCADO_DO_LIVRAMENTO_STOP_ID,
    })).toBe("unavailable");
    expect(tuesday.find((condition) => condition.id === "opening-hours")).toMatchObject({
      status: "pending",
    });
  });

  it("requires explicit evidence before a real-world dependency becomes confirmed", () => {
    const pending = livingAtlasOperationalConditions("winery");
    const confirmed = livingAtlasOperationalConditions("winery", {
      evidence: { "supplier-confirmation": "confirmed" },
    });

    expect(pending.find((condition) => condition.id === "supplier-confirmation")?.status).toBe(
      "pending",
    );
    expect(confirmed.find((condition) => condition.id === "supplier-confirmation")?.status).toBe(
      "confirmed",
    );
    expect(deriveLivingAtlasMomentOperationalStatus("winery", {
      evidence: { "supplier-confirmation": "confirmed" },
    })).toBe("confirmed");
  });

  it("requires supplier confirmation for hosted experiences", () => {
    for (const type of ["winery", "workshop", "studio", "table"] as const) {
      expect(livingAtlasOperationalConditions(type).map((condition) => condition.id)).toContain(
        "supplier-confirmation",
      );
    }
  });

  it("reports a spacious visible plan when stops and transfers leave real headroom", () => {
    const summary = deriveLivingAtlasPaceSummary({
      density: "balanced",
      stopMinutes: 240,
      transferMinutes: 60,
      routeStatus: "ready",
    });

    expect(summary).toMatchObject({
      status: "open",
      label: "Room to breathe",
      visiblePlanningMinutes: 300,
      stopBudgetMinutes: 390,
    });
  });

  it("reports a full day near the selected rhythm tolerance", () => {
    const summary = deriveLivingAtlasPaceSummary({
      density: "balanced",
      stopMinutes: 405,
      transferMinutes: 185,
      routeStatus: "ready",
    });

    expect(summary.status).toBe("full");
    expect(summary.stopLoadRatio).toBeGreaterThan(1);
    expect(summary.transferLoadRatio).toBeGreaterThan(1);
  });

  it("never disguises an over-budget or unlocated route as a comfortable day", () => {
    expect(
      deriveLivingAtlasPaceSummary({
        density: "rich",
        stopMinutes: 300,
        transferMinutes: 200,
        routeStatus: "over-budget",
      }).status,
    ).toBe("review");

    expect(
      deriveLivingAtlasPaceSummary({
        density: "slow",
        stopMinutes: 180,
        transferMinutes: 0,
        routeStatus: "unavailable",
      }),
    ).toMatchObject({ status: "partial", transferLoadRatio: null });
  });
});
`,
);

console.log("Applied Living Atlas operational status language.");
