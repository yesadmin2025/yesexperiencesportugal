/**
 * RouteLegend — human-readable breakdown of each leg in the reveal route.
 *
 * Renders alongside the map so travellers can see exactly HOW the day
 * connects: origin → stop 1 (12 min · driving · 8.4km), stop 1 → stop 2
 * (3 min · walking · 0.2km), plus the day totals.
 *
 * Falls back gracefully:
 *  - `legMinutes` missing → skip the per-leg breakdown, keep the header.
 *  - `legDistancesKm` / `legModes` missing → infer mode from context and
 *    hide the distance column.
 */

import { Car, Footprints, Route as RouteIcon } from "lucide-react";
import type { RouteLegMode } from "@/hooks/use-route-leg-minutes";

interface Props {
  originLabel: string | null;
  stopLabels: ReadonlyArray<string>;
  legMinutes: ReadonlyArray<number> | null;
  legDistancesKm?: ReadonlyArray<number> | null;
  legModes?: ReadonlyArray<RouteLegMode> | null;
  className?: string;
  /**
   * When true, suppresses the "Total transit" summary in the header.
   * Used for tours where stops are optional/variable, making a total
   * summation misleading.
   */
  hideTotals?: boolean;
  /**
   * Suppress the "N driving · N walking" tally. On the Studio `Your Day`
   * surface a bare "1 driving" badge reads as an unexplained code rather
   * than information, so that surface opts out. Per-leg minutes and
   * distances (real, labelled) stay.
   */
  hideModeSummary?: boolean;
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`;
  return `${km.toFixed(1)} km`;
}

export function RouteLegend({
  originLabel,
  stopLabels,
  legMinutes,
  legDistancesKm,
  legModes,
  className,
  hideTotals = false,
  hideModeSummary = false,
}: Props) {
  if (!legMinutes || legMinutes.length === 0) return null;

  const totalMin = legMinutes.reduce((a, b) => a + b, 0);
  const totalKm =
    legDistancesKm && legDistancesKm.length > 0 ? legDistancesKm.reduce((a, b) => a + b, 0) : null;
  const drivingCount = (legModes ?? []).filter((m) => m === "driving").length;
  const walkingCount = (legModes ?? []).filter((m) => m === "walking").length;

  // origin is the first anchor; each leg is between waypoint i and i+1
  const points: string[] = [originLabel ?? "Pickup", ...stopLabels];

  return (
    <figure
      className={[
        "border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)]/70 backdrop-blur-sm",
        "rounded-[6px] px-4 py-3.5",
        className ?? "",
      ].join(" ")}
      aria-label="Route breakdown — how each leg was measured"
    >
      <figcaption className="flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal)]/70">
          <RouteIcon size={12} aria-hidden="true" />
          Route breakdown
        </span>
        {!hideTotals && !hideModeSummary && (
          <span className="text-[11px] text-[color:var(--charcoal)]/65">
            {Math.round(totalMin)} min in transit
            {totalKm !== null ? ` · ${formatKm(totalKm)}` : ""}
          </span>
        )}
      </figcaption>

      <ol className="space-y-1.5 list-none p-0 m-0">
        {legMinutes.map((min, i) => {
          const mode: RouteLegMode = legModes && legModes[i] ? legModes[i] : "driving";
          const km =
            legDistancesKm && typeof legDistancesKm[i] === "number" ? legDistancesKm[i] : null;
          const from = points[i] ?? `Stop ${i}`;
          const to = points[i + 1] ?? `Stop ${i + 1}`;
          return (
            <li
              key={`${i}-${from}-${to}`}
              className="grid grid-cols-[16px_1fr_auto] items-center gap-2 text-[12px] text-[color:var(--charcoal)]"
            >
              <span
                className="text-[color:var(--gold)]"
                aria-label={mode === "walking" ? "Walking leg" : "Driving leg"}
                title={mode === "walking" ? "Walking" : "Driving"}
              >
                {mode === "walking" ? <Footprints size={14} /> : <Car size={14} />}
              </span>
              <span className="truncate">
                <span className="text-[color:var(--charcoal)]/70">{from}</span>
                <span className="mx-1.5 text-[color:var(--text-icon)]">→</span>
                <span>{to}</span>
              </span>
              <span className="text-[11px] tabular-nums text-[color:var(--charcoal)]/70 whitespace-nowrap">
                {Math.round(min)} min
                {km !== null ? ` · ${formatKm(km)}` : ""}
              </span>
            </li>
          );
        })}
      </ol>

      {!hideTotals && (
        <p className="mt-3 text-[10.5px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
          {drivingCount > 0 && `${drivingCount} driving`}
          {drivingCount > 0 && walkingCount > 0 && " · "}
          {walkingCount > 0 && `${walkingCount} walking`}
          {drivingCount === 0 && walkingCount === 0 && "Timing based on real roads"}
        </p>
      )}
    </figure>
  );
}
