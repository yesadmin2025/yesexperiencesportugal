/**
 * SignatureRouteMap — real Leaflet map for Signature tour pages.
 *
 * Purpose: show geography only — real coastline + place names via CartoDB
 * Voyager tiles, numbered gold pins at real stop coordinates, and the true
 * driving route from OSRM (fallback: straight dashed line between stops).
 *
 * Content policy: this component NEVER surfaces invented operational
 * notes (arrival windows, transit claims, on-site duration, meals).
 * Stops mirror the Viator source page — labels only, plus real km /
 * drive time per leg from OSRM.
 *
 * Client-only: Leaflet touches `window`, so we dynamic-import it after
 * mount and render a lightweight placeholder during SSR.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import type { SignatureTour } from "@/data/signatureTours";
import { lookupStop } from "@/data/stopGeo";
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
  const baseStops = useMemo<ResolvedStop[]>(() => {
    const out: ResolvedStop[] = [];
    const seen = new Set<string>();
    for (const s of tour.stops ?? []) {
      const hit = lookupStop(s.label);
      if (!hit) continue;
      const key = `${hit.lat.toFixed(4)},${hit.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: s.label, lat: hit.lat, lng: hit.lng });
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
            Real locations across {tour.region}. The map shows the drive between
            them — distances only, so you get a feel for the ground you'll cover.
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

        {/* Real km + drive minutes per leg — from OSRM, not invented. */}
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

        {/* Plain numbered list of stops — labels only, matches Viator source. */}
        <ol className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-2 list-none p-0">
          {stops.map((p, i) => (
            <li
              key={`${p.label}-${i}`}
              className="flex items-baseline gap-3 text-[14px] text-[color:var(--charcoal)]"
            >
              <span
                aria-hidden
                className="shrink-0 text-[11px] font-semibold text-[color:var(--gold)] tabular-nums w-4"
              >
                {i + 1}.
              </span>
              <span className="leading-snug">{p.label}</span>
            </li>
          ))}
        </ol>

        {tour.wineriesRule ? (
          <p className="mt-6 text-[13px] text-[color:var(--charcoal)] leading-relaxed max-w-3xl border-l-2 border-[color:var(--gold)] pl-3">
            {tour.wineriesRule}
          </p>
        ) : null}

        <p className="mt-4 text-[13px] text-[color:var(--charcoal-soft)] leading-relaxed max-w-3xl">
          Your guide sets the order and pace on the day — not every stop, every time.
        </p>

      </div>
    </section>
  );
}
