import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import type { RoutedStopUI } from "./types";

interface CandidatePin {
  key: string;
  label: string;
  lat: number;
  lng: number;
  eligible: boolean;
  reason?: string;
}

interface Props {
  stops: RoutedStopUI[];
  regionCenter: { lat: number; lng: number } | null;
  regionKey?: string;
  emotionalMode?: boolean;
  /** Candidate stops shown as additional pins (gold = eligible, dimmed = not). */
  candidates?: CandidatePin[];
  /** Tap a candidate pin to add it (only fired when eligible). */
  onCandidateClick?: (key: string) => void;
  /** When set, highlights that stop (gold pin) and pans to it — used by the
   *  Studio reveal so the map breathes with the story arc. */
  activeStopIndex?: number | null;
  /** Hide chrome for small embedded previews inside Studio Drift. */
  chrome?: boolean;
}

/**
 * Premium Leaflet route map — branded numbered pins, animated gold polyline,
 * smooth flyTo, scroll-zoom disabled (page-friendly).
 *
 * Per-region zoom memory is preserved so switching regions restores their
 * last view (see mem://preferences/builder-map-zoom).
 */
const zoomByRegion = new Map<string, { center: [number, number]; zoom: number }>();

export function BuilderMap({ stops, regionCenter, regionKey, emotionalMode = false, candidates, onCandidateClick, activeStopIndex = null, chrome = true }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const stopPointsRef = useRef<L.LatLng[]>([]);
  const lastBoundsRef = useRef<L.LatLngBounds | null>(null);
  const lastRegionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    const map = L.map(ref.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      center: [38.72, -9.14],
      zoom: 9,
    });
    L.tileLayer(
      "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      const s = map.getSize();
      if (s.x > 0 && s.y > 0 && lastBoundsRef.current) {
        map.fitBounds(lastBoundsRef.current);
      }
    });
    ro.observe(ref.current);

    map.on("zoomend moveend", () => {
      if (!lastRegionRef.current) return;
      const c = map.getCenter();
      zoomByRegion.set(lastRegionRef.current, {
        center: [c.lat, c.lng],
        zoom: map.getZoom(),
      });
    });

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Restore per-region view when region changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regionKey) return;
    if (lastRegionRef.current === regionKey) return;
    lastRegionRef.current = regionKey;
    const remembered = zoomByRegion.get(regionKey);
    if (remembered) {
      map.flyTo(remembered.center, remembered.zoom, { duration: 0.6 });
    }
  }, [regionKey]);

  // Draw real engine stops + animated route
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // Guard against 0×0 containers (e.g. mobile tab hidden via display:none).
    // Leaflet's flyTo/flyToBounds project against the map's pixel size and
    // produce NaN coords when the container has no size.
    const size = map.getSize();
    const visible = size.x > 0 && size.y > 0;

    const cs0 = getComputedStyle(document.documentElement);
    const ivory0 = cs0.getPropertyValue("--ivory").trim() || "var(--ivory)";
    const gold0 = cs0.getPropertyValue("--gold").trim() || "var(--gold)";

    if (!stops.length) {
      // Still render candidates so the user can pick a first stop on the map.
      if (candidates && candidates.length) {
        const candidateIcon = (eligible: boolean) =>
          L.divIcon({
            className: "yes-candidate-pin",
            html: `<div style="width:18px;height:18px;border-radius:50%;background:${eligible ? gold0 : "#9a8f80"};border:2px solid ${ivory0};opacity:${eligible ? 1 : 0.55};box-shadow:0 4px 10px rgba(0,0,0,0.25);cursor:${eligible ? "pointer" : "not-allowed"};"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
        const candPts: L.LatLng[] = [];
        for (const c of candidates) {
          if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
          const m = L.marker([c.lat, c.lng], { icon: candidateIcon(c.eligible) });
          m.bindTooltip(c.eligible ? c.label : `${c.label} — ${c.reason ?? "out of range"}`, {
            direction: "top",
            offset: [0, -10],
          });
          if (c.eligible && onCandidateClick) m.on("click", () => onCandidateClick(c.key));
          layer.addLayer(m);
          candPts.push(L.latLng(c.lat, c.lng));
        }
        if (candPts.length && visible) {
          map.flyToBounds(L.latLngBounds(candPts).pad(0.35), { duration: 0.6 });
          return;
        }
      }
      if (regionCenter && visible)
        map.flyTo([regionCenter.lat, regionCenter.lng], 9, { duration: 0.6 });
      else if (regionCenter) map.setView([regionCenter.lat, regionCenter.lng], 9);
      return;
    }

    const validStops = stops.filter(
      (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng),
    );
    if (!validStops.length) return;
    const points = validStops.map((s) => L.latLng(s.lat, s.lng));
    const cs = getComputedStyle(document.documentElement);
    const teal = cs.getPropertyValue("--teal").trim() || "var(--teal)";
    const ivory = cs.getPropertyValue("--ivory").trim() || "var(--ivory)";
    const gold = cs.getPropertyValue("--gold").trim() || "var(--gold)";

    const pin = (n: number, highlighted = false) =>
      L.divIcon({
        className: "yes-route-pin",
        html: `<div style="
          width:${highlighted ? 38 : 32}px;height:${highlighted ? 38 : 32}px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${highlighted ? gold : teal};border:2px solid ${ivory};
          box-shadow:0 8px 22px ${highlighted ? "rgba(201,169,106,0.55)" : "rgba(0,0,0,0.3)"};
          transition:all 400ms ease-out;
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);color:${highlighted ? "#2E2E2E" : ivory};font-weight:700;font-size:${highlighted ? 13 : 12}px;font-family:Inter,ui-sans-serif,system-ui;">${n}</span>
        </div>`,
        iconSize: [highlighted ? 38 : 32, highlighted ? 38 : 32],
        iconAnchor: [highlighted ? 19 : 16, highlighted ? 38 : 32],
      });

    stopMarkersRef.current = [];
    stopPointsRef.current = points;
    points.forEach((p, i) => {
      const m = L.marker(p, { icon: pin(i + 1, false) });
      m.bindTooltip(emotionalMode ? `momento ${i + 1}` : validStops[i].label, { direction: "top", offset: [0, -28] });
      layer.addLayer(m);
      stopMarkersRef.current.push(m);
    });

    const line = L.polyline(points, {
      color: gold,
      weight: 3.5,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
      dashArray: "8 1000",
    });
    layer.addLayer(line);

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const path = (line as unknown as { _path?: SVGPathElement })._path;
      if (path) {
        const len = (path as SVGGeometryElement).getTotalLength?.() ?? 1000;
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
        path.style.transition = "stroke-dashoffset 1400ms cubic-bezier(0.22,0.61,0.36,1)";
        path.getBoundingClientRect();
        requestAnimationFrame(() => {
          path.style.strokeDashoffset = "0";
        });
      }
    }

    // Candidate pins (gold for eligible, dimmed grey for not)
    if (candidates && candidates.length) {
      const candidateIcon = (eligible: boolean) =>
        L.divIcon({
          className: "yes-candidate-pin",
          html: `<div style="
            width:18px;height:18px;border-radius:50%;
            background:${eligible ? gold : "#9a8f80"};
            border:2px solid ${ivory};
            opacity:${eligible ? 1 : 0.55};
            box-shadow:0 4px 10px rgba(0,0,0,0.25);
            cursor:${eligible ? "pointer" : "not-allowed"};"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
      for (const c of candidates) {
        if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
        const m = L.marker([c.lat, c.lng], { icon: candidateIcon(c.eligible) });
        m.bindTooltip(
          c.eligible ? c.label : `${c.label} — ${c.reason ?? "out of range"}`,
          { direction: "top", offset: [0, -10] },
        );
        if (c.eligible && onCandidateClick) {
          m.on("click", () => onCandidateClick(c.key));
        }
        layer.addLayer(m);
      }
    }

    const bounds = L.latLngBounds(points).pad(0.35);
    lastBoundsRef.current = bounds;
    if (visible) {
      map.flyToBounds(bounds, { duration: 0.7 });
    } else {
      // Container hidden (e.g. mobile tab on display:none) — fitBounds on a
      // 0×0 map produces NaN. Just center on the first point; ResizeObserver
      // will fitBounds once the container becomes visible.
      const first = points[0];
      map.setView(first, 9);
    }
  }, [stops, regionCenter, candidates, onCandidateClick, emotionalMode]);

  // Active stop highlight — driven by the Studio reveal as the arc unfolds.
  useEffect(() => {
    const map = mapRef.current;
    const markers = stopMarkersRef.current;
    const points = stopPointsRef.current;
    if (!map || markers.length === 0) return;
    const cs = getComputedStyle(document.documentElement);
    const teal = cs.getPropertyValue("--teal").trim() || "#295B61";
    const ivory = cs.getPropertyValue("--ivory").trim() || "#FAF8F3";
    const gold = cs.getPropertyValue("--gold").trim() || "#C9A96A";

    const makeIcon = (n: number, highlighted: boolean) =>
      L.divIcon({
        className: "yes-route-pin",
        html: `<div style="
          width:${highlighted ? 38 : 32}px;height:${highlighted ? 38 : 32}px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${highlighted ? gold : teal};border:2px solid ${ivory};
          box-shadow:0 8px 22px ${highlighted ? "rgba(201,169,106,0.55)" : "rgba(0,0,0,0.3)"};
          transition:all 400ms ease-out;
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);color:${highlighted ? "#2E2E2E" : ivory};font-weight:700;font-size:${highlighted ? 13 : 12}px;font-family:Inter,ui-sans-serif,system-ui;">${n}</span>
        </div>`,
        iconSize: [highlighted ? 38 : 32, highlighted ? 38 : 32],
        iconAnchor: [highlighted ? 19 : 16, highlighted ? 38 : 32],
      });

    markers.forEach((m, i) => {
      const active = activeStopIndex !== null && activeStopIndex === i;
      m.setIcon(makeIcon(i + 1, active));
    });

    if (
      activeStopIndex !== null &&
      activeStopIndex >= 0 &&
      activeStopIndex < points.length &&
      map.getSize().x > 0
    ) {
      map.panTo(points[activeStopIndex], { animate: true, duration: 0.8 });
    }
  }, [activeStopIndex]);

  return (
    <div className="relative h-full w-full">
      {chrome && <div className="absolute top-3 left-3 z-[400] inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/95 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)] shadow-sm">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-60" />
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
        </span>
        {emotionalMode ? "a tomar forma" : "Live route"}
      </div>}
      {chrome && <div className="absolute top-3 right-3 z-[400] inline-flex items-center gap-1.5 rounded-full bg-[color:var(--ivory)]/95 backdrop-blur px-3 py-1.5 text-[10.5px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)]/75 shadow-sm">
        <MapPin size={11} aria-hidden="true" />
        {emotionalMode ? `${stops.length} momento${stops.length === 1 ? "" : "s"}` : `${stops.length} stop${stops.length === 1 ? "" : "s"}`}
      </div>}
      <div
        ref={ref}
        className="h-full w-full bg-[color:var(--sand)]"
        aria-label="Live route map"
      />
    </div>
  );
}
