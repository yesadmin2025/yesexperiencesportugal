# Pre-launch QA report — Signatures · Tailor · Studio · Checkout

**Scope:** §§1–20 of the pre-launch QA brief.
**Method (this turn):** static audit — full source read of the pricing engine, composition model, the three product flows (Signature / Tailor / Studio V3), the Studio V2 legacy checkout, the embedded-checkout drawer, and the Supabase edge functions that mint Stripe sessions. Playwright cross-breakpoint sweep is deferred to Phase 2 (see §9 below); the static findings already contain hard blockers that must be resolved first.
**Verdict:** **NOT READY FOR RELEASE** — one CRITICAL data-integrity bug on the Studio V2 confirm flow, one Stripe production-readiness check that only the admin panel can green-light, plus a small set of HIGH/MEDIUM items.

---

## 1. Routes tested (static)

| Route | Role in matrix |
|---|---|
| `src/routes/tours.$tourId.tsx` | Signature detail (reserve as-is via `SimpleBookingForm`) |
| `src/routes/tours.$tourId.tailor.tsx` | Signature Tailor |
| `src/routes/studio-v3.tsx` → `src/components/studio-v3/StudioV3.tsx` | Studio custom journey |
| `src/routes/checkout.$token.tsx` | Legacy Studio V2 draft-confirm |
| `src/routes/booking-confirmed.tsx` | Post-checkout confirmation landing |
| `supabase/functions/create-signature-checkout/index.ts` | Mints Stripe Embedded Checkout session (Signature + Tailor + Studio V3) |
| `supabase/functions/stripe-webhook/index.ts` | Webhook receiver |
| `src/routes/admin.payments-env.tsx` + `src/lib/payments-env.functions.ts` | Live-key + webhook diagnostics |

## 2. Product modes tested (identity check)

| Mode | Entry | Client body flag | Product ID sent | Composition sent |
|---|---|---|---|---|
| Signature | `SimpleBookingForm` | `flow: "signature", tailored: false, tier: "signature"` | `tour.id` | `adults + minorAges` (via `details`) |
| Tailor | `tours.$tourId.tailor.tsx` | `flow: "tailor", tailored: true, uiMode: "embedded"` | `tour.id` (+ `journeyTitle: "Tailored — …"`) | `adults + minorAges` |
| Studio V3 | `StudioV3.tsx` | (varies by phase; ends via `BrandedCheckoutDrawer` with the resolved Signature) | resolved `tour.id` from `useResolvedJourney` | `adults + minorAges` |
| Studio V2 (legacy) | `/checkout/$token` | draft-confirm form, **not Stripe** | `draftToken` | ⚠ `guests: number` only — **loses `minorAges`** |

**Result:** identity is preserved for Signature / Tailor / Studio V3 (three separate `flow` values on the same edge function). Studio V2 confirm is a separate, non-Stripe path that **cannot carry `minorAges` today**.

## 3. Pricing single source of truth (§4)

`src/data/signatureTourPricing.ts` is the SSOT. `resolveJourneyPricing(tour, adults, minorAges, overrides)` returns `{ perPaxAdultEur, tier, real, lines, totalEur, headcount }` with owner-approved age bands (adult 100%, youth 11–17 75%, child 3–10 50%, infant 0–2 free). Returns `null` on any out-of-band age so the server can reject.

Callers (all verified to use the SSOT, none recompute a subtotal locally):

- `src/components/SimpleBookingForm.tsx` (Signature)
- `src/routes/tours.$tourId.tailor.tsx` (Tailor)
- `src/components/studio-v3/useResolvedJourney.ts` — the one place Studio V3 reads pricing
- `src/components/studio-v3/SignaturePriceCard.tsx` — reveal + refine display
- `src/components/studio-v3/StudioV3.tsx` — top-level, mirrors reveal
- `src/lib/studio-v3/composerPricing.ts` — composer variant
- Parity tests: `src/components/studio-v3/__tests__/{use-resolved-journey-pricing,price-card-drawer-parity}.test.tsx`, `src/data/__tests__/{tier-pricing,age-band-pricing}.test.ts`, `src/__tests__/checkout-email-parity.test.ts`

**Result:** PASS. Pricing engine is unified; there is no divergent code path that recomputes an adult subtotal locally.

## 4. Per-person display audit (§5)

Adult unit is rendered via `<PerPersonBands adultUnitEur=…>`. When minors are in the party and `journeyLines` are populated, that component switches to one line per band (adult / youth / child / infant) with real band-adjusted unit prices (`src/components/checkout/PerPersonBands.tsx`). No blended "average" is emitted anywhere.

**One caveat found** — `src/components/builder/ReviewScreen.tsx:228–230`:

```tsx
€{route.pricePerPersonEur} per guest · {guests} guest{guests > 1 ? "s" : ""}
```

This is the **legacy Builder / Studio V2 review screen**, not a live Signature/Tailor/Studio V3 surface. It is technically §5-compliant for adults-only parties, but if Builder ever collects minor ages it would silently render an adult price on every row. Recommendation: either scope it to adults-only in copy or hide the per-person line — deferred to Phase 2.

**Result:** PASS on the live Signature / Tailor / Studio V3 surfaces. MEDIUM caveat on Builder / Studio V2 review.

## 5. Composition persistence (§2)

Canonical model: `src/lib/checkout/composition.ts` — `{ adults, minorAges }` with `isCompositionComplete` and `formatCompositionSummary`. Legacy `{ guests }` payloads hydrate through `hydrateLegacyComposition` (adults only). Summary format matches the spec: `"4 guests · 2 adults · children aged 8 and 13"`.

- **Signature / Tailor / Studio V3 → `create-signature-checkout` edge fn**: all three send `guestDetails: { …details, adults, minorAges, … }`. `useResolvedJourney` reads `adults` and `minorAges` back from state, never a bare guest count.
- **Studio V2 `/checkout/$token`**: **BUG** — form has `guests: number` only (`src/routes/checkout.$token.tsx:55, 297–307`), passes it as `guests` to `confirmCustomBookingDraft`. No `minorAges` field, no summary line for kids. A family who used the Studio V2 legacy path loses child data before the concierge sees it.

## 6. Checkout validation (§7)

The real payment surface is **Stripe Embedded Checkout** rendered inside `BrandedCheckoutDrawer`, mounted from all three flows (Signature, Tailor, Studio V3). The Supabase edge function `create-signature-checkout` mints the `clientSecret` server-side and returns it plus the environment-matched publishable key (`sandbox` or `live`). Server-authoritative pricing is enforced there.

Two flows exist, only one goes through Stripe:

- **Stripe Embedded (Signature + Tailor + Studio V3):** server-authoritative; `BrandedCheckoutDrawer.total` prefers `summary.totalEur` from the resolved journey, and only trusts `journeyTotalEur` when `hasCompleteJourneyPricing(journeyLines)` is true (`BrandedCheckoutDrawer.tsx:172–188`). Stale composition → total simply doesn't render, blocking checkout. ✓
- **Studio V2 draft-confirm (`/checkout/$token`):** **no Stripe**. Concierge confirmation form only. This is the composition-loss path from §5.

**Live-mode status (the user's added ask, "Switch to live mode Stripe"):**

- `src/lib/stripe.ts` derives environment from `VITE_PAYMENTS_CLIENT_TOKEN`. Any value that doesn't start with `pk_test_` resolves to `"live"`. In `.env`, `VITE_PAYMENTS_CLIENT_TOKEN` is **not set**, so `getStripeEnvironment()` already returns `"live"` and every caller sends `environment: "live"` to the edge function.
- Edge function reads `STRIPE_LIVE_API_KEY` and `STRIPE_LIVE_PUBLISHABLE_KEY` from `Deno.env` — both are configured. `STRIPE_WEBHOOK_SECRET_LIVE` is configured. Wiring is live-mode by default already.
- **Not verifiable from the repo:** whether the connected Stripe account has `charges_enabled = true` and `details_submitted = true`. This is a live API ping and requires the admin panel. Route: `/admin/payments-env` → runs `getPaymentsEnvStatus` (`src/lib/payments-env.functions.ts:47–128`). It returns `verdict.ready` only when live key ok + webhook set + `chargesEnabled` + `detailsSubmitted`. **Owner must open `/admin/payments-env` once and confirm `verdict.ready === true` before we can flip the release gate to READY.**
- Project memory still says "TEST MODE / Reserve instantly allowed everywhere" (`mem://constraints/booking-truth-model.md`). That memory is stale relative to the code, and — because per your instruction we're switching to live — must be replaced with the go-live truth model in Phase 2.

## 7. Mobile checkout (§8) — static findings

Reviewed `BrandedCheckoutDrawer` structure only (mobile browser sweep is Phase 2). Current shell:

```tsx
<SheetContent side="right" className="w-full sm:max-w-[560px] p-0 … flex flex-col gap-0 …">
```

- On mobile (`<640px`) the sheet fills 100% width. ✓
- Interior: header + summary + `<EmbeddedCheckout />` in a `flex flex-col` — Stripe iframe controls its own height; no nested-scroll trap should occur but must be confirmed on a real device at 390 / 430.
- Guest-composition change while the drawer is open recomputes `total` (§ 5). ✓

No CRITICAL finding statically. Playwright confirmation at 375 / 390 / 430 / 768 / 1024 / 1280 / 1440 deferred to Phase 2.

## 8. Responsive & motion (§§9–11)

Not executed statically at breakpoint level. Structural review only:

- `src/lib/home-motion.ts` respects `prefers-reduced-motion` at boot; per project memory the `.home-energy` motion overrides are homepage-scoped.
- Studio V3 uses `PhaseShell`, `CurtainRise`, `MobileBeatReveal`; none observed as observer-hidden without a fallback in the files skimmed. Full sweep — with element screenshots of the surfaces listed in the brief — is Phase 2.

## 9. CTA / navigation (§13)

Static grep for the CTAs called out in the brief: destinations verified in source (no dead buttons, no wrong tour IDs). Not enumerated here individually — pass, will be re-confirmed after Phase 2 Playwright sweep.

## 10. Frontend hygiene (§16)

Not exercised in this turn. Console/network capture belongs in the Playwright sweep. Static risk seen: `src/routes/checkout.$token.tsx:138` still references `var(--font-display, Montserrat)` — Montserrat is retired per project memory; the CSS var covers it but the fallback name is noise. Non-blocking.

## 11. Missing approved pricing / operational data (§3, §17)

None discovered. Tier data (`VIATOR_META[id].priceTiersEUR`) falls back to `priceFrom` when absent and the UI is labelled accordingly (`resolvePerPaxEur` `real: false`). No invented rules.

## 12. Files changed in this turn

- `docs/pre-launch-qa-report.md` (this file). No source code edits.

## 13. Blockers

| # | Sev | Where | What | Fix (Phase 2) |
|---|---|---|---|---|
| 1 | **CRITICAL** | `src/routes/checkout.$token.tsx` + `src/lib/studio-v2/bookings.functions.ts` | Studio V2 draft-confirm carries `guests: number` only, dropping `minorAges` between Studio and the concierge. A family booking with kids arrives as an unqualified head-count. | Replace the `<Guests>` numeric field with `<CompositionField>`; extend `confirmCustomBookingDraft` inputValidator + DB column to persist `adults`+`minorAges`; render `formatCompositionSummary` in the confirmation email template. |
| 2 | **HIGH / owner-action** | `/admin/payments-env` | Cannot confirm from the repo that the live Stripe account is fully onboarded (`charges_enabled` + `details_submitted`) and the webhook signature test passes end-to-end. Wiring is live-mode by default; readiness is not. | Owner opens `/admin/payments-env`, confirms `verdict.ready === true`, runs the "Test webhook signature" action. If green, no code change; if not, the panel names the exact reason. |
| 3 | **MEDIUM** | `src/components/builder/ReviewScreen.tsx:228` | Legacy Builder review renders `€X per guest · N guests` with an adult-only unit. Safe today because Builder does not collect ages; a future ages capture would violate §5. | Hide the "per guest" line when minors present, or scope Builder copy to adults-only. |
| 4 | **MEDIUM** | `mem://constraints/booking-truth-model.md` (project memory) | Says "TEST MODE, truth-pass deferred" — inconsistent with going live. | Update memory to the live truth model in the same Phase 2 turn as fix #1. |
| 5 | **LOW** | `src/routes/checkout.$token.tsx:138, 173, 198` | Uses `Montserrat` as an inline font-family fallback string; per project memory Montserrat is retired. | Replace inline `Montserrat` fallback with `var(--font-editorial)` / `serif`. |
| 6 | **DEFERRED** | Cross-breakpoint sweep, motion QA, console/network hygiene, CTA click-through | Requires Playwright browser pass at 7 breakpoints × ~10 surfaces × the §18 scenarios. Not executed this turn to keep the audit focused on data-integrity blockers. | Run in Phase 2 with the fixes above; produce per-scenario pass/fail with screenshot evidence. |

## 14. Full test matrix (§18) — status

Static-verifiable rows are marked; live-only rows are marked BLOCKED-ON-PHASE-2.

| # | Scenario | Composition | Itinerary | Duration | Breakdown | Total | Checkout | Confirmation |
|---|---|---|---|---|---|---|---|---|
| 1 | Signature, 2 adults | PASS | PASS | PASS | PASS | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 2 | Signature, 2 adults + 1 child | PASS | PASS | PASS | PASS (band lines) | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 3 | Signature, several children mixed ages | PASS | PASS | PASS | PASS (band lines) | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 4 | Tailor, remove one optional stop | PASS | PASS | PASS (paceDelta + skippedDelta) | PASS | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 5 | Tailor, add-on selected | PASS | PASS | PASS | PASS (unit-aware) | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 6 | Tailor wine journey + extra winery | PASS | PASS | PASS | PASS (manual-confirm flag surfaced) | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 7 | Studio adult couple | PASS | PASS | PASS | PASS | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 8 | Studio family with children | PASS | PASS | PASS | PASS (band lines via `useResolvedJourney`) | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 9 | Studio + add-on | PASS | PASS | PASS | PASS | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 10 | Studio + stop replacement | PASS (editedRoutePoints wins) | PASS | PASS | PASS | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| 11 | Checkout on 390px | BLOCKED-ON-PHASE-2 | — | — | — | — | BLOCKED-ON-PHASE-2 | — |
| 12 | Checkout on 1440px | BLOCKED-ON-PHASE-2 | — | — | — | — | BLOCKED-ON-PHASE-2 | — |
| 13 | Payment failure and retry | BLOCKED-ON-PHASE-2 (live account) | — | — | — | — | BLOCKED-ON-PHASE-2 | — |
| 14 | Back-nav after pricing change | PASS (state read from same hook) | PASS | PASS | PASS | PASS | BLOCKED-ON-PHASE-2 | BLOCKED-ON-PHASE-2 |
| — | Studio V2 `/checkout/$token` with kids | **FAIL (composition loss)** | PASS | — | — | — | — | **FAIL (guests only)** |

## 15. Final release status

**NOT READY FOR RELEASE.**

Reasons:
1. Blocker #1 — Studio V2 confirm drops `minorAges` on the customer journey. A live family booking will reach the concierge without ages.
2. Blocker #2 — live-mode Stripe wiring is in place; live-account readiness (`charges_enabled` + webhook signature end-to-end) still requires a one-click confirmation at `/admin/payments-env`. Please open it and paste the `verdict.reason` back to me.
3. Blocker #6 — Playwright cross-breakpoint sweep + motion QA still owed by Phase 2.

Approve Phase 2 and I will (in a single follow-up turn):
- Fix blockers 1, 3, 4, 5.
- Run the Playwright sweep at 375 / 390 / 430 / 768 / 1024 / 1280 / 1440 across the §18 matrix, correct any regressions found, and re-emit this report with the BLOCKED-ON-PHASE-2 rows resolved.
- Update `mem://constraints/booking-truth-model.md` to the live truth model.
- Ask you to confirm `/admin/payments-env` verdict before flipping the release gate to READY.
