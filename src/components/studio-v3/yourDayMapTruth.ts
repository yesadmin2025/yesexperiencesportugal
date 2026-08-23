/**
 * Your Day — map truth resolver.
 *
 * ONE rule decides whether the `Your Day` surface shows a geographic map or
 * an editorial timeline: do we hold real coordinates for every moment we are
 * about to plot?
 *
 * We never invent a position. The previous behaviour distributed coordinate-
 * less stops along a decorative S-curve over a Portugal silhouette, which
 * reads as a map and therefore *claims* geography we do not have. When the
 * truth is missing the surface must change shape (editorial timeline), not
 * fake the shape it cannot honour.
 *
 * Route geometry is a separate truth: pins in order do not make a route.
 * A line is only drawn when real routing geometry exists — connecting pins
 * with a curve and calling it "the route" is exactly the invention this
 * resolver exists to prevent.
 */

/** Mainland Portugal bounding box, generous at the edges. */
const PT_LAT_MIN = 36.8;
const PT_LAT_MAX = 42.3;
const PT_LNG_MIN = -9.8;
const PT_LNG_MAX = -6.0;

/** A single-day route cannot legitimately span more than this. */
const MAX_SPAN_KM = 400;
/** Two pins closer than this are the same place; plotting both is noise. */
const MIN_DISTINCT_KM = 0.05;

export interface YourDayMomentInput {
  label: string;
  lat?: number | null;
  lng?: number | null;
  /** Region/locality already present in the catalog. Never derived. */
  location?: string | null;
  story?: string | null;
}

export interface YourDayMapStop {
  label: string;
  lat: number;
  lng: number;
  /** 1-based position in the real moment order. */
  position: number;
}

export type YourDayMapTruth =
  | {
      mode: "map";
      stops: YourDayMapStop[];
      /** True only when real routing geometry backs the drawn line. */
      hasRouteGeometry: boolean;
      reason: "coordinates-complete";
    }
  | {
      mode: "timeline";
      stops: [];
      hasRouteGeometry: false;
      reason: "no-moments" | "too-few-coordinates" | "incomplete-coordinates" | "incoherent-span";
    };

function isRealCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= PT_LAT_MIN &&
    lat <= PT_LAT_MAX &&
    lng >= PT_LNG_MIN &&
    lng <= PT_LNG_MAX
  );
}

/** Equirectangular approximation — precise enough for a sanity bound. */
export function approxDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lng - a.lng) * Math.cos(midLat) * 111.32;
  const dy = (b.lat - a.lat) * 110.57;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface ResolveOptions {
  /**
   * Pass `true` only when the caller holds real route geometry (an actual
   * routed polyline). Defaults to false: no geometry, no line.
   */
  hasRouteGeometry?: boolean;
}

export function resolveYourDayMapTruth(
  moments: ReadonlyArray<YourDayMomentInput>,
  options: ResolveOptions = {},
): YourDayMapTruth {
  const timeline = (reason: Exclude<YourDayMapTruth, { mode: "map" }>["reason"]) =>
    ({ mode: "timeline", stops: [], hasRouteGeometry: false, reason }) as const;

  if (moments.length === 0) return timeline("no-moments");

  const plotted: YourDayMapStop[] = [];
  for (let i = 0; i < moments.length; i += 1) {
    const m = moments[i];
    if (!isRealCoord(m.lat, m.lng)) {
      // Partial geography is still a claim we cannot support: a map missing
      // moment 03 silently rewrites the day. Fall back wholesale.
      return timeline(moments.length < 2 ? "too-few-coordinates" : "incomplete-coordinates");
    }
    plotted.push({ label: m.label, lat: m.lat as number, lng: m.lng as number, position: i + 1 });
  }

  if (plotted.length < 2) return timeline("too-few-coordinates");

  for (let i = 0; i < plotted.length; i += 1) {
    for (let j = i + 1; j < plotted.length; j += 1) {
      const km = approxDistanceKm(plotted[i], plotted[j]);
      // Coordinates that collapse onto each other, or sprawl across the
      // country, are a data problem — not a day. Don't render them as one.
      if (km < MIN_DISTINCT_KM || km > MAX_SPAN_KM) return timeline("incoherent-span");
    }
  }

  return {
    mode: "map",
    stops: plotted,
    hasRouteGeometry: options.hasRouteGeometry === true,
    reason: "coordinates-complete",
  };
}
