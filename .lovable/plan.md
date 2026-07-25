## What's wrong (verified in code)

1. **Lunch shows on tours it shouldn't** — `src/lib/viatorValidation.ts::bookableIncluded()` reads `VIATOR_META.included` (legacy) instead of the Source-of-Truth. Legacy `included` arrays in `signatureToursViator.ts` still list "Lunch" on 7 tours (arrabida-boat, azeitao-cheese, sintra-cascais, troia-comporta, evora-alentejo, tomar-coimbra, fatima-nazare-obidos), so the "What's included" block on `/tours/:id` and `/tours/:id/tailor` prints Lunch. SoT itself is correct (lunch only on `arrabida-wine-allinclusive` and `roman-heritage-alentejo`).
2. **Studio blocked / stops inconsistent** — console error:
  ```
   [stopIntents] orphan stop: tiles-workshop :: "Azulejos de Azeitao"
   [stopIntents] untagged Signature stop: tiles-workshop :: "Tile Painting Workshop – Sesimbra"
  ```
   `signatureTours.ts` was renamed to "Tile Painting Workshop – Sesimbra" but `src/data/stopIntents.ts` under `tiles-workshop` still keys the old "Azulejos de Azeitao". Schema validation fails → Studio curation blocked, which is the "some maps not showing" symptom (Studio's living map + downstream reveal never mount).
3. **Cards keep repeating "Mercado do Livramento"** — `src/routes/experiences.tsx` (and `pt.experiences.tsx`) builds the 3 card bullets from the first non-generic itinerary chapter labels. Five tours legitimately open at Mercado do Livramento, so it dominates every card and there's no differentiator.

## Fix plan (frontend + data only, no schema changes)

### A. Route inclusions through SoT — kills the "lunch" bug site-wide

- `src/lib/viatorValidation.ts::bookableIncluded(tour, meta)`: return `getTourContent(tour.id).included` when SoT source is `"sot"`; keep legacy fallback for the (currently empty) miss case. Same helper is consumed by both `/tours/:id` and `/tours/:id/tailor`, so a single change fixes both surfaces. `validateTour()` is admin-only diagnostics and stays untouched.

### B. Realign `tiles-workshop` in `src/data/stopIntents.ts`

- Rename the `"Azulejos de Azeitao"` key inside the `"tiles-workshop"` block to `"Tile Painting Workshop – Sesimbra"` (intents stay `["craft","heritage","culture"]`). This clears both schema errors, unblocks Studio curation and restores its map.

### C. Give each Signature card a unique "moment" bullet

Replace the stop-label loop in `src/routes/experiences.tsx` (and mirror in `src/routes/pt.experiences.tsx`) with a curated per-tour trio. Source stays truthful — pulled from each tour's SoT `highlights` + one unmistakable stop — never invented copy. New file:

- `src/content/signature-card-moments.ts` — `{ [tourId]: [string, string, string] }`, e.g.
  - `tiles-workshop` → "Hand-paint your own azulejo tile", "Family cellar tastings in Azeitão", "Sesimbra castle by the sea"
  - `arrabida-boat` → "Boat into hidden Arrábida coves", "Turquoise-water beaches, no crowds", "Sesimbra fishing village at golden hour"
  - `arrabida-wine-allinclusive` → "Three family cellars, one long lunch", "Setúbal's Mercado do Livramento", "Coastal drive through Arrábida"
  - …one bespoke trio for each of the 12 tours
- `experiences.tsx`: prefer `SIGNATURE_CARD_MOMENTS[t.id]` when present; keep the existing SoT-stop fallback for any tour that isn't listed yet, so nothing regresses if a new tour is added.

### D. Map coverage sanity check

Run `src/__tests__/signature-map-coverage.test.ts` after B. If any tour now falls under 2 resolvable stops (very likely just `tiles-workshop` after the rename), add a matching entry to `src/data/stopGeo.ts` (`"Tile Painting Workshop – Sesimbra"` at Sesimbra coords) — reusing the existing Sesimbra coord already in the catalog, no invented geography.

## Guardrails

- No SoT edits (parity snapshots stay green).
- No new copy invented: card moments are drawn from each tour's SoT `highlights` or verified stop.
- No touch to pricing, checkout, or booking logic.

## Verification

- `bun run test src/__tests__/sot-viator-parity.test.ts src/__tests__/signature-map-coverage.test.ts` — must stay green.
- Reload `/tours/arrabida-boat`, `/tours/sintra-cascais`, `/tours/tomar-coimbra` on the preview → "What's included" no longer lists Lunch.
- Reload `/` and `/experiences` → each card shows a distinct 3-bullet moment; no duplicated "Mercado do Livramento" across cards.
- Console clean of `[stopIntents]` errors → Studio living map renders again
- Map on signatures render 
- Information on signatures, Taylor abd studio matches and are true to viator products information 
- Make sure studio is working properly 
- On tailor and studio price reduction on removing but also price addition when not included originally 