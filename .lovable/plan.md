## Studio V3 — Intent fidelity, preview clarity & map/pricing polish

Fixes six real problems you hit while testing. Grouped by symptom, each with a concrete change.

### 1. Intent matching is wrong (wine + nature → Southwest Coast, which has no wine)

**Why it happens** — In `src/components/studio-v3/curation.ts` (`pickPrimaryTour`), wine is only strongly boosted when `feeling === "wine-food"` OR wine is the *top* interest. Picking "wine" + "nature" without a wine feeling leaves the nature pool (which includes Southwest Vicentine Coast) dominant, and there is no *penalty* for choosing a tour that has zero wine content when the guest asked for wine.

**Fix**
- Add a **hard coherence guard**: if `interests` includes `wine` OR `gastronomy`, deprioritise tours whose title/theme/blurb/stops contain no wine keywords (–4 score) unless the user explicitly picked a non-wine destination intent (e.g. `southwest-coast`).
- Symmetrically, if `interests` includes `nature` or `coastal`, keep the wine tour eligible but require wine-anchored tours to also carry at least one nature/coastal stop before winning.
- Raise `wineBoost` from 1.5 → 2.5 when wine is any listed interest (not just top), and keep the boost only when the tour actually contains wine content (guard already in place).
- Add a unit test in `src/components/studio-v3/__tests__/` covering the exact case: `feeling=discover`, `interests=[wine, nature]` → expected tour must contain wine content (e.g. Arrábida Wine, Alentejo Evora Wine, Roman Talha), never Southwest Coast.

### 2. "Hold this journey" reads like checkout

Rename the CTA in `MapAwakens.tsx` (line 599) — replace "Hold this journey" with **"Preview this journey"** and lighten the visual weight (ghost button, not primary gold). Reserve the primary gold/filled state for the actual `Yes — reserve · €…` CTA inside `SignaturePriceCard`. Same rename for any aria-label and any tracking event key (keep old event as alias for 1 release).

### 3. Mobile — "Moments" card sitting under the map before preview

- On mobile (`< md`), the Signature card in `MapAwakens.tsx` currently renders below the map during the reveal walkthrough. That's the intended stack, but the eyebrow/label on the card should read **"Preview"** (not "Your Signature") until the guest hits "Preview this journey". After preview it flips to **"Your Signature"** and reveals inclusions + price.
- Add a subtle "↓ Preview below" affordance under the map while the sequence completes, so the traveller understands the card is a *preview*, not the checkout.
- Reuse the existing mobile stacking invariant covered by `e2e/studio-v3-mobile-map-above-moments-card.spec.ts`; extend it to assert the "Preview" label pre-CTA and "Your Signature" post-CTA.

### 4. Map lacks distances, place names and regions

`MapAwakens.tsx` currently draws the route but doesn't render leg distances or stop labels clearly.
- Show **stop name pills** on each marker (place, town), always visible on mobile (not hover-only).
- Render **leg distance in km + drive-time minutes** on each polyline segment (reuse `use-route-leg-minutes.ts` + `stopCoords.ts` haversine).
- Add a **region badge** at the top of the map ("Arrábida · Setúbal", "Alentejo · Évora", etc.) sourced from the resolved tour's region.
- Reuse `RouteLegend.tsx` for the legend below the map; make sure it lists every stop with an index, name, and micro-caption.

### 5. Intent → resolved journey mismatch (broader than #1)

- Surface a **"Why this journey" chip row** at the top of the preview card: 2–3 chips echoing the guest's actual inputs ("Wine · Nature · Couple · Half-day from Lisbon"). Sourced from `deriveIntentProfile` — no invention.
- If the resolver falls back (candidate pool was empty), log a debug marker in `StudioV3DebugOverlay` and show an inline "Not quite right? Reshape" nudge instead of silently serving a mismatch.
- Add regression tests for the top 6 interest+feeling pairs (wine+nature, culture+heritage, romance+coastal, adventure+wine, hidden+gastronomy, slow-luxury+wine) asserting the resolved tour is thematically coherent.

### 6. Checkout / price reveal is messy (prices & inclusions)

In `SignaturePriceCard.tsx`:
- **Two clear states**: Preview (collapsed) shows only tour title, region, duration, from-price per person, and 3 headline inclusions. Reserve (expanded, after "Preview this journey") shows full inclusions list, per-pax breakdown, add-ons, and the reserve CTA.
- **Price line locked format**: `€X /pp · party of N · €Y total` — never mix formats mid-card. Currently the ghost + primary CTAs show different formats.
- **Inclusions grouped** into 3 buckets with icons: *Included* (transport, guide, tastings), *Optional add-ons* (with clear €), *Not included* (tips, personal spend). Kill the current single flat list.
- **Sticky reserve bar** on mobile with the party total, so the guest never loses the price when scrolling inclusions.
- Extend `e2e/studio-v3-add-ons-total.spec.ts` + `studio-v3-cta-labels-live.spec.ts` to assert the two-state reveal and the locked price format.

### Files touched (expected)
- `src/components/studio-v3/curation.ts` — coherence guards + tests
- `src/components/studio-v3/MapAwakens.tsx` — CTA rename, region badge, leg labels, mobile preview affordance
- `src/components/studio-v3/SignaturePriceCard.tsx` — two-state reveal, inclusions grouping, sticky mobile bar, locked price format
- `src/components/studio-v3/RouteLegend.tsx` — always-visible stop pills + distances
- `src/components/studio-v3/__tests__/` — new intent-coherence tests
- `e2e/studio-v3-*.spec.ts` — extend mobile stack, CTA labels, add-ons totals specs

### Out of scope (flag but don't touch this pass)
- Bokun/Stripe checkout wiring — TEST MODE stays, we only clean the reveal card.
- Any new tours, stops or prices — no invention (guardrail).
- Desktop/tablet layout beyond the mobile-first fixes above.

Approve and I'll implement in this order: (1) intent coherence + tests, (2) CTA rename + mobile preview state, (3) map labels/legend, (4) SignaturePriceCard two-state reveal.
