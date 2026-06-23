# Studio V3 — Logic, Coherence & Premium Polish

Scope: tighten the Studio so every beat makes sense (no contradictory add-ons, no mismatched inclusions), the creation feels like something is being **built** in front of the user, and the mobile stops screen stops feeling cluttered.

No invented stops, no invented inclusions, no new prices. Pulling only from the resolved Signature tour (per Studio V3 no-invented-stops rule).

---

## 1. Interests counter chip — premium refinement

File: `src/components/studio-v3/StudioV3.tsx` (interests phase)

- Cap selection at **4** (sweet spot for a 1-day rhythm; matches dwell-budget logic).
- Replace plain "n selected" with a token-driven chip:
  - Eyebrow style: `text-[11px] tracking-[0.22em] uppercase`, gold rule, charcoal label.
  - State machine:
    - `0` → "Choose up to 4 moments"
    - `1–3` → "{n} of 4 · room for more"
    - `4` → "4 of 4 · perfectly paced" + gold check
  - Disable further taps at 4 (visual: dim + cursor-not-allowed, not a toast).
- Helper microcopy under the grid: *"Four moments make a day that breathes. Pick what calls you."* (Inter, charcoal/70, single line on ≥360px).

---

## 2. Coherent add-ons + inclusions (the core logic fix)

Today: a Signature skeleton ships with its **inclusions**, but Tailored/Studio add-ons are filtered only by region + time budget — not by what the skeleton already includes. So a "lunch included" tour can offer a picnic add-on. This is the bug.

Fix in `src/data/signatureAddOns.ts` + `src/lib/studio/addon-selection.ts`:

1. Add a `conflictsWith: string[]` field on each add-on (tags: `lunch`, `picnic`, `wine-tasting`, `tasting-paired`, `boat`, `sunset-drink`, etc.).
2. Tag each Signature tour's existing inclusions with the same vocabulary in `signatureToursViator.ts` (`inclusionTags: string[]`).
3. `selectSignatureAddOnsWithBudget(...)` now also filters out any add-on whose `conflictsWith` intersects the tour's `inclusionTags`.
4. Reveal grouping: split into **"Elevate what's included"** (upgrades to existing inclusions, e.g. premium tasting flight when basic tasting is included) vs **"Add a new chapter"** (genuinely new moments). No more contradictory picnic-next-to-lunch.

Inclusions on `SignaturePriceCard`:

- Source `inclusions` directly from the resolved Signature tour (already true in code) — audit and remove any hardcoded fallback strings that contradict.
- Show the **itinerary spine** (stop names, in order, as a 3–5 line "Your day includes" list) above the inclusions, so the price reads against the real day, not a skeleton.
- Surface dwell summary inline: "≈ {hours}h · {n} stops".

---

## 3. Beats that match intent (imagery + video)

File: `src/content/studio-scene-clips.ts` + `CreationBeat.tsx`

- Audit current mapping. Replace mismatched clips with intent-aligned ones using existing assets only — no new asset invention, no stock.
- Mapping rules (deterministic, not random):
  - `feeling` → ambient region atmosphere (no people pose).
  - `destination` → landscape signature of that region (Sintra mist, Douro terraces, Alentejo plain).
  - `companions` → human-scale candid matching party type.
  - `interests` → per-interest clip (wine = barrel/pour, gastronomy = table, nature = trail, heritage = stone).
  - `pace` → motion register only (slow pan vs energetic).
- If no matching clip exists, **fall back to a still editorial image** in the same atmospheric family — never play a contradictory video.
- Add `prefers-reduced-motion` → always still.

---

## 4. Map that builds itself (the "creation" moment)

File: `src/components/studio-v3/StudioV3SignatureMap.tsx` + `LivingJourneyPanel.tsx`

Right now the map is mostly static between choices. Make it the protagonist of the build:

- **Progressive reveal:** stops appear one-by-one as the user advances phases (region pin first, then anchor stop, then interest-matched stops, then drive lines).
- **Drive line draws:** when a new stop joins, the connecting polyline animates from prev → new over 600ms (mapbox `setData` with a tweened coordinate slice). Capped, reduced-motion safe.
- **Camera ease:** `flyTo` with `duration: 900, curve: 1.4` to frame the growing route — no jump cuts.
- **Subtle pulse** on the newest pin for ~1.2s, then settles.
- This replaces the awkward "image/video that makes no sense" beat on the stops phase — the map *is* the visual.

---

## 5. Decluttered mobile stops screen (pre-reveal)

File: `src/components/studio-v3/StudioV3.tsx` (stops phase) + `LivingJourneyPanel.tsx`

Symptom: header + chips + timeline + CTA all stack on top of the map.

- Collapse the top into a single thin bar: phase title (Montserrat 14, charcoal) + tiny progress dots. Remove the secondary subtitle in this phase only.
- Move the timeline into a **bottom sheet** (peek 88px showing "≈ {h}h · {n} stops · €{from}", drag-up for full list). Map gets full canvas.
- Floating CTA: single primary pill "See your day" bottom-right, 48px tall, gold sheen on hover (existing `.home-energy` token, scoped here).
- Hide the dwell/over-budget note inside the bottom sheet header; only surface as a soft gold dot on the bar when over budget.

---

## 6. Verification

- TS check.
- Mobile Playwright walk (393×852): interests cap, addon-vs-inclusion conflict assertion, map reveal screenshot at each phase, stops phase declutter screenshot.
- Telemetry: log `addons.filtered_by_inclusion` count + `map.stops_revealed` sequence for future audits.

---

## Out of scope (ask before doing)

- Any new tour, stop, partner, price, or inclusion text.
- Stripe changes.
- Builder (non-Signature) flow — this pass is Studio V3 over Signature skeletons only; Builder gets its own pass next.

Ship in this order so each step is independently verifiable: **2 → 5 → 4 → 3 → 1 → 6**.
