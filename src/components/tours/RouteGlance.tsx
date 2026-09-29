/**
 * RouteGlance — the calm, editorial answer to the two questions every
 * international guest asks before reserving: "where in Portugal is this?" and
 * "how much of my day is spent in the car?"
 *
 * Deliberately NOT an interactive map. A featherweight inline SVG silhouette
 * gives geographic orientation, and a vertical rail lists the day's places with
 * the real driving time between each pair. Nothing traps the scroll on a phone,
 * nothing loads from a third party.
 *
 * Driving minutes come from the same real routing service the Studio uses —
 * nothing is estimated here, and a leg with no resolved time simply shows no
 * time at all.
 */

import { useMemo } from "react";
import { useRouteLegMinutes } from "@/hooks/use-route-leg-minutes";
import { sanitizePublicMapStopLabels } from "@/lib/publicItineraryProjection";
import type { RouteGlancePoint } from "@/lib/tourItineraryStops";

function slug(label: string, i: number): string {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`;
}

// Editorial silhouette of mainland Portugal — read as Portugal, not a survey.
const PT_PATH =
  "M 32 6 L 78 10 L 82 30 L 86 56 L 82 86 L 78 116 L 72 144 L 64 170 L 54 196 L 40 210 L 28 204 L 20 182 L 16 154 L 20 124 L 26 96 L 22 66 L 18 38 L 24 16 Z";

/** Approximate placement of a real coordinate inside the stylised silhouette. */
function place(lat: number, lng: number): { x: number; y: number } {
  const x = 22 + ((lng + 9.6) / 3.4) * 56;
  const y = 8 + ((42 - lat) / 5) * 197;
  return {
    x: Math.max(20, Math.min(80, x)),
    y: Math.max(10, Math.min(205, y)),
  };
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

  const dots = useMemo(() => safePoints.map((p) => place(p.lat, p.lng)), [safePoints]);

  if (safePoints.length < 2) return null;

  const hasAnyLeg = (legMinutes ?? []).some(
    (m) => typeof m === "number" && Number.isFinite(m) && m > 0,
  );

  const trail = dots.map((d, i) => `${i === 0 ? "M" : "L"} ${d.x} ${d.y}`).join(" ");

  return (
    <div
      data-testid="route-glance"
      className="mb-10 border border-[color:var(--border)] bg-[color:var(--ivory)] px-4 py-5 md:px-6 md:py-6"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
          Where the day happens
        </span>
        {region && (
          <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            {region}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-start gap-5">
        {/* Geographic anchor — where in Portugal this day sits. */}
        <svg
          viewBox="0 0 100 220"
          preserveAspectRatio="xMidYMid meet"
          className="h-44 w-auto shrink-0 md:h-52"
          role="img"
          aria-label={`Where this day sits in Portugal: ${region ?? "Portugal"}`}
        >
          <path
            d={PT_PATH}
            fill="color-mix(in oklab, var(--sand) 90%, transparent)"
            stroke="color-mix(in oklab, var(--charcoal) 26%, transparent)"
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
          <path
            d={trail}
            fill="none"
            stroke="color-mix(in oklab, var(--teal) 60%, transparent)"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {dots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={i === 0 ? 3.4 : 2.6}
              fill={i === 0 ? "var(--teal)" : "var(--gold)"}
            />
          ))}
        </svg>

        {/* The day as a rail: places, with real driving time between them. */}
        <ol className="m-0 min-w-0 flex-1 list-none p-0">
          {safePoints.map((p, i) => {
            const mins = legMinutes?.[i];
            const showLeg =
              i < safePoints.length - 1 &&
              typeof mins === "number" &&
              Number.isFinite(mins) &&
              mins > 0;
            return (
              <li key={slug(p.label, i)} className="relative pl-5">
                {i < safePoints.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[3.5px] top-[9px] bottom-0 w-px bg-[color:var(--border)]"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute left-0 top-[6px] h-2 w-2 rounded-full bg-[color:var(--gold)]"
                />
                <span className="block text-[14px] leading-snug text-[color:var(--charcoal)]">
                  {p.label}
                </span>
                {showLeg && (
                  <span className="mb-3 mt-1 block text-[11px] uppercase tracking-[0.16em] tabular-nums text-[color:var(--charcoal-soft)]">
                    ~{mins} min drive
                  </span>
                )}
                {!showLeg && i < safePoints.length - 1 && <span className="mb-3 block" />}
              </li>
            );
          })}
        </ol>
      </div>

      {hasAnyLeg && (
        <p className="mt-4 border-t border-[color:var(--border)] pt-4 text-[13.5px] leading-relaxed text-[color:var(--charcoal)]">
          <strong className="font-medium">Short, scenic hops.</strong> Real driving time
          between each pair of places on your route — with pickup and drop-off at your own
          address.
        </p>
      )}
    </div>
  );
}
