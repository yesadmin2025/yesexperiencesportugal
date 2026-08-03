import { CarFront, CircleAlert, MapPinned, Route } from "lucide-react";

import {
  formatLivingAtlasDrivingTime,
  type LivingAtlasRouteLeg,
  type LivingAtlasRoutePlan,
} from "@/components/studio-v3/livingAtlasRoutePlanner";

const STATUS_COPY: Record<
  LivingAtlasRoutePlan["status"],
  { label: string; detail: string }
> = {
  ready: {
    label: "Geographic draft ready",
    detail: "All selected moments have verified planning coordinates.",
  },
  partial: {
    label: "Geographic draft partial",
    detail: "The placed moments are ordered, while one or more locations still need confirmation.",
  },
  "over-budget": {
    label: "Operational review needed",
    detail: "The current draft exceeds at least one internal routing guideline.",
  },
  unavailable: {
    label: "Route estimate pending",
    detail: "There are not enough verified coordinates to estimate internal transfers yet.",
  },
};

export function incomingLivingAtlasRouteLeg(
  routePlan: LivingAtlasRoutePlan,
  stopId: string,
): LivingAtlasRouteLeg | null {
  return routePlan.legs.find((leg) => leg.toStopId === stopId) ?? null;
}

export function LivingAtlasRouteSummary({ routePlan }: { routePlan: LivingAtlasRoutePlan }) {
  const copy = STATUS_COPY[routePlan.status];
  const reviewNeeded = routePlan.status === "over-budget";

  return (
    <section
      className="rounded-2xl border p-4"
      style={{
        borderColor: reviewNeeded
          ? "color-mix(in oklab, #d78b62 56%, transparent)"
          : "color-mix(in oklab, var(--gold) 30%, transparent)",
        background: reviewNeeded
          ? "color-mix(in oklab, #d78b62 8%, transparent)"
          : "color-mix(in oklab, var(--ivory) 4%, transparent)",
      }}
      aria-label="Geographic route estimate"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            background: reviewNeeded
              ? "color-mix(in oklab, #d78b62 18%, transparent)"
              : "color-mix(in oklab, var(--gold) 16%, transparent)",
            color: reviewNeeded ? "#e2aa88" : "var(--gold)",
          }}
        >
          {reviewNeeded ? <CircleAlert size={15} aria-hidden /> : <Route size={15} aria-hidden />}
        </span>
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]">{copy.label}</h2>
          <p
            className="mt-1 text-[11px] leading-5"
            style={{ color: "color-mix(in oklab, var(--ivory) 62%, transparent)" }}
          >
            {copy.detail}
          </p>
        </div>
      </div>

      {routePlan.status !== "unavailable" ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric
            icon={<CarFront size={13} aria-hidden />}
            label="Internal drive"
            value={formatLivingAtlasDrivingTime(routePlan.totalEstimatedDrivingMin)}
          />
          <Metric
            icon={<Route size={13} aria-hidden />}
            label="Road estimate"
            value={`${routePlan.totalEstimatedRoadKm} km`}
          />
          <Metric
            icon={<MapPinned size={13} aria-hidden />}
            label="Placed"
            value={`${routePlan.locatedMomentCount}/${routePlan.totalMomentCount}`}
          />
        </div>
      ) : null}

      {routePlan.warnings.length > 0 ? (
        <ul
          className="mt-4 space-y-1 border-t pt-3 text-[10px] leading-5"
          style={{
            borderColor: "color-mix(in oklab, var(--ivory) 10%, transparent)",
            color: reviewNeeded ? "#e2aa88" : "color-mix(in oklab, var(--ivory) 60%, transparent)",
          }}
        >
          {routePlan.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <p
        className="mt-4 border-t pt-3 text-[9px] leading-4"
        style={{
          borderColor: "color-mix(in oklab, var(--ivory) 10%, transparent)",
          color: "color-mix(in oklab, var(--ivory) 42%, transparent)",
        }}
      >
        Geographic planning estimate from verified coordinates. It is not live traffic, a confirmed
        timetable or supplier availability.
      </p>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-xl border p-2.5"
      style={{ borderColor: "color-mix(in oklab, var(--ivory) 12%, transparent)" }}
    >
      <div
        className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "color-mix(in oklab, var(--ivory) 46%, transparent)" }}
      >
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-[11px] font-semibold">{value}</p>
    </div>
  );
}
