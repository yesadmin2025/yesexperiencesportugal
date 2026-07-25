# Viator link SoT — site-wide propagation

## Current state (verified by reading the code)

We already have a canonical Viator URL registry:
`CANONICAL_VIATOR_URLS` in `src/data/signatureToursSourceOfTruth.ts`
(12 tours × 1 URL each) — plus per-tour `viatorUrl` inside each
`SIGNATURE_SOURCE_OF_TRUTH` entry.

But three parallel URL sources are still shipping to production:

1. `**VIATOR_META[id].viatorUrl**` in `src/data/signatureToursViator.ts`
  — 12 hand-maintained duplicates. Read by:
  - `src/components/TourReviews.tsx` — "Read all reviews on Viator &
  Tripadvisor →" and per-review `source_url`.
  - `src/components/LandingTourCredibility.tsx` — "Verified by Viator"
  link on tour detail.
2. `**signatureTours[i].bookingUrl**` in `src/data/signatureTours.ts` —
  12 duplicates, read by admin/importer tooling
   (`admin.import-tours.tsx`, `use-imported-tour-images.ts`).
3. **Hardcoded Viator URLs** — `src/data/platform-partners.ts` (one
  Arrábida wine URL used on the partners page).

There is no test that keeps these three in sync with
`CANONICAL_VIATOR_URLS`. Nothing catches drift today.

Two other surfaces still read raw legacy fields when SoT is available:

4. `**src/routes/experiences.tsx` + `src/routes/pt.experiences.tsx**` —
  card highlight bullets are built from `VIATOR_META[id].stops` (raw
   Viator stop dump) instead of the verified SoT itinerary chapter
   labels.
5. `**src/routes/tours.$tourId.tsx**` JSON-LD already uses SoT for
  itinerary but the tour page has no visible "official listing" back-
   link to the canonical Viator URL for trust/SEO.

## Plan

### 1. Single resolver for every Viator URL

Add one helper next to the registry:

```ts
// src/data/signatureToursSourceOfTruth.ts
export function canonicalViatorUrl(tourId: string): string | undefined {
  return SIGNATURE_SOURCE_OF_TRUTH[tourId]?.viatorUrl
      ?? CANONICAL_VIATOR_URLS[tourId];
}
```

SoT-first, canonical map fallback, `undefined` for unknown ids. This is
the ONLY function new code should use to get a Viator link.

### 2. Migrate the four current consumers

- `src/components/TourReviews.tsx` — replace both `meta.viatorUrl` reads
with `canonicalViatorUrl(tourId)`.
- `src/components/LandingTourCredibility.tsx` — same swap for the
"Verified by Viator" href.
- `src/data/platform-partners.ts` — the Arrábida wine entry pulls its
URL from `canonicalViatorUrl("arrabida-wine-allinclusive")` at module
load instead of hardcoding the string.
- `src/lib/viatorSot.functions.ts` — already falls back to the canonical
map; switch to the new helper for consistency.

`getViatorMeta()` continues to exist for reviews / gallery / price
tiers — we do NOT delete `VIATOR_META.viatorUrl` yet (importer &
`bookingUrl` still need a resolution step). The field becomes
informational.

### 3. Card highlights on /experiences and /pt/experiences

When a tour has an SoT entry, prefer its itinerary chapter labels
(non-optional, first 3) for the card bullets instead of the raw
`meta.stops` list. Falls back to `getTourContent(id).highlights` when no
SoT — behavior unchanged for un-populated tours.

### 4. Optional "official Viator listing" backlink on tour detail





### 5. Parity guardrail — new Vitest suite

`src/__tests__/viator-url-parity.test.ts` fails CI if any of the
following diverges from `CANONICAL_VIATOR_URLS[id]`:

- `SIGNATURE_SOURCE_OF_TRUTH[id].viatorUrl`
- `VIATOR_META[id].viatorUrl`
- `signatureTours.find(t => t.id === id).bookingUrl`

Plus a coverage check: every id in `signatureTours` has a
`CANONICAL_VIATOR_URLS` entry, and every id in `CANONICAL_VIATOR_URLS`
has both a `signatureTours` row and a `VIATOR_META` row.

## Out of scope

- Removing `VIATOR_META.viatorUrl` or `signatureTours.bookingUrl`
fields. Those stay until the importer is migrated in a later pass;
parity test guarantees they can't drift in the meantime.
- Any Viator SDK / affiliate-tag rewriting — pure href changes only.
- &nbsp;

## Files touched

- `src/data/signatureToursSourceOfTruth.ts` — add `canonicalViatorUrl()`.
- `src/components/TourReviews.tsx`
- `src/components/LandingTourCredibility.tsx`
- `src/data/platform-partners.ts`
- `src/lib/viatorSot.functions.ts`
- `src/routes/experiences.tsx`
- `src/routes/pt.experiences.tsx`
- `src/__tests__/viator-url-parity.test.ts` (new)

## Validation

- `bun run vitest run src/__tests__/viator-url-parity.test.ts`
- Existing SoT parity suite (`sot-viator-parity.test.ts`) stays green.
- Spot-check `/tours/arrabida-boat`, `/experiences`, `/partners`: every
"Viator" link resolves to the same URL as `CANONICAL_VIATOR_URLS`.