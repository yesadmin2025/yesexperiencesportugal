/**
 * RouteGlance — the calm, editorial answer to the question every
 * international guest asks before reserving: "where is this, and how much of
 * the day am I in the car?"
 *
 * Deliberately NOT an interactive map: pure SVG (shared `EditorialMap`), so it
 * loads instantly on mobile and never traps the scroll. Driving minutes come
 * from the same real routing service the Studio uses — nothing is estimated
 * here, and a leg with no resolved time simply shows no chip.
 */

import { useMemo } from "react";
import { EditorialMap } from "@/components/maps/EditorialMap";
import { useRouteLegMinutes } from "@/hooks/use-route-leg-minutes";
import { sanitizePublicMapStopLabels } from "@/lib/publicItineraryProjection";
import type { RouteGlancePoint } from "@/lib/tourItineraryStops";

function slug(label: string, i: number): string {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`;
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function RouteGlance({
  tourId,
  points,
  region,
}: {
  tourId: string;
  points: RouteGlancePoint[];
  region?: string;
}) {
  const safePoints = useMemo(
    () => sanitizePublicMapStopLabels(tourId, points),
    [tourId, points],
  );

  const legStops = useMemo(
    () => safePoints.map((p, i) => ({ key: slug(p.label, i), lat: p.lat, lng: p.lng })),
    [safePoints],
  );

  const { legMinutes } = useRouteLegMinutes(legStops, safePoints.length >= 2);

  if (safePoints.length < 2) return null;

  const resolved = (legMinutes ?? []).filter(
    (m): m is number => typeof m === "number" && Number.isFinite(m) && m > 0,
  );
  const allResolved = !!legMinutes && resolved.length === safePoints.length - 1;
  const totalDriving = resolved.reduce((sum, m) => sum + m, 0);

  return (
    <div className="mb-10 border border-[color:var(--border)] bg-[color:var(--ivory)]">
      <EditorialMap
        stops={safePoints.map((p) => ({
          label: p.label,
          ...(typeof p.x === "number" && typeof p.y === "number" ? { x: p.x, y: p.y } : {}),
          lat: p.lat,
          lng: p.lng,
        }))}
        legMinutes={legMinutes ?? undefined}
        tone="light"
        aspectRatio="16 / 11"
        preserveAspectRatio="xMidYMid meet"
        eyebrow="Where the day happens"
        meta={region ?? "Portugal"}
        footerRight={`${safePoints.length} points`}
        showLabels
        ariaLabel={`Schematic map of the route: ${safePoints.map((p) => p.label).join(", ")}`}
      />

      <div className="border-t border-[color:var(--border)] px-4 py-4 md:px-6">
        {allResolved && totalDriving > 0 && (
          <p className="text-[13.5px] leading-relaxed text-[color:var(--charcoal)]">
            <strong className="font-medium">
              About {formatMinutes(totalDriving)} of driving
            </strong>{" "}
            in total, split across the day between stops — pickup and drop-off at your
            address.
          </p>
        )}

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 p-0 m-0 list-none">
          {safePoints.slice(0, -1).map((p, i) => {
            const mins = legMinutes?.[i];
            if (typeof mins !== "number" || !Number.isFinite(mins) || mins <= 0) return null;
            const next = safePoints[i + 1];
            return (
              <li
                key={slug(p.label, i)}
                className="text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]"
              >
                <span className="text-[color:var(--charcoal)]">{p.label}</span>
                <span className="mx-1.5 text-[color:var(--gold)]">→</span>
                <span className="text-[color:var(--charcoal)]">{next.label}</span>
                <span className="ml-1.5 tabular-nums">~{mins} min</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
