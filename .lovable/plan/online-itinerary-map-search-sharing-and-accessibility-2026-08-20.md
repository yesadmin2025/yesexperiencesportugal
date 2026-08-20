# Online itinerary: map, search, sharing and accessibility

Five upgrades to the guest itinerary page at `/itinerary?session_id=…`, all driven by the same frozen booking snapshot that produces the PDF and the confirmation emails. No new content is invented: every stop, note and label already exists in the snapshot.

## 1. Map view of the day

A geographic map above the stop list, showing the stops in order.

- Numbered gold pins matching the numbers in the written list, so pin 3 is stop 3.
- Real driving route drawn between stops when the booking is a Signature day (the same routing already used on Signature pages, including real distance and drive time per leg).
- For designed/tailored days whose stops are not part of a fixed Signature route, pins are placed from the existing verified stop coordinates and connected with a soft dashed line — no invented roads, no invented timings.
- Any stop we cannot place on the map stays in the written list and is quietly noted as "shown in the list only" — it is never dropped or guessed.
- No clock times anywhere. Directly under the map: a short pacing line plus the existing "wineries and pacing may vary — nothing is skipped" note, so the flexibility is visible with the route, not only at the bottom of the page.
- The map is loaded only after the page renders, with a branded placeholder in its exact final size, so nothing jumps. It is hidden when printing.

## 2. Accessibility pass

- Heading order: one page title, then a real section heading per block, then a heading per stop. Section labels move from 11px to 12px with softened letter-spacing so they stay readable on a phone.
- Visible focus rings (gold) on print, download, copy-link, search and jump controls; every one at least 44×44.
- Loading and error states announced to screen readers.
- Map given a plain-language description listing the stops in order, so it carries meaning without sight.
- The stop-number jump rail exposes which stop is currently in view.

## 3. Search and quick jump

- A compact search field at the top of the stop list filters stops by name as you type, matching accents loosely (typing "troia" finds "Tróia").
- A horizontal rail of stop numbers below it jumps straight to any stop, scrolls it into view and moves keyboard focus there.
- Clear empty state ("No stop matches that name") and a one-tap reset.
- Searching never hides the flexibility note or the rest of the page — it only narrows the list.

## 4. Shareable deep link

- The page already opens with just the booking reference in the URL, no email needed. Adding a stop anchor makes a link land directly on that stop (for example `…/itinerary?session_id=…#stop-3`).
- A "Copy link" action copies the current view, including the selected stop, with a short confirmation.
- Opening a link with a stop anchor scrolls to that stop once the itinerary has loaded.
- The page stays excluded from search engines, as today.

## 5. One-tap PDF export

- The existing PDF download is promoted into a clear action row (Print · Download PDF · Copy link) that stays reachable on mobile without scrolling to the very bottom.
- It reuses the same endpoint that generates the attached PDF, so the downloaded file is identical to the emailed one.
- The action row is hidden in print output.

---

## Technical notes

- `src/routes/api/public/booking-itinerary-data.ts`: also return `tourId` from the snapshot (non-PII) so the map can request the real Signature route. Response stays `no-store` + `noindex`.
- New `src/components/itinerary/ItineraryRouteMap.tsx`: client-only, lazy-loaded behind `ClientOnly`, Leaflet imported dynamically. Reuses `MAP_FRAME_CLASS` / `MAP_CANVAS_CLASS` from `SignatureRouteMapShell`, gold pin markup from `SignatureRouteMap`, and `lookupStop` from `src/data/stopGeo` for label→coordinate resolution. Real legs come from the existing `getSignatureTourRoute` server fn when `tourId` resolves and label overlap is high; otherwise dashed connectors only, with no distance/time claims.
- `src/routes/itinerary.tsx`: add search + jump state, `id="stop-N"` anchors, hash scroll-after-load effect, copy-link handler (`navigator.clipboard` with a select-and-copy fallback), and the action row. Search matching extracted to a pure helper for unit testing.
- `src/styles.css`: extend the existing scoped `@media print` block to hide the map, search, jump rail and action row; keep the current keep-with-next stop rules.
- Tests: unit tests for the accent-insensitive stop filter and anchor id generation; an e2e mobile spec covering search → jump → focus, deep-link landing, PDF download intent, and an axe pass on the loaded itinerary.
