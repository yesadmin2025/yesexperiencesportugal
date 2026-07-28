## Goal

Every Signature (all 12, not only the wine tours) shows viators Source-of-Truth (SoT) content on its card and on its page, renders a correct map, and displays a price that provably matches what Stripe charges. No invented content, no publish.

## What I verified first

- All 12 Signatures now have a viator `SIGNATURE_SOURCE_OF_TRUTH` entry, so the legacy fallbacks are no longer needed for content.
- **Price parity is already correct**: for all 12 tours, the card's `priceFrom` equals the 8-guest tier in `tour_price_tiers` (the table the checkout function resolves prices from server-side). Example: Arrábida Wine 135, Tróia 157, Roman 254. So "From €X per person" = the real lowest per-person price Stripe would charge. I will add a test that locks this instead of changing numbers.
- **Cards read viator SoT**: except prices 
- **Maps use viator SoT labels have coordinate gaps**. 
  - `evora-alentejo` — 8 of 10 unresolved (all Évora wineries, Chapel of Bones)
  - `wild-beaches-picnic` — 7 of 15 (Meco, Bicas, Galapinhos, Lagoa de Albufeira, Lapa de Santa Margarida…)
  - `sintra-cascais` — 4 of 8 (Pena Palace, Quinta da Regaleira, Azenhas do Mar, Adega de Colares)
  - plus single misses on Arrábida Wine, Boat, Tiles, Azeitão, Tróia, Tomar, Roman. 

## 1. Geo coverage for every viator SoT stop

`src/data/stopGeo.ts`: add real coordinates for each unresolved SoT label above (public, verifiable place coordinates only — no invented stops; aliases where the SoT label is a variant, e.g. "25 de Abril Bridge" → existing Ponte 25 de Abril entry, "Bacalhôa" → Quinta da Bacalhôa).

New test `src/__tests__/sot-geo-coverage.test.ts`: every non-pass-by SoT itinerary label for all 12 tours resolves through `lookupStop`. This makes future SoT edits fail loudly instead of silently degrading a map.

## 2. Maps read the viator Source of Truth

`src/components/SignatureRouteMap.tsx`: build the stop list from `sotItinerary(tour.id)` (excluding pass-by/optional-generic chapters) and fall back to `tour.stops` only when the tour has no SoT entry. Keep the existing OSRM route fetch, tile fallback and `SignatureRouteMapFallback` behaviour untouched. The server route function keyed on `tourId` is aligned to the same list so drawn legs match the pins.

Extend `e2e/signature-map-and-images.spec.ts` to walk all 12 tour pages and assert the map (or its fallback) renders with the expected pin count.

## 3. Cards read the viator Source of Truth

`src/routes/experiences.tsx` (and the Portuguese variant + the homepage Signature rows that use the same data):

- Duration comes from `sotDurationMinutes(t.id)`, formatted to the existing "8–9h"-style label, with `t.durationHours` only as fallback.
- Highlights keep the curated `SIGNATURE_CARD_MOMENTS` trio (already unique per tour, already SoT-derived) — no change to that file unless a SoT edit made an entry stale; I'll re-check all 12 against the SoT and correct only genuine mismatches.
- Add a small SoT-derived inclusion cue where it is a real differentiator (e.g. "Lunch included" only when SoT `included` says so), so cards stop implying lunch on tours that exclude it.
- Rating/review badge and price line stay as they are.

## 4. Signature page content parity

`src/routes/tours.$tourId.tsx`: remove the remaining legacy fallbacks for overview, highlights, inclusions/exclusions and itinerary where SoT exists, so page and card cannot disagree. Duration on the page comes from the same `sotDurationMinutes` helper as the card.

## 5. Price parity lock (no price changes)

New `src/__tests__/signature-price-parity.test.ts`: for all 12 tours, `priceFrom` equals the 8-guest tier value used by `create-signature-checkout`, and every tour that can be booked with minors has a tier row (the checkout function 409s otherwise). Tailor lunch-removal / supplement math is already covered by the existing tests and is not touched.

## Out of scope

- No `builder_stops` migration; Studio untouched.
- `CANONICAL_VIATOR_URLS` mismatch (`evora-alentejo`, `tiles-workshop`) reported only, not modified.
- No pricing value changes, no publish.

## Deliverables

Files changed, the geo entries added, vitest + Playwright output, and mobile screenshots of `/experiences` plus all  repaired maps 