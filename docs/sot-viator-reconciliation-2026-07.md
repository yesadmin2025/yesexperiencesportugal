# Viator ↔ SoT Reconciliation — 2026-07-25

## Scope
All 12 Signature tours in `src/data/signatureToursSourceOfTruth.ts` (SoT), verified against their live Viator product URLs.

## SoT status
Every entry carries `verifiedAt: "2026-07-25"` — the SoT payloads (overview, highlights, included, notIncluded, variesByOption, itinerary with per-chapter minutes, cancellation, languages, meetingPoint, pickupZone) were refreshed via `/admin/sot-refresh` (Firecrawl → Gemini extractor with strict "no invention" system prompt) and hand-checked against Viator.

| # | tourId | Viator product | Notes |
|---|---|---|---|
| 1 | arrabida-boat | P12 | 7 chapters incl. Lapa de Santa Margarida, Cabo Espichel |
| 2 | arrabida-wine-allinclusive | P3 | 12 chapters incl. optional Cristo Rei / Sesimbra Castle |
| 3 | azeitao-cheese | P9 | 5 chapters, hands-on Quinta Velha workshop |
| 4 | evora-alentejo | P6 | 10 chapters, 5 optional winery choices |
| 5 | fatima-nazare-obidos | P5 | 6 chapters |
| 6 | roman-heritage-alentejo | P17 | 6 chapters, São Cucufate + Talha center |
| 7 | sintra-cascais | P10 | 8 chapters, palace choice logic |
| 8 | southwest-vicentine-coast | P16 | 7 chapters, Odeceixe highlight |
| 9 | tiles-workshop | P4 (Golf & Wine SKU, id retained for SEO) | 9 chapters, painting workshop + wineries |
| 10 | tomar-coimbra | P8 | 6 chapters |
| 11 | troia-comporta | P18 | 9 chapters, ferry crossing + Herdade da Comporta |
| 12 | wild-beaches-picnic | P1 | 12 beach/cove chapters |

## Consumer coverage (all `getTourContent(tourId)`)

Positive test (`src/__tests__/tour-content-getter-usage.test.ts`) enforces that these files both import and call `getTourContent`:

- `src/routes/tours.$tourId.tsx` (Signature detail — highlights, inclusions, itinerary)
- `src/routes/index.tsx` (homepage highlight chips)
- `src/routes/experiences.tsx` + `src/routes/pt.experiences.tsx` (Signature grid highlights)
- `src/components/SimpleBookingForm.tsx` (booking summary inclusions)
- `src/components/studio-v3/StudioV3.tsx` (Studio flow + skeleton)
- `src/components/studio-v3/FinalRevealStory.tsx` (final reveal)
- `src/components/studio-v3/signatureStorySnapshot.ts` (Studio snapshot)
- `src/lib/checkout/inclusions.ts` (checkout / confirmation surface)

Negative test (`src/__tests__/tour-content-direct-reads.test.ts`) blocks any file outside the allowlist from destructuring, dotting, bracketing, or optional-chaining `overview / highlights / included / itinerary` on a tour-shaped object.

Schema lock (`src/__tests__/signature-tour-schema-lock.test.ts`) freezes the top-level `SignatureTour` key list and rejects new content-shaped keys, forcing new fields through SoT + `getTourContent`.

## Fix applied this pass

- `src/routes/tours.$tourId.tsx` — JSON-LD `tourProductLd` now sources itinerary stops from `getTourContent(tourId).itinerary` (verified SoT chapters, non-optional only), falling back to legacy `tour.stops` only when a tour has no SoT entry. Structured data emitted to Google now mirrors the same Viator itinerary shown on-page.

## Validation

```
bunx vitest run
  src/__tests__/tour-content-direct-reads.test.ts
  src/__tests__/tour-content-getter-usage.test.ts
  src/__tests__/signature-tour-schema-lock.test.ts
→ 3 files · 11 tests · all pass
```

## Follow-ups (out of scope)

- Re-run SoT extractor monthly to catch Viator edits (Viator wording drifts occasionally).
- Translate any English-only SoT deltas into PT overlay in `src/lib/tour-i18n.ts` (currently the overlay merges on top of SoT and stays exempt from the direct-read guard).
