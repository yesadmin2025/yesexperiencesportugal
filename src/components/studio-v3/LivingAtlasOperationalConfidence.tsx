import type { ReactNode } from "react";
import { BadgeCheck, CalendarClock, CloudSun, Gauge, Handshake, Waves } from "lucide-react";

import type { OptionalStopType } from "@/data/regionStopPool";
import {
  livingAtlasOperationalConditions,
  type LivingAtlasOperationalCondition,
  type LivingAtlasOperationalConditionId,
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

function conditionStyle(condition: LivingAtlasOperationalCondition): {
  borderColor: string;
  color: string;
  background: string;
} {
  if (condition.tone === "verified") {
    return {
      borderColor: "color-mix(in oklab, var(--gold) 34%, transparent)",
      color: "var(--gold)",
      background: "color-mix(in oklab, var(--gold) 8%, transparent)",
    };
  }

  return {
    borderColor: "color-mix(in oklab, var(--ivory) 16%, transparent)",
    color: "color-mix(in oklab, var(--ivory) 62%, transparent)",
    background: "color-mix(in oklab, var(--ivory) 3%, transparent)",
  };
}

export function LivingAtlasOperationalBadges({
  type,
  compact = false,
}: {
  type: OptionalStopType;
  compact?: boolean;
}) {
  const conditions = livingAtlasOperationalConditions(type);

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Operational conditions">
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
        >
          {CONDITION_ICON[condition.id]}
          {condition.label}
          <span className="sr-only">: {condition.detail}</span>
        </span>
      ))}
    </div>
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
