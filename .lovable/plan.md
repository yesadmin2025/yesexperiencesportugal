## Goals

1. Preview-only stop parity check vs Viator source of truth
2. Map fallback so tour maps always render in preview
3. Studio (V3) working end-to-end with all Signature stops available
4. Site-wide price correctness — Tailor add-ons and stop exclusions actually change price

---

## 1. Stop-by-stop consistency check (preview only)

New admin route `src/routes/admin.stop-parity.tsx` (also surfaced via a small dev overlay on `/tours/$tourId` when `?parity=1` or hostname is preview/lovable).

- For each Signature tour, read the canonical stops from `src/data/signatureToursSourceOfTruth.ts` and compare against:
  - the tour config stops used by Studio V3 / tour details (`signatureTours.ts` + `stopIntents.ts`)
  - the map stops rendered by `SignatureRouteMap` (`stopCoords.ts` / `stopGeo.ts`)
- Diff engine (reuse the pattern from `admin.sot-diff.tsx`) outputs per tour:
  - stops present in SoT but missing in YES
  - stops present in YES but not in SoT
  - name/order mismatches
- Table view with tour, field, SoT value, YES value, status chip. Zero writes; read-only.
- Gate behind `hostname.includes("lovable.app")` or explicit `?preview=1` — never render in production nav.

## 2. Map loading fallback

Problem: `SignatureRouteMap` uses Leaflet tiles + OSRM routing; when either times out the map area is blank.

- Wrap the Leaflet mount in `src/components/SignatureRouteMap.tsx` with:
  - a 4s tile-load timeout — if OSM tiles don't fire `load`, swap to a secondary tile provider (CARTO Voyager), then to a static SVG map (`PortugalSilhouette` + numbered pins from `stopCoords`) as a final fallback.
  - OSRM route: 5s timeout → fall back to straight polyline through stop coords; never leave the map without a drawn path.
- Add a small "Map running in offline preview mode" caption when the static fallback is used.
- Add error boundary so any Leaflet init error renders the SVG fallback instead of a blank div.

## 3. Studio V3 audit

- Verify `StudioV3.tsx` boots on preview, all beats reachable (Intro → Composition → MapAwakens → Refine → Reveal → Checkout).
- Run the existing `signature-map-coverage.test.ts` + `sot-viator-parity.test.ts` and fix any regressions surfaced.
- Ensure every stop from every Signature tour's SoT is:
  - registered in `stopIntents.ts` (Studio uses this for curation)
  - has coords in `stopCoords.ts` / `stopGeo.ts` (map renders)
  - appears in `RefineAccordion` for its parent tour
- Add a new test `studio-signature-stop-completeness.test.ts` that iterates every SoT tour × stop and asserts presence in Studio's resolved journey.
- Fix any missing entries surfaced by the test.

## 4. Pricing correctness — Tailor add-ons & exclusions

Audit and fix pricing math flow using `src/config/pricing.ts` as SSOT.

- `src/routes/tours.$tourId.tailor.tsx` + `SimpleTailorForm.tsx`:
  - Confirm each toggled add-on from `signatureAddOns.ts` adds its price to the running total per-adult/child tier.
  - Confirm each excluded stop applies the −5% per stop rule (per pricing SSOT memory).
  - Ensure the displayed price on the Tailor summary, checkout summary (`studio-v3/CheckoutSummary.tsx`), and Stripe line item all use the same computed number.
- Add unit tests in `src/__tests__/tailor-pricing.test.ts`:
  - base price → known value
  - +1 add-on → base + addon
  - −1 stop → base × 0.95
  - combined → correct compound
- Audit surfaces where price is shown: experience cards, tour detail hero, Tailor, Studio V3 running ribbon, Checkout, confirmation email. All must read from the same `computeTourPrice()` helper — introduce it in `src/config/pricing.ts` if not already the single call site.

---

## Technical notes

- No schema changes. No new secrets. No new deps (Leaflet + fallback tile URL already in bundle).
- All new admin/debug routes gated to preview host or query flag; excluded from `sitemap.xml` and `robots.txt` (already `Disallow: /admin/`).
- Tests: bunx vitest for unit; existing Playwright e2e untouched.

## Out of scope

- No Viator API integration — SoT stays the manual `signatureToursSourceOfTruth.ts`.
- No Studio V3 visual redesign — only correctness/coverage fixes.
- No new payment provider work.