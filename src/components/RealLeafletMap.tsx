import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Map as MapIcon } from "lucide-react";
import { getAllImportedStops, type TourStopRef } from "@/lib/tourStops.functions";
import { STOP_LATLNG, lookupStop, geocodeStop, type StopLatLng } from "@/data/stopGeo";

// Fix default marker icon paths (Leaflet's defaults break under bundlers)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const REGION_COLORS: Record<string, string> = {
  lisbon: "#0c5b66",   // teal
  porto: "#b3893f",    // gold
  alentejo: "#7a4d3a", // earth
  algarve: "#2c7da0",  // ocean
};

const REGION_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  lisbon: { lat: 38.72, lng: -9.14, zoom: 9 },
  porto: { lat: 41.16, lng: -8.62, zoom: 9 },
  alentejo: { lat: 38.57, lng: -7.91, zoom: 8 },
  algarve: { lat: 37.10, lng: -8.20, zoom: 9 },
};

const PORTUGAL_BOUNDS = L.latLngBounds(
  L.latLng(36.9, -9.6),
  L.latLng(42.2, -6.2),
);

// Per-region zoom memory — switching regions restores that region's
// last camera (center + zoom). Mirrors the BuilderMap behaviour so the
// experience is consistent across our two real Leaflet surfaces.
// See mem://preferences/builder-map-zoom.
const zoomByRegion = new Map<string, { center: [number, number]; zoom: number }>();
const PORTUGAL_KEY = "__portugal__";

type Marker = StopLatLng & { tours: { id: string; title: string }[] };

function makeDivIcon(color: string, count = 1) {
  const size = count > 1 ? 36 : 28;
  const inner = count > 1 ? `<span>${count}</span>` : "";
  return L.divIcon({
    className: "yes-pin",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${color};
      border:2px solid #f5efdf;box-shadow:0 2px 6px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:#f5efdf;font-weight:700;font-size:11px;font-family:ui-sans-serif,system-ui;">${inner}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

export function RealLeafletMap({ region }: { region: string | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [stops, setStops] = useState<TourStopRef[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch imported tour stops once
  useEffect(() => {
    let cancelled = false;
    getAllImportedStops()
      .then((data) => {
        if (!cancelled) setStops(data);
      })
      .catch(() => {
        if (!cancelled) setStops([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve every unique stop label → coordinates (lookup, then geocode)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Always include curated coords as a baseline so the map is meaningful
      // even before any tours are imported.
      const baseline: Record<string, Marker> = {};
      for (const k of Object.keys(STOP_LATLNG)) {
        const s = STOP_LATLNG[k];
        const id = `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`;
        if (!baseline[id]) baseline[id] = { ...s, tours: [] };
      }

      // Layer in real imported stops + tour metadata
      const byCoord: Record<string, Marker> = { ...baseline };
      const unknownByLabel = new Map<string, TourStopRef[]>();

      for (const s of stops) {
        const found = lookupStop(s.label);
        if (found) {
          const id = `${found.lat.toFixed(4)},${found.lng.toFixed(4)}`;
          if (!byCoord[id]) byCoord[id] = { ...found, region: s.region || found.region, tours: [] };
          byCoord[id].tours.push({ id: s.tourId, title: s.tourTitle });
        } else {
          const list = unknownByLabel.get(s.label) ?? [];
          list.push(s);
          unknownByLabel.set(s.label, list);
        }
      }

      // Geocode unknowns sequentially (Nominatim asks for ≤1 req/sec)
      for (const [label, refs] of unknownByLabel) {
        if (cancelled) return;
        const geo = await geocodeStop(label);
        if (geo) {
          const id = `${geo.lat.toFixed(4)},${geo.lng.toFixed(4)}`;
          if (!byCoord[id])
            byCoord[id] = { ...geo, region: refs[0]?.region || geo.region, tours: [] };
          for (const r of refs)
            byCoord[id].tours.push({ id: r.tourId, title: r.tourTitle });
        }
        // Tiny pause to be polite to Nominatim
        await new Promise((r) => setTimeout(r, 1100));
      }

      if (!cancelled) setMarkers(Object.values(byCoord));
    })();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  // Initialise the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const el = containerRef.current;
    // Default centre on Portugal so we never call fitBounds on a 0×0 element
    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
      center: [39.5, -8.0],
      zoom: 6,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    // Wait for the container to be measurable, then fit Portugal
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        map.invalidateSize();
        map.fitBounds(PORTUGAL_BOUNDS, { animate: false });
        ro.disconnect();
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  // Refresh markers whenever the resolved set changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 40,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        return makeDivIcon("#0c5b66", n);
      },
    });
    for (const m of markers) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
      const color = REGION_COLORS[m.region] ?? REGION_COLORS.lisbon;
      const marker = L.marker([m.lat, m.lng], { icon: makeDivIcon(color, 1) });
      const tourList = m.tours.length
        ? `<div style="margin-top:6px;font-size:11px;color:#555;">
             <strong>${m.tours.length}</strong> tour${m.tours.length === 1 ? "" : "s"}:
             <ul style="margin:4px 0 0 0;padding-left:14px;max-height:120px;overflow:auto;">
               ${m.tours.slice(0, 8).map((t) => `<li>${escapeHtml(t.title)}</li>`).join("")}
               ${m.tours.length > 8 ? `<li>+${m.tours.length - 8} more</li>` : ""}
             </ul>
           </div>`
        : `<div style="margin-top:6px;font-size:11px;color:#888;font-style:italic;">No imported tours yet</div>`;
      marker.bindPopup(
        `<div style="font-family:ui-sans-serif,system-ui;min-width:160px;">
          <div style="font-weight:700;color:#1a1a1a;">${escapeHtml(m.label)}</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:${color};margin-top:2px;">${m.region}</div>
          ${tourList}
        </div>`,
      );
      cluster.addLayer(marker);
    }
    map.addLayer(cluster);
    clusterRef.current = cluster;
  }, [markers]);

  // Fly to selected region (or back to whole-Portugal view)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const el = containerRef.current;
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
    if (region && REGION_CENTERS[region]) {
      const c = REGION_CENTERS[region];
      map.flyTo([c.lat, c.lng], c.zoom, { duration: 0.8 });
    } else {
      map.flyToBounds(PORTUGAL_BOUNDS, { duration: 0.8 });
    }
  }, [region]);

  const totalTours = useMemo(
    () => markers.reduce((s, m) => s + m.tours.length, 0),
    [markers],
  );

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] overflow-hidden">
      <div className="flex items-baseline justify-between px-5 pt-5">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--gold)] inline-flex items-center gap-2">
          <MapIcon size={12} /> Live Map
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
          {loading
            ? "Loading stops…"
            : `${markers.length} stops · ${totalTours} tour mention${totalTours === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="relative aspect-[4/5] mt-3 mx-5 mb-5 overflow-hidden rounded-sm border border-[color:var(--border)]">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
