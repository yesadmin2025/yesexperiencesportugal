/**
 * SignatureRouteMap — real Leaflet map for Signature tour pages.
 *
 * Renders actual coastline + place names via CartoDB Voyager tiles, drops
 * numbered gold pins at real stop coordinates, and draws the true driving
 * route returned by OSRM (fallback: straight dashed line between stops).
 *
 * Client-only: Leaflet touches `window`, so we dynamic-import it after
 * mount and render a lightweight placeholder during SSR.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, Sunrise, Route as RouteIcon } from "lucide-react";
import type { SignatureTour } from "@/data/signatureTours";
import { lookupStop } from "@/data/stopGeo";
import { lookupStopNote } from "@/data/stopNotes";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { RouteLegend } from "@/components/studio-v3/RouteLegend";
import {
  getSignatureTourRoute,
  type SignatureRoutePayload,
} from "@/lib/signature-route.functions";

/** Google encoded-polyline decoder (precision 5). */
function decodePolyline(str: string): Array<[number, number]> {
  let index = 0;
  const len = str.length;
  let lat = 0;
  let lng = 0;
  const coords: Array<[number, number]> = [];
  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat * 1e-5, lng * 1e-5]);
  }
  return coords;
}

interface Props {
  tour: SignatureTour;
}

interface ResolvedStop {
  label: string;
  lat: number;
  lng: number;
  bestArrival?: string;
  transit?: string;
  duration?: string;
}

function makeGoldPin(L: typeof import("leaflet"), index: number) {
  return L.divIcon({
    className: "yes-signature-pin",
    html: `<div style="
        width:30px;height:30px;border-radius:50%;
        background:var(--ivory,#faf8f3);
        border:2px solid var(--gold,#c9a96a);
        box-shadow:0 2px 8px rgba(0,0,0,0.28), 0 0 0 6px rgba(201,169,106,0.18);
        display:flex;align-items:center;justify-content:center;
        font-family:ui-sans-serif,system-ui;font-weight:600;font-size:13px;
        color:var(--teal,#295b61);line-height:1;">${index + 1}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function LeafletMap({
  stops,
  polylines,
  ariaLabel,
}: {
  stops: ResolvedStop[];
  polylines: Array<Array<[number, number]>>;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (disposed || !ref.current) return;

      const map = L.map(ref.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      });
      mapRef.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { maxZoom: 18 },
      ).addTo(map);

      // Draw real driving polylines when available, else straight leg lines.
      if (polylines.length > 0) {
        polylines.forEach((coords) => {
          if (coords.length < 2) return;
          L.polyline(coords, {
            color: "var(--teal)",
            weight: 3.5,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
        });
      } else if (stops.length >= 2) {
        L.polyline(
          stops.map((s) => [s.lat, s.lng] as [number, number]),
          {
            color: "var(--teal)",
            weight: 2.5,
            opacity: 0.55,
            dashArray: "6 8",
            lineCap: "round",
          },
        ).addTo(map);
      }

      stops.forEach((s, i) => {
        L.marker([s.lat, s.lng], { icon: makeGoldPin(L, i), title: s.label })
          .bindTooltip(`${i + 1}. ${s.label}`, {
            direction: "top",
            offset: [0, -14],
            className: "yes-signature-tip",
          })
          .addTo(map);
      });

      const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });

      cleanup = () => map.remove();
    })();

    return () => {
      disposed = true;
      cleanup?.();
      mapRef.current = null;
    };
    // Re-init when the route payload changes (new tour or polylines resolved)
  }, [stops, polylines]);

  return (
    <div
      ref={ref}
      className="w-full aspect-[16/11] md:aspect-[16/9] bg-[color:var(--sand)]"
      role="img"
      aria-label={ariaLabel}
    />
  );
}

export function SignatureRouteMap({ tour }: Props) {
  // Client-side base stops from curated coords — instant render, no wait.
  const baseStops = useMemo<ResolvedStop[]>(() => {
    const out: ResolvedStop[] = [];
    const seen = new Set<string>();
    for (const s of tour.stops ?? []) {
      const hit = lookupStop(s.label);
      if (!hit) continue;
      const key = `${hit.lat.toFixed(4)},${hit.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const note = lookupStopNote(s.label);
      out.push({
        label: s.label,
        lat: hit.lat,
        lng: hit.lng,
        bestArrival: note?.bestArrival,
        transit: note?.transit,
        duration: note?.duration,
      });
    }
    return out;
  }, [tour]);

  const fetchRoute = useServerFn(getSignatureTourRoute);
  const { data } = useQuery<SignatureRoutePayload>({
    queryKey: ["signature-route", tour.id],
    queryFn: () => fetchRoute({ data: { tourId: tour.id } }),
    enabled: baseStops.length >= 2,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const stops: ResolvedStop[] = data?.stops?.length ? data.stops : baseStops;
  const polylines = useMemo(
    () => (data?.legs ?? []).map((l) => decodePolyline(l.polyline)),
    [data],
  );

  if (stops.length === 0) return null;

  const legMinutes = data?.legs?.map((l) => l.driveMinutes) ?? null;
  const legDistancesKm = data?.legs?.map((l) => l.distanceKm) ?? null;
  const legModes = data?.legs?.map(() => "driving" as const) ?? null;

  return (
    <section className="py-14 md:py-20 reveal">
      <div className="container-x max-w-5xl">
        <div className="text-center mb-8">
          <Eyebrow flank>The route</Eyebrow>
          <SectionTitle size="compact">
            Where the <SectionTitle.Em>day goes</SectionTitle.Em>
          </SectionTitle>
          <p className="mt-3 text-[14px] text-[color:var(--charcoal-soft)] max-w-lg mx-auto">
            Real locations across {tour.region}. The route below is drawn on real
            roads — your guide sets the order and pace on the day.
          </p>
        </div>

        <div className="relative overflow-hidden border border-[color:var(--gold)]/25 rounded-[6px] shadow-[0_2px_18px_rgba(46,46,46,0.06)]">
          <LeafletMap
            stops={stops}
            polylines={polylines}
            ariaLabel={`Route map for ${tour.title} — ${stops.length} stops across ${tour.region}`}
          />

          <div className="absolute top-3 left-3 z-[400] pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--ivory)]/95 backdrop-blur-sm px-3 py-1.5 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] border border-[color:var(--gold)]/40 shadow-sm">
              <MapPin size={11} className="text-[color:var(--gold)]" aria-hidden />
              {tour.region}
            </span>
          </div>
        </div>

        {/* Route breakdown — real km + min per leg when OSRM has resolved. */}
        {legMinutes && legMinutes.length > 0 && (
          <div className="mt-5">
            <RouteLegend
              originLabel={stops[0]?.label ?? null}
              stopLabels={stops.slice(1).map((s) => s.label)}
              legMinutes={legMinutes}
              legDistancesKm={legDistancesKm}
              legModes={legModes}
            />
          </div>
        )}

        {/* Per-stop travel notes — arrival, transit, duration. Fields hide when unknown. */}
        <ol className="mt-8 space-y-4 list-none p-0">
          {stops.map((p, i) => {
            const hasNotes = Boolean(p.bestArrival || p.transit || p.duration);
            return (
              <li
                key={`${p.label}-${i}`}
                className="flex gap-4 border-t border-[color:var(--gold)]/15 pt-4 first:border-t-0 first:pt-0"
              >
                <span
                  aria-hidden
                  className="shrink-0 mt-0.5 w-8 h-8 rounded-full border border-[color:var(--gold)]/50 bg-[color:var(--ivory)] flex items-center justify-center text-[13px] font-semibold text-[color:var(--teal)]"
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[color:var(--charcoal)] leading-snug">
                    {p.label}
                  </div>
                  {hasNotes && (
                    <dl className="mt-2 grid sm:grid-cols-3 gap-x-5 gap-y-1.5 text-[12.5px] text-[color:var(--charcoal-soft)]">
                      {p.bestArrival && (
                        <div className="flex items-start gap-1.5">
                          <Sunrise size={12} className="text-[color:var(--gold)] mt-0.5 shrink-0" aria-hidden />
                          <div>
                            <dt className="text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal)] font-semibold">Arrive</dt>
                            <dd className="leading-snug">{p.bestArrival}</dd>
                          </div>
                        </div>
                      )}
                      {p.transit && (
                        <div className="flex items-start gap-1.5">
                          <RouteIcon size={12} className="text-[color:var(--gold)] mt-0.5 shrink-0" aria-hidden />
                          <div>
                            <dt className="text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal)] font-semibold">Getting there</dt>
                            <dd className="leading-snug">{p.transit}</dd>
                          </div>
                        </div>
                      )}
                      {p.duration && (
                        <div className="flex items-start gap-1.5">
                          <Clock size={12} className="text-[color:var(--gold)] mt-0.5 shrink-0" aria-hidden />
                          <div>
                            <dt className="text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal)] font-semibold">Time on site</dt>
                            <dd className="leading-snug">{p.duration}</dd>
                          </div>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-[13px] text-[color:var(--charcoal-soft)] leading-relaxed max-w-3xl">
          Your day is shaped from these stops — your guide sets the order and pace
          around you. Not every stop, every time.
        </p>

        <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]/70">
          Map data ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[color:var(--gold)]/40 underline-offset-2"
          >
            OpenStreetMap
          </a>{" "}
          · Tiles ©{" "}
          <a
            href="https://carto.com/attributions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[color:var(--gold)]/40 underline-offset-2"
          >
            CARTO
          </a>
        </p>
      </div>
    </section>
  );
}
