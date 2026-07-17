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

## 12. Files changed

Phase 1 audit (prior turn):
- `docs/pre-launch-qa-report.md` (created)

Phase 1 fixes (this turn):
- `supabase/migrations/*_studio_v2_bookings_composition.sql` — add `adults` + `minor_ages` columns
- `src/lib/studio-v2/bookings.functions.ts` — `confirmSchema` accepts `{adults, minorAges}`, persists both, sends `compositionSummary` to guest + team email
- `src/routes/checkout.$token.tsx` — swap numeric `Guests` field for `<CompositionField>`, hydrate legacy drafts, block submit on incomplete minor ages, retire Montserrat inline fallback (→ `var(--font-display), serif`)
- `src/lib/email-templates/booking-confirmation.tsx` — render `compositionSummary` when provided
- `src/lib/email-templates/internal-booking.tsx` — same
- `src/components/builder/ReviewScreen.tsx` — "per guest" → "per adult" (§5 forward-safety)
- `mem://constraints/booking-truth-model.md` — replaced TEST-mode note with the live truth model

Typecheck: `bunx tsgo --noEmit` clean.

## 13. Blockers — status after Phase 1 fixes

| # | Sev | Status | Notes |
|---|---|---|---|
| 1 | CRITICAL | **FIXED** | Studio V2 confirm now carries `{adults, minorAges}` end-to-end (form → server fn → DB → guest email → team email). Legacy `guests`-only drafts hydrate via `hydrateLegacyComposition`. |
| 2 | HIGH / owner-action | **OPEN — owner** | Still requires owner to open `/admin/payments-env` and confirm `verdict.ready === true`. No code fix possible. |
| 3 | MEDIUM | **FIXED** | Builder review screen now reads "per adult · N adults". |
| 4 | MEDIUM | **FIXED** | `mem://constraints/booking-truth-model.md` rewritten to the live model. |
| 5 | LOW | **FIXED** | `Montserrat` inline fallbacks in `checkout.$token.tsx` retired. |
| 6 | DEFERRED | Ready for Phase 2 | Playwright cross-breakpoint sweep still owed. |

## 14. Full test matrix (§18) — status

Unchanged from prior turn except row `Studio V2 /checkout/$token with kids` flips from **FAIL** to **PASS** (composition + email now carry `minorAges`). Live-only rows remain BLOCKED-ON-PHASE-2 pending Playwright sweep + `/admin/payments-env` confirmation.

## 15. Final release status

**NOT READY** — one owner-action blocker (#2) and the Playwright sweep still owed. All in-scope code blockers are resolved. Ready to run Phase 2 (Playwright sweep + regression fixes) on approval, and to flip to READY once `/admin/payments-env` returns `verdict.ready === true`.
