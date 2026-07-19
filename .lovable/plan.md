## Goal
Replace the abstract dark-grid SVG "map" on the Signature tour page (`/tours/:tourId`) with a real, geographic Portugal map that shows the actual stop locations, distances and drive times — so international travellers who don't know Portugal instantly understand where the day happens.

## Current problem
`RouteMap` in `src/routes/tours.$tourId.tsx` (lines 526–684) renders a stylised SVG with numbered dots on a black grid. There is no coastline, no city names, no scale — nothing that tells a traveller "this is south of Lisbon, on the Arrábida coast."

## What we already have (reuse, don't rebuild)
- `src/components/RealLeafletMap.tsx` — Leaflet map with region centres, Portugal bounds, branded pins, per-region zoom memory.
- `src/data/stopGeo.ts` — real lat/lng lookup + geocoder for stop labels.
- `src/lib/studio-v2/routing.server.ts` — OSRM driving legs (distance km + drive minutes + polyline), cached in `builder_route_cache`. Already used by Studio.
- `src/components/studio-v3/RouteLegend.tsx` — locked-contract legend showing per-leg minutes, km, walking/driving mode + totals.

## Plan

### 1. New component `SignatureRouteMap` (`src/components/SignatureRouteMap.tsx`)
Real Leaflet map, dynamically imported (browser-only, gated by `<ClientOnly>` per stack rules).

- Base tiles: CartoDB Voyager (soft, editorial — matches ivory/teal palette better than default OSM).
- Fit bounds to the tour's stops with padding; disable scroll-wheel zoom by default (mobile-friendly), keep pinch + drag + +/− controls.
- Numbered gold pins (reuse the `makeDivIcon` style from `RealLeafletMap`) at each real stop lat/lng from `stopGeo`.
- Draw the real driving route by decoding the OSRM polylines returned from a new server function (see §2) — falls back to a straight dashed line between stops if routing fails.
- Region label chip in the corner ("Setúbal Peninsula · south of Lisbon") derived from `tour.seed.region` so travellers get geographic anchoring at a glance.

### 2. Server function `getSignatureTourRoute` (`src/lib/signature-route.functions.ts`)
- Input: `tourId`.
- Resolves the tour's ordered stops → lat/lng via `stopGeo`.
- Calls existing `resolveLegs(...)` (`src/lib/studio-v2/routing.server.ts`) to get per-leg `distance_km`, `drive_minutes`, `polyline`.
- Returns `{ stops: [{label, lat, lng}], legs: [{fromLabel, toLabel, distanceKm, driveMinutes, polyline}] }`.
- Cached at the route-cache layer already; no new table.

Called from the tour route's loader (public route — this fn is unauthenticated, safe for SSR/prerender) so the map ships with data on first paint.

### 3. Legend below the map
Reuse `RouteLegend` (already tested) to render:
- Per-leg row: "Mercado do Livramento → Parque Natural da Arrábida · 18 min · 22 km" with driving/walking icons.
- Footer totals: "1 h 12 min in transit · 68 km · 6 driving".

Replaces the current bare numbered `<ol>` — travellers now see distances, not just names.

### 4. Wire into tour page
In `src/routes/tours.$tourId.tsx`:
- Replace the `<RouteMap …>` call (line 209) with `<SignatureRouteMap tour={tour} route={loaderRoute} meta={meta} />`.
- Delete the old `RouteMap` function (lines 526–684) and the now-unused `snapStop` / grid SVG scaffolding it depends on (verify no other importers first).
- Keep the same section framing: Eyebrow "The route", SectionTitle "Where the day goes", closing microcopy "Your day is shaped from these stops…".

### 5. Motion & polish (brand-guardrails compliant)
- Fade + 12px translateY entry (≤220ms), respects `prefers-reduced-motion`.
- No parallax, no shimmer.
- Pins use `--gold`; route line uses `--teal` at 0.85 opacity, 3px, rounded caps.
- Aspect 16/11 mobile, 16/9 desktop — matches current section rhythm.

### 6. A11y
- Map container has `role="img"` + `aria-label="Route map showing 7 stops across the Setúbal Peninsula, south of Lisbon"`.
- Legend remains a proper `<ol>` so screen-reader users get the same data without the map.

## Files touched
- **New:** `src/components/SignatureRouteMap.tsx`, `src/lib/signature-route.functions.ts`
- **Edited:** `src/routes/tours.$tourId.tsx` (swap component, remove old `RouteMap`, add loader call)
- **Reused unchanged:** `RealLeafletMap` styling primitives, `stopGeo`, `routing.server.ts`, `RouteLegend`, `builder_route_cache`

## Out of scope
- No changes to Tailor, Studio, or Multi-day maps.
- No new database tables (existing `builder_route_cache` handles it).
- No Mapbox migration — Leaflet + CartoDB tiles is already in the stack and free.
