import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  PLANNER_ISLAND_REGIONS,
  PLANNER_MAINLAND_REGIONS,
  PLANNER_MAP,
  PLANNER_ORIGIN,
  PLANNER_REGIONS,
  projectPlannerPoint,
  resolvePlannerRegion,
  type PlannerRegion,
} from "@/content/portugal-planner-map";

import { PORTUGAL_MAINLAND_PATH } from "@/content/portugal-outline";

/**
 * PortugalPlannerMap — interactive homepage map.
 *
 * Real geography: the outline is the traced mainland Portugal coastline and
 * every pin sits at its true lat/lon. Tap a pin and the panel reveals the real
 * Signature days and the real Local Stories guides for that part of the
 * country. HTML buttons sit on top of the SVG so each pin is keyboard-reachable
 * and 44×44 on mobile.
 */

const VB_W = PLANNER_MAP.width;
const VB_H = PLANNER_MAP.height;

function pct(value: number, span: number) {
  return `${(value / span) * 100}%`;
}

export function PortugalPlannerMap() {
  const [activeId, setActiveId] = useState<string>("arrabida");

  const active = useMemo(() => {
    const region =
      PLANNER_REGIONS.find((r) => r.id === activeId) ?? (PLANNER_REGIONS[0] as PlannerRegion);
    return resolvePlannerRegion(region);
  }, [activeId]);

  return (
    <div className="grid gap-8 md:gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
      <div>
        {/* Map */}
        <div
          className="relative mx-auto w-full max-w-[210px] md:max-w-none overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--sand)]"
          style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id="ppm-grid" width="6.78" height="6.5" patternUnits="userSpaceOnUse">
                <path d="M 6.78 0 L 0 0 0 6.5" fill="none" stroke="var(--gold)" strokeWidth="0.15" />
              </pattern>
            </defs>
            <rect width={VB_W} height={VB_H} fill="url(#ppm-grid)" opacity="0.3" />
            {/* Mainland Portugal, traced from Natural Earth 1:10m boundaries. */}
            <path
              d={PORTUGAL_MAINLAND_PATH}
              fill="color-mix(in oklab, var(--teal) 9%, transparent)"
              stroke="color-mix(in oklab, var(--teal) 45%, transparent)"
              strokeWidth="0.45"
              strokeLinejoin="round"
            />
          </svg>

          {/* Lisbon — where every private day starts and ends. Not a place pin. */}
          {(() => {
            const { x, y } = projectPlannerPoint(PLANNER_ORIGIN.lat, PLANNER_ORIGIN.lon);
            return (
              <span
                aria-hidden="true"
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: pct(x, VB_W), top: pct(y, VB_H) }}
              >
                <span className="block h-[7px] w-[7px] rotate-45 border border-[color:var(--charcoal)] bg-[color:var(--ivory)]" />
              </span>
            );
          })()}

          {/* Place markers. Decorative: the chip list below is the control, so
              every place keeps a reliable 44×44 target even where pins cluster. */}
          {PLANNER_MAINLAND_REGIONS.map((region) => {
            const isActive = region.id === active.id;
            const { x, y } = projectPlannerPoint(region.lat, region.lon);
            const labelLeft = x > VB_W * 0.55;
            const hasDay = region.tourIds.length > 0;
            return (
              <span
                key={region.id}
                aria-hidden="true"
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: pct(x, VB_W), top: pct(y, VB_H), zIndex: isActive ? 2 : 1 }}
              >
                <span
                  className={`block rounded-full transition-all duration-200 ${
                    isActive
                      ? "h-[9px] w-[9px] bg-[color:var(--gold)] ring-4 ring-[color:var(--gold)]/25"
                      : hasDay
                        ? "h-[5px] w-[5px] bg-[color:var(--teal)]/70"
                        : "h-[5px] w-[5px] border border-[color:var(--teal)]/60 bg-[color:var(--ivory)]"
                  }`}
                />
                {isActive && (
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[color:var(--ivory)]/90 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal)] ${
                      labelLeft ? "right-[calc(50%+10px)] text-right" : "left-[calc(50%+10px)]"
                    }`}
                  >
                    {region.label}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Places — the accessible control for the map. */}
        <ul className="mt-5 flex list-none flex-wrap justify-center gap-1.5 p-0 md:justify-start">
          {PLANNER_MAINLAND_REGIONS.map((region) => {
            const isActive = region.id === active.id;
            return (
              <li key={region.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(region.id)}
                  aria-pressed={isActive}
                  className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-[12.5px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] ${
                    isActive
                      ? "border-[color:var(--gold)] bg-[color:var(--gold)]/12 text-[color:var(--charcoal)]"
                      : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--teal)]"
                  }`}
                >
                  {region.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Atlantic Portugal — Madeira and the Azores sit far off the mainland
            frame, so they get their own row rather than a distorted pin. */}
        <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
          Atlantic Portugal
        </p>
        <ul className="mt-3 flex list-none flex-wrap justify-center gap-1.5 p-0 md:justify-start">
          {PLANNER_ISLAND_REGIONS.map((region) => {
            const isActive = region.id === active.id;
            return (
              <li key={region.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(region.id)}
                  aria-pressed={isActive}
                  className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-[12.5px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] ${
                    isActive
                      ? "border-[color:var(--gold)] bg-[color:var(--gold)]/12 text-[color:var(--charcoal)]"
                      : "border-[color:var(--border)] text-[color:var(--charcoal-soft)] hover:text-[color:var(--teal)]"
                  }`}
                >
                  {region.label}
                </button>
              </li>
            );
          })}
        </ul>

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

        <div className="mt-7 rounded-lg border border-[color:var(--border)] bg-[color:var(--sand)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
            Somewhere else in Portugal?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">
            Douro, Porto, the Algarve, the Beiras — we drive the whole mainland. Tell us where you
            want to be and the day is built around it.
          </p>
          <Link
            to="/portugal-travel-designer"
            className="mt-3 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]"
          >
            Design your own day →
          </Link>
        </div>

        <div className="mt-5">
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
