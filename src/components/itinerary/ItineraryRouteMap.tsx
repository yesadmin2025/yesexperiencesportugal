/**
 * ItineraryRouteMap — the geographic view of a guest's confirmed day on
 * `/itinerary`.
 *
 * Numbered gold pins mirror the numbers in the written list (pin 3 is stop
 * 3). Real driving geometry is drawn only when the booking resolves to a
 * Signature route whose stops match the snapshot exactly; otherwise the
 * stops are connected with a soft dashed line — a sequence indicator, not a
 * road claim.
 *
 * Content policy: no clock times, no invented distances, no invented stops.
 * Client-only: Leaflet touches `window`, so it is imported after mount.
 */

import { useEffect, useRef } from "react";
import { MAP_CANVAS_CLASS, MAP_FRAME_CLASS } from "@/components/SignatureRouteMapShell";
import { describeRoute, type ItineraryGeoStop } from "@/lib/itinerary-view";

interface Props {
  stops: ItineraryGeoStop[];
  /** Encoded OSRM geometry — drawn only when it matches these stops. */
  polylines?: readonly string[];
}

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

function makeGoldPin(L: typeof import("leaflet"), order: number) {
  return L.divIcon({
    className: "yes-itinerary-pin",
    html: `<div style="
        width:30px;height:30px;border-radius:50%;
        background:var(--ivory,#faf8f3);
        border:2px solid var(--gold,#c9a96a);
        box-shadow:0 2px 8px rgba(0,0,0,0.28), 0 0 0 6px rgba(201,169,106,0.18);
        display:flex;align-items:center;justify-content:center;
        font-family:ui-sans-serif,system-ui;font-weight:600;font-size:13px;
        color:var(--teal,#295b61);line-height:1;">${order}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export default function ItineraryRouteMap({ stops, polylines = [] }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current || stops.length === 0) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (disposed || !ref.current) return;

        const map = L.map(ref.current, {
          zoomControl: true,
          scrollWheelZoom: false,
          attributionControl: false,
        });
        mapRef.current = map;

        const primary = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          { maxZoom: 18 },
        );
        primary.on("tileerror", () => {
          try {
            map.removeLayer(primary);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              maxZoom: 18,
            }).addTo(map);
          } catch {
            /* tiles unavailable — pins still convey the geography */
          }
        });
        primary.addTo(map);

        if (polylines.length > 0) {
          polylines.forEach((encoded) => {
            const coords = decodePolyline(encoded);
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

        stops.forEach((s) => {
          L.marker([s.lat, s.lng], { icon: makeGoldPin(L, s.order), title: s.label })
            .bindTooltip(`${s.order}. ${s.label}`, {
              direction: "top",
              offset: [0, -14],
              className: "yes-signature-tip",
            })
            .addTo(map);
        });

        if (stops.length === 1) {
          map.setView([stops[0].lat, stops[0].lng], 12);
        } else {
          map.fitBounds(
            L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number])),
            { padding: [36, 36], maxZoom: 12 },
          );
        }

        cleanup = () => map.remove();
      } catch (err) {
        console.warn("[ItineraryRouteMap] Leaflet init failed", err);
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
      mapRef.current = null;
    };
  }, [stops, polylines]);

  return (
    <div className={MAP_FRAME_CLASS}>
      <div ref={ref} className={MAP_CANVAS_CLASS} role="img" aria-label={describeRoute(stops)} />
    </div>
  );
}
