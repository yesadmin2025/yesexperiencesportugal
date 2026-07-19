## Goal
Map section on Signature tour pages should only convey **geography** (real locations, real distances, real drive times). Remove the invented per-stop notes ("arrive 12:30–14:00 · lunch on the seafront", "transit: private transfer only", etc.) — none of that is on the Viator source pages, so it violates the no-invention rule.

## Changes

### 1. Strip fabricated notes from the map UI
`src/components/SignatureRouteMap.tsx`
- Remove the `<ol>` per-stop notes block (arrival / transit / duration cards).
- Keep: real Leaflet map, numbered gold pins, driving polyline, region chip, `RouteLegend` (real km + minutes per leg from OSRM), OSM/CARTO attribution.
- Replace the closing paragraph with a single short line — just names the ordered stops so the pins have labels below the map, no operational claims:
  > "Stops on this route: 1. Arrábida viewpoint · 2. Portinho · 3. …"
- Drop imports/props for `bestArrival`, `transit`, `duration`, `Sunrise`, `Clock`, `RouteIcon`, `lookupStopNote`.

### 2. Retire the curated notes file
`src/data/stopNotes.ts` → delete.
`src/lib/signature-route.functions.ts` → remove `lookupStopNote` usage and the `bestArrival`/`transit`/`duration` fields from `SignatureRouteStop`. Server fn now returns just `{ label, lat, lng }` per stop plus the OSRM legs.

### 3. Signature stops = Viator source of truth
No content edits in this pass unless a mismatch is found. As a follow-up guard, add a short note at the top of `src/data/signatureTours.ts` reminding future edits: *stops[] must mirror the matching Viator itinerary — never add stops, meals, or descriptors that aren't on the Viator page.* If you want, I can also spot-audit each tour's `stops[]` against its Viator URL in a follow-up turn and flag any drift for your approval before editing copy.

## Result
Map page shows: title → real map with numbered pins and drawn route → leg-by-leg distance + drive time → plain numbered list of stop names → attribution. No invented arrival windows, no invented transit claims, no "lunch on the seafront". Signature itineraries stay bound to Viator.
