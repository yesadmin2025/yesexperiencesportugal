import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  PLANNER_REGIONS,
  resolvePlannerRegion,
  type PlannerRegion,
} from "@/content/portugal-planner-map";

/**
 * PortugalPlannerMap — interactive homepage map.
 *
 * Tap a region pin and the panel reveals the real Signature days and the
 * real Local Stories guides for that part of the country. Pure SVG backdrop
 * (same schematic language as EditorialMap), HTML buttons on top so every
 * pin is keyboard-reachable and 44×44 on mobile.
 */

const VB_W = 100;
const VB_H = 130;

function pct(value: number, span: number) {
  return `${(value / span) * 100}%`;
}

export function PortugalPlannerMap() {
  const [activeId, setActiveId] = useState<string>("arrabida-setubal");

  const active = useMemo(() => {
    const region =
      PLANNER_REGIONS.find((r) => r.id === activeId) ?? (PLANNER_REGIONS[0] as PlannerRegion);
    return resolvePlannerRegion(region);
  }, [activeId]);

  return (
    <div className="grid gap-8 md:gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
      {/* Map */}
      <div
        className="relative overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--sand)]"
        style={{ aspectRatio: "100 / 130" }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="ppm-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--gold)" strokeWidth="0.2" />
            </pattern>
          </defs>
          <rect width={VB_W} height={VB_H} fill="url(#ppm-grid)" opacity="0.35" />
          {/* Mainland silhouette, schematic — orientation only, not a survey map. */}
          <path
            d="M 26 46 C 24 38 26 30 30 24 C 36 16 44 12 52 14 C 58 15 60 22 58 30 C 57 38 58 46 60 54 C 62 64 62 74 60 84 C 58 94 54 102 48 110 C 42 118 34 122 28 118 C 22 114 20 104 21 94 C 22 84 24 74 24 64 C 24 58 25 52 26 46 Z"
            fill="color-mix(in oklab, var(--teal) 8%, transparent)"
            stroke="color-mix(in oklab, var(--teal) 35%, transparent)"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>

        {PLANNER_REGIONS.map((region) => {
          const isActive = region.id === active.id;
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => setActiveId(region.id)}
              aria-pressed={isActive}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] rounded-full"
              style={{ left: pct(region.x, VB_W), top: pct(region.y, VB_H) }}
            >
              <span className="sr-only">{region.label}</span>
              <span
                aria-hidden="true"
                className={`block rounded-full transition-all duration-200 ${
                  isActive
                    ? "h-3.5 w-3.5 bg-[color:var(--gold)] ring-4 ring-[color:var(--gold)]/25"
                    : "h-2.5 w-2.5 bg-[color:var(--teal)]/70"
                }`}
              />
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-[calc(50%+14px)] -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.18em] ${
                  isActive
                    ? "text-[color:var(--charcoal)]"
                    : "text-[color:var(--charcoal-soft)]"
                }`}
              >
                {region.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div aria-live="polite" className="min-w-0">
        <span className="block text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)]">
          {active.label}
        </span>
        <h3 className="serif mt-3 text-[1.4rem] md:text-[1.7rem] leading-[1.2] text-[color:var(--charcoal)]">
          {active.note}
        </h3>

        {active.tours.length > 0 && (
          <>
            <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Private days here
            </p>
            <ul className="mt-3 list-none p-0 space-y-2">
              {active.tours.map((tour) => (
                <li key={tour.id}>
                  <Link
                    to="/tours/$tourId"
                    params={{ tourId: tour.id }}
                    className="group flex items-baseline gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--ivory)] px-4 py-3 transition-transform duration-200 hover:-translate-y-[2px] focus-visible:-translate-y-[2px]"
                  >
                    <span className="text-[14.5px] leading-snug text-[color:var(--charcoal)]">
                      {tour.title}
                    </span>
                    <span className="ml-auto shrink-0 text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
                      View →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {active.guides.length > 0 && (
          <>
            <p className="mt-7 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
              Guides for this region
            </p>
            <ul className="mt-3 list-none p-0 flex flex-wrap gap-2">
              {active.guides.slice(0, 5).map((guide) => (
                <li key={guide.slug}>
                  <Link
                    to="/local-stories/$slug"
                    params={{ slug: guide.slug }}
                    className="inline-block rounded-full border border-[color:var(--border)] px-4 py-2 text-[13px] text-[color:var(--charcoal-soft)] transition-colors duration-200 hover:text-[color:var(--teal)]"
                  >
                    {guide.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-7">
          <Link
            to="/local-stories"
            className="text-sm underline underline-offset-4 text-[color:var(--charcoal)]"
          >
            All Portugal guides
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PortugalPlannerMap;
