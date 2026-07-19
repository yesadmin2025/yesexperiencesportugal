# Booking flow & itinerary truth pass

Single-branch plan that ships the earlier three asks (availability, funnel analytics, contrast) plus the four new issues surfaced in the screenshots. All fixes stay inside guardrails: no invented stops, no repointed brand tokens, source-of-truth honoured.

---

## 1 · Time-slot availability & validation (client-side, per-tour)

**New** `src/data/tourAvailability.ts` — per-tour: `operatingDays`, `pickupWindows`, `minLeadHours` (default 24), `sameDayCutoffHourLocal?`, `blackoutDates?` (Dec 25 / Jan 1). Default fallback used when a tour isn't listed.

**New** `src/lib/booking/availability.ts` (+ unit tests):
- `isDateSelectable(tourId, dateISO, nowLisbon)` → `{ ok, reason: 'past'|'lead-time'|'blackout'|'off-day' }`
- `earliestSelectableDate(tourId, now)` — drives `<input type="date" min>`
- `availablePickups(tourId, dateISO)` — filters `pickupWindows` against lead time so past slots disappear (cleaner than disabling)

**Form wiring** in `SimpleBookingForm.tsx` + `SimpleTailorForm.tsx`:
- Date `min` = earliest selectable. On invalid change → single-line editorial hint under the field, pickup cleared.
- Pickup grid renders only `availablePickups()` results; empty → *"No pickups left today — pick tomorrow."*
- Submit `disabled` + `aria-disabled` until date + pickup + composition + language all valid.

**Server safeguard**: the checkout server function re-runs `isDateSelectable` before minting Stripe session; on fail returns 422 with reason. No DB, no new secrets.

---

## 2 · Funnel analytics — CTA to confirmation

Extend `src/lib/analytics-ga4.ts` with custom (non-ecommerce) events carrying `tour_id`, `surface: 'signature'|'tailor'`:

| Event | Trigger |
|---|---|
| `reserve_cta_click` | Any "Check availability & reserve" CTA (hero / sticky / final band) — with `cta_location` |
| `booking_date_selected` | Valid date chosen (`days_ahead`) |
| `booking_time_selected` | Pickup chosen (`pickup_time`) |
| `booking_composition_set` | Composition becomes complete (`adults`, `minors`, `total_guests`) |
| `booking_language_selected` | `language` |
| `booking_validation_blocked` | Submit while disabled OR server 422 (`reason`) |
| `checkout_drawer_opened` | Drawer mount — alongside existing `begin_checkout` |
| `checkout_drawer_abandoned` | Drawer close without purchase (`time_open_ms`) |

Each event fires once per session per field (useRef guard). Existing `view_item → add_to_cart → begin_checkout → add_payment_info → purchase` untouched. Tests added to `analytics-ga4.test.ts`.

---

## 3 · Price label truth — "per person / per adult / party total"

**Problem** (IMG_6547 & IMG_6552): "INDICATIVE TOTAL €718 / ADULT" reads as a total but is a per-adult rate. IMG_6552 already shows the better shape (`FOR 3 GUESTS €215/pp · PARTY TOTAL €538`) — Studio V3 gets it right, but the Tailor summary card and the shared Signature price card do not.

**Fix** in `src/routes/tours.$tourId.tailor.tsx` (line ~1478) and `src/components/studio-v3/SignaturePriceCard.tsx`:
- Replace the single "Indicative total · €X / adult" row with the two-line shape used elsewhere:
  - `For N guests · €X / pp` (adult unit, real when tier data present, else labelled *from*)
  - `Party total · €Y` (uses `resolveJourneyPricing().totalEur` — age-band aware)
- When minors present, show a compact `PerPersonBands` (already built) line below. When adults-only, drop the second bands line.
- Eyebrow above the block: `INDICATIVE` (not `INDICATIVE TOTAL`) so it can't be misread. Small note underneath: *"Final on checkout."*

No pricing math changes — reuses `resolveJourneyPricing` + `PerPersonBands` primitives. Snapshot test added to lock the shape.

---

## 4 · Tailor add-ons — geographic sanity (no nonsense stops)

**Problem** (IMG_6548): Southwest Vicentine Coast (Alentejo/Costa Vicentina) offers **Lisbon** as an "Optional stop you can add". `optionalStops` reads `meta.stops.filter(s => s.passBy)` from Viator raw data — which includes hub cities Viator lists as pass-by/orientation, not as real user-selectable additions.

**Fix** in `src/routes/tours.$tourId.tailor.tsx` (line ~335) + `src/data/tailorBlueprints.ts`:
- Introduce `optionalStopsAllowlist?: string[]` on each Signature's Tailor blueprint. When present, `optionalStops` is intersected with the allowlist (case-insensitive).
- When absent, apply a defensive filter: drop any stop whose label matches the tour's own `region` hub or is > ~120 km from the tour's centroid (uses `stopCoords` — pure math, no API). Rule: **when in doubt, hide it.** Never invent, never surface geographically wrong stops.
- Populate the allowlist for every current Signature (owner-approved names only). Tours without a curated list show zero add-ons rather than junk — matches the brand rule *silence beats a wrong option*.
- Also: the `optionalStops` block header changes from "Optional stops you can add" to **"Curated add-ons for this journey"** so users don't expect an open menu.

Unit tests: Southwest Vicentine Coast → allowlist empty → block hidden; Arrábida wine → allowlist = curated set.

---

## 5 · Map legend truth — wineries + "2 or 3 depending on"

**Problem** (IMG_6551): Arrábida wine tour map shows only civic stops (Cristo Rei, Parque Natural, Azulejos, Castelo de Sesimbra). Wineries — the actual point of the tour — aren't on the map, and the legend line ("Your guide sets the order and pace…") doesn't explain that winery count is *chosen* (2 or 3, availability-dependent).

**Fix** in `src/components/SignatureRouteMap.tsx` + `src/data/stopGeo.ts`:
- Add winery pins (with real coordinates) to Arrábida-wine-family tours. Pins use a distinct gold ◆ marker (vs. numbered gold circles for civic stops) so hierarchy is obvious. No fabricated coordinates — a winery without confirmed geo stays out.
- Map legend gains one line under the numbered list when the tour has a `wineriesRule` set on its `SignatureTour`:
  - Arrábida wine: *"You'll visit 2 or 3 of these wineries — the exact count depends on the experience you choose, and on same-day availability."*
- The `SignatureTour.wineriesRule?: string` field is optional and hand-authored per tour (source-of-truth stays with owner). Tours without it show no extra legend line.

Also fix the broken Signature card image on the Tailor hero (IMG_6550: blue "?" icon) — `src/routes/tours.$tourId.tailor.tsx` uses the tour's cover; when the Southwest Vicentine Coast cover is missing at that size, fall back to the responsive gallery lead. Small mechanical fix.

---

## 6 · Typography contrast — systemic token + booking-flow migration

`src/styles.css`:
- Add `--charcoal-ink: #4A4A4A` (≥ 4.6:1 on `--ivory` and `--sand`) for **functional body/hint text**.
- Keep `--charcoal-soft` untouched — reserved for **decorative dimming only** (eyebrow underlines, dividers, disabled). Documented inline. Brand palette 8 tokens unchanged.

**Migration** (surgical, not global):
- `rg`-driven swap of `text-[color:var(--charcoal-soft)]` on hint/label/caption text nodes to `--charcoal-ink`. Preserve on borders and decorative dividers.
- Priority: booking flow first (`SimpleBookingForm`, `SimpleTailorForm`, `checkout.$token.tsx`, `BrandedCheckoutDrawer`, `PriceBreakdownRows`, `PerPersonBands`, `TrustStrip`), then tour detail, then homepage, then rest.

**Dev-only probe** `src/lib/contrast-check.ts` (opt-in `?contrastDebug=1`) console-warns any text node < 4.5:1 vs computed background. Not shipped hot.

---

## Ship order (single branch)
1. Availability helpers + tests → form wiring → server guard.
2. Analytics events + tests → CTA wiring → drawer events.
3. Price label refactor (Tailor summary + SignaturePriceCard) + snapshot test.
4. Tailor add-ons allowlist + geo filter + blueprint fills + tests.
5. Map winery pins + legend rule + broken cover fallback.
6. Contrast token + booking-flow swap + `?contrastDebug=1` probe.

## Files touched (est.)
- **New**: `src/data/tourAvailability.ts`, `src/lib/booking/availability.ts` (+tests), `src/lib/contrast-check.ts`
- **Edited**: `src/components/SimpleBookingForm.tsx`, `src/components/SimpleTailorForm.tsx`, `src/components/checkout/BrandedCheckoutDrawer.tsx`, `src/components/MobileStickyCTA.tsx`, `src/components/SignatureRouteMap.tsx`, `src/components/studio-v3/SignaturePriceCard.tsx`, `src/routes/tours.$tourId.tsx`, `src/routes/tours.$tourId.tailor.tsx`, `src/routes/checkout.$token.tsx`, `src/data/tailorBlueprints.ts`, `src/data/signatureTours.ts` (optional `wineriesRule` field only), `src/data/stopGeo.ts`, `src/lib/analytics-ga4.ts` (+tests), `src/styles.css`, checkout server function (+ ~15 mechanical contrast swap sites)

## Non-goals (explicit)
- Live Viator/Bókun availability, blackout admin UI, real-time winery inventory.
- Repointing brand palette tokens.
- Copy invention (all new microcopy is functional & owner-approvable).
- New analytics backend — reuses GA4 dataLayer.