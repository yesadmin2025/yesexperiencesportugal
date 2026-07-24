## Goal
Align every Signature tour with its Viator page (source of truth) and produce ONE canonical file that Studio reads for real timings/itineraries — so descriptions, highlights, inclusions, stops, durations and per-chapter timings all match what Viator actually sells.

## Scope: 12 Viator URLs → 12 Signature tours

Current mapping is mostly correct, but two internal IDs point to the WRONG Viator page — needs your confirmation before rewriting content:

| Internal id | Currently points to | Likely correct |
|---|---|---|
| `tiles-workshop` | P4 (Golf & Wine) | ? — the id says "tiles workshop" but P4 is a golf tour |
| `evora-alentejo` | P6 (Setúbal Wine Tour) | ? — id says "evora" but P6 is Setúbal, not Évora |

Everything else lines up: P1→wild-beaches, P3→arrabida-wine, P5→fatima-nazaré, P8→tomar-coimbra, P9→azeitao-cheese, P10→sintra-cascais, P12→arrabida-boat, P16→southwest-coast, P17→roman-heritage, P18→troia-comporta.

## New canonical file — `src/data/signatureToursSourceOfTruth.ts`

Single hand-verified file, per tour, keyed by internal id, containing exactly what Viator publishes:

```text
{
  viatorUrl, productCode: "P3",
  title, subtitle, durationText: "8–9h", durationMinutes: 510,
  pickupWindow: "08:00–09:00", pickupZone,
  groupType: "Private", maxGroup: 8,
  overview: string (Viator's own),
  highlights: string[]   // exact Viator bullet list
  included: string[]     // exact
  notIncluded: string[]  // exact
  variesByOption: string[]
  itinerary: [
    { order, label, description, durationMinutes, travelToNextMinutes, optional }
    // ~4–8 chapters, real minutes — sums to durationMinutes
  ]
  cancellation, languages, meetingPoint
}
```

Rules:
- Only content that appears on the linked Viator page. No invented stops, no invented timings.
- When Viator says "depending on option / optional / subject to availability" → `optional: true` and listed in `variesByOption`.
- `durationMinutes` and per-chapter minutes are derived from the Viator itinerary block (e.g. "8–9 hours" → 510; per-stop times taken verbatim when shown, otherwise left `null` — never guessed).

## Wiring (no behavior change beyond truth)

1. **Signature detail pages** — replace `VIATOR_META[...].overview / included / editorialChapters` reads with the new SoT file. `signatureToursViator.ts` stays for reviews/gallery/pricing (those are already truth-passed).
2. **Signature list copy** — `signatureTours.ts` `description`, `highlights`, `included`, `durationHours` reset to match SoT for the 12 tours.
3. **Studio V2** — `src/lib/studio-v2/itinerary.functions.ts` + `content.ts` read `itinerary[]` + `durationMinutes` + `travelToNextMinutes` from SoT so the Living Itinerary shows real timings instead of computed guesses. AI voice stays voice-only (no invented stops — matches `studio-v3-no-invented-stops` memory).
4. **Tailor** — inclusion list already routes through `resolveClientIncludedItems`; it will pick up SoT via the same fallback chain.
5. **Validation** — extend `src/lib/viatorValidation.ts` to also diff highlights + itinerary chapter labels against SoT and surface mismatches at `/admin/viator-validation`.

## Extraction workflow (one call per URL, ultra-low credit)

Reuse the existing `extractViatorTour` server function in `src/lib/viatorTour.server.ts` (already tool-calls Gemini Flash on the fetched HTML). Add a small admin action `/admin/sot-refresh` that:
- takes a tour id + Viator URL,
- runs the extractor,
- writes the result into `signatureToursSourceOfTruth.ts` (via generated patch you review before commit — no live DB write).

You approve each of the 12 diffs one by one; nothing ships until you confirm.

## Questions before I build

1. **`tiles-workshop` and `evora-alentejo` mappings** — do I (a) rename the ids to match P4/P6, (b) fix the `viatorUrl` to point at the real Azulejos/Évora products, or (c) drop them? Your 12 URLs don't include an azulejos or Évora page.
2. **Timings** — when Viator shows a range ("8–9h") should chapter minutes sum to the LOW end (480) or the HIGH end (540)? Studio needs one number.
3. Should the SoT file be the ONLY place inclusions/highlights/overview live (i.e. delete those fields from `signatureTours.ts` and `signatureToursViator.ts`), or keep both and mark SoT as authoritative? Cleaner is single-source; safer is dual with a lint that fails on divergence.

## Technical notes
- No schema/RLS changes. Pure content + one new TS file + read-path swap.
- Existing tests: `viatorValidation`, `tailor-blueprints-locks`, `signature-map-and-images` will re-run against SoT.
- Credits: ~12 Gemini Flash calls (one per URL) for the initial extraction, then zero at runtime — SoT is static.
