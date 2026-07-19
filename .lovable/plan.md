## Goal
Enrich the Signature tour map with per-stop travel notes, keep the numbered gold pins, and strip Leaflet's branding for a cleaner editorial look.

## Changes

### 1. Per-stop travel notes data
- Extend `src/data/stopGeo.ts` (or add a sibling `src/data/stopNotes.ts` keyed by the same normalized label) with an optional record per stop:
  - `bestArrival` — e.g. "Best 9:30–10:30 · softer light, fewer cars"
  - `transit` — e.g. "Private transfer only · no reliable bus on weekends"
  - `duration` — e.g. "45–60 min on site"
- Curate notes only for stops that already appear in Signature tours (Arrábida, Portinho, Sesimbra, Azeitão, Cristo Rei, Mercado do Livramento, Cabo Espichel, Vicentine Coast stops, etc.). No invention — leave the field empty when unknown; the UI hides missing fields.

### 2. Server payload
- `src/lib/signature-route.functions.ts` — attach the notes on each resolved stop returned by `getSignatureTourRoute` (`SignatureRouteStop` gains optional `bestArrival` / `transit` / `duration`).

### 3. Map + notes UI (`src/components/SignatureRouteMap.tsx`)
- Keep the existing numbered gold divIcons (they already show `1..n`); confirm pin+tooltip render for every stop.
- Remove Leaflet branding:
  - `attributionControl: false` on `L.map(...)` (drops the "Leaflet | © CARTO" strip).
  - Keep zoom control; hide the tiny Leaflet flag on the zoom control via one CSS rule (`.leaflet-control-attribution{display:none}` scoped inside the map wrapper).
- Replace the plain ordered `<ol>` under the map with an editorial "Stop notes" list:
  - Number chip (matches pin), stop label, then a compact 3-row micro-grid rendering only the fields that exist:
    - `Arrive` · bestArrival
    - `Getting there` · transit
    - `Time on site` · duration
  - Uses existing tokens (`--charcoal-soft`, `--gold`, Inter uppercase eyebrows at 10–11px, tracking 0.22em). No new colors, no motion beyond the existing `.reveal`.
- Screen-reader: each list item stays a single `<li>` with an accessible label combining stop name + notes.

### 4. Attribution compliance
Leaflet's LGPL and CARTO's terms require attribution somewhere visible on the page. To keep the map itself clean, add a single 10px `--charcoal-soft` line under the notes list: "Map data © OpenStreetMap · Tiles © CARTO" (links open in a new tab). This satisfies attribution without cluttering the map surface.

## Files touched
- `src/data/stopGeo.ts` (or new `src/data/stopNotes.ts`)
- `src/lib/signature-route.functions.ts`
- `src/components/SignatureRouteMap.tsx`
- `src/styles.css` — one scoped rule to hide the in-map attribution flag

## Out of scope
- No changes to the OSRM routing, `RouteLegend`, or other maps (Builder / PremiumMap keep their current attribution).
- No new stops or itinerary claims — notes are curated per real operational knowledge; unknown fields stay hidden.
