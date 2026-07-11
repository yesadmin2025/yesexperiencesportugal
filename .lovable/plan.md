
# Studio V3 Pass 1 — E2E Convergence (final, ready to execute)

Approved plan with the four final execution constraints folded in. No further approvals will be requested unless an external credential or genuine blocker appears.

## 0. Origin of the visible €145 (recorded pre-edit)

- File: `src/data/signatureTours.ts:529` → `signatureTours["azeitao-cheese"].priceFrom = 145`
- Flow: `resolveStudioV3Route()` picks `azeitao-cheese` → `tour.priceFrom` is passed into `StudioV3.tsx:894` as `priceFromEur` and consumed by `SignaturePriceCard` via `previewTiers`/tour anchor
- Corroborated by `src/lib/studio-v2/blueprints.ts` blueprint `bp-arrabida-azeitao-craft.pricePerGuestFrom = 145`

Conclusion: the €145 is the Signature Tour's own anchor, not a Studio commercial price. Pass 1 introduces a dedicated Studio commercial pricing key and stops using `tour.priceFrom` as the Studio's displayed price.

## 1. Studio commercial pricing identity

New server-owned key: `studio-v3-private-full-day` in `supabase/functions/_shared/studioCommercialPricing.ts`.

Approved tier: `{ guests: 3, unitEur: 145 }`. Any other guest count → `pricing_unavailable` (see §9). No borrowed Signature-Tour tiers, no invented values, no SQL against Signature Tour rows.

## 2. Bókun availability policy

No dedicated Studio Bókun activity mapping exists. Pass 1 does NOT call Bókun for Studio availability. Result:
- `availabilityStatus = "pending-review"`
- `routeStatus = "pending-review"`

Bókun remains authoritative wherever it is properly mapped elsewhere; the Studio simply does not claim availability from an unrelated Signature Tour's product.

## 3. Server-authoritative quote + Stripe session

Extend `supabase/functions/create-signature-checkout/index.ts` with a `mode` discriminator.

`POST { mode: "quote", snapshot }` → validates+normalises snapshot (see §7), resolves prices server-side, returns:
```
{ quoteToken, expiresAt, revision, snapshotHash,
  pricing: { status, unitEur, baseSubtotalEur, totalEur, currency },
  addOns: [{ id, label, priceUnit, unitEur, quantity, lineSubtotalEur, routeIntegration, inclusions? }],
  routeStatus, availabilityStatus,
  inclusions: [{ id, label }],
  itinerary: { title, destinationRegion, pickupCity, date, startTime, language, guests, routeStops:[{id,label}] } }
```

`POST { mode: "create-session", quoteToken, currentRevision, guestDetails }`:
- Verify HMAC (`STUDIO_QUOTE_SIGNING_SECRET`), expiry, `currentRevision === token.revision`.
- Re-resolve pricing/add-ons; abort if any mismatch vs signed quote.
- Create exactly one Stripe session using **Stripe idempotency key** `studio-v3:${sha256(quoteToken)}` — repeated calls with same token return the same session (per §5).
- Stripe metadata populated **only** from the signed snapshot (title, destination, date, guests, ordered stop labels, add-on IDs, route status, compact inclusion IDs). Never from `tour.stops`, `tour.img`, `tour.included`, `VIATOR_META`, or `alternativeStops`. Metadata trimmed to Stripe's 500-char per-value / 50-key limit; long lists stored as compact ID CSVs.

New secret: `STUDIO_QUOTE_SIGNING_SECRET` (generated, 64 chars). Requested via `generate_secret`; no user input needed.

## 4. Quote lifecycle — **query only from `finalSignature` onward** (§1 constraint)

New hook `src/components/studio-v3/useResolvedSignature.ts`:
- Pure memoized selector composes `SignatureQuoteSnapshot` + `revision` from Studio state.
- `useQuery(['studio-quote', revision], quoteFn)` with:
  ```
  enabled:
    (phase === "finalSignature" || phase === "guestDetails" || phase === "checkout")
    && hasValidDate && guests >= 1
    && commercialProductKey
    && routeStops.length >= 1
    && snapshotComplete
  ```
- Edits in earlier phases (questionnaire / storyboard / refine) do **not** trigger quotes; they only bump `revision` locally.
- Debounce on refine edits: `revision` recomputed with a 250 ms trailing debounce so mid-drag keystrokes don't fire quotes even when the guest later re-enters `finalSignature`.
- On revision change while a quote exists: drop token, set `pricing.status = "loading"`, block checkout.

## 5. Duplicate-session prevention (§2 constraint)

- Stripe API call uses `idempotencyKey = 'studio-v3:' + sha256(quoteToken)` — Stripe guarantees the same session is returned for identical keys.
- `handleStripeCheckout` disables the CTA on click, awaits response, re-enables only on error.
- Client-side de-dupe via React Query mutation `mutationKey: ['create-session', quoteToken]` — concurrent calls share the in-flight promise.
- Test: `create-signature-checkout.dedupe.test.ts` — two sequential and two parallel `create-session` calls with the same valid token yield exactly one Stripe session ID.

## 6. Payment gating

CTA enabled iff **all** true:
- `pricing.status === "quoted"`, `quoteToken` present, not expired
- `quote.revision === currentRevision`
- `routeStatus !== "unavailable"` and `availabilityStatus !== "unavailable"`
- Visible total (from server) === quoted total

`pending-review` proceeds under the single approved copy (below). Loading: `Calculating live price…`. No client-computed fallback total is rendered as final.

Approved pending-confirmation string (single source, `src/content/signature-day-copy.ts::confirmationCopy("pending-review")`):
> Your request is received after payment and remains subject to final route and availability confirmation.

No "Instant confirmation" / "Reserve instantly" strings when status is `pending-review` — enforced by `no-instant-confirmation.test.tsx`.

## 7. Snapshot validation + sanitisation (§3 constraint)

`supabase/functions/_shared/quoteSnapshotSchema.ts` (Zod):
- `commercialProductKey ∈ { "studio-v3-private-full-day" }`
- `date`: ISO `YYYY-MM-DD`, ≥ today
- `startTime`: `HH:MM`
- `language ∈ SUPPORTED_LANGUAGES`
- `guests`: int 1..20
- `routeStops`: 1..12, unique `id` from allowlist derived from resolved signature; `label` ≤ 80 chars, stripped of control chars
- `selectedAddOns`: max 8, `id` from server catalogue, `quantity` 1..20
- `routeStatus ∈ {"validated","pending-review","unavailable"}`
- `title` ≤ 120 chars, `destinationRegion` ≤ 80, `pickupCity` ≤ 80
- `inclusionIds`: **ignored** — server resolves authoritative inclusions from mapped activity metadata + canonical product source + selected server add-ons via `supabase/functions/_shared/resolveInclusions.ts`.
- All text normalised (NFC, trim, strip control chars) before signing / Stripe metadata / logs.

`snapshotHash = sha256(canonicalJSON(normalisedSnapshot))` embedded in the signed token together with `revision`.

## 8. Server add-on catalogue (authority)

`supabase/functions/_shared/signatureAddOnCatalogue.ts` — server owns priceUnit/unitEur/routeIntegration. Fixture entry:
- `coastal-boat-sesimbra`: `priceUnit: "per_person"`, `unitEur: 30`, `routeIntegration: "pending-review"`

Client `src/data/signatureAddOns.ts` stays as presentation-only mirror (fields added: `priceUnit`, `amountEur`, `routeIntegration`). A parity test emits a drift warning; the operational rule is server-catalogue wins, quote response is the final displayed values.

## 9. Unsupported guest counts — safe designer-request state (§4 constraint)

When quote returns `pricing.status === "unavailable"` (any guest count ≠ 3 in Pass 1):
- Stripe CTA hidden.
- `finalSignature` renders a soft state:
  > **Live pricing for this group size requires a tailored quote.**
  > Send this Signature to our travel designer.
- Primary action: existing enquiry / designer-request path (reuse current `contact_messages` / lead flow) prefilled with: selected stops, add-ons, date, guests, title, pickup, language, contact draft.
- Studio state preserved on back navigation.
- No new enquiry system introduced.

## 10. `ResolvedSignature` authority split

- **Client-derived from Studio state**: stop order, replacements/removals, editorial timeline, user-edited title, pickup, date, language.
- **Server-authoritative after quote lands**: commercial pricing identity, unit price, base subtotal, add-on line items, total, add-on route integration, availability status, activity inclusions, quote token, expiry.
- `snapshotHash` binds the two sides.

## 11. Convergence across surfaces

- Destination title derived from resolved region: `"Setúbal · Azeitão · Sesimbra"` (not "Lisbon day").
- Canonical numbered stops (fixture): Mercado do Livramento → Azulejos de Azeitão → Bacalhôa Vinhos de Portugal → Castelo de Sesimbra. Alternative winery excluded unless explicitly selected.
- Single inclusion resolver used by reveal, refine, final, guest details, checkout summary, Stripe metadata.
- Phase rename `"confirmation"` → `"finalSignature"` with hydrator alias for saved sessions.
- Phase chain enforced: `storyboard → refine → finalSignature → guestDetails → checkout`. `finalSignature` is a distinct rewarding render built from live `ResolvedSignature`, not a re-use of the storyboard proposal.
- Back navigation preserves refined stops, add-ons, guest draft, title, date, pickup, language (existing Studio state store; verified by test).

## 12. Files touched

**New**
- `supabase/functions/_shared/studioCommercialPricing.ts`
- `supabase/functions/_shared/signatureAddOnCatalogue.ts`
- `supabase/functions/_shared/quoteToken.ts` (HMAC sign/verify)
- `supabase/functions/_shared/quoteSnapshotSchema.ts` (Zod validate+normalise)
- `supabase/functions/_shared/resolveQuote.ts`
- `supabase/functions/_shared/resolveInclusions.ts`
- `src/components/studio-v3/useResolvedSignature.ts`
- `src/lib/studio-v3/quoteClient.ts`
- `src/lib/resolveInclusions.ts` (client mirror for pre-quote UI only)
- Tests below

**Edited**
- `supabase/functions/create-signature-checkout/index.ts` (mode discriminator, idempotency key, metadata from signed snapshot)
- `src/components/studio-v3/SignaturePriceCard.tsx` (consume quote; loading state; gate CTA)
- `src/components/studio-v3/CheckoutSummary.tsx` (consume quote)
- `src/components/studio-v3/FinalRevealStory.tsx` (destination title, canonical stops, unavailable state)
- `src/components/studio-v3/LivingJourneyPanel.tsx`
- `src/components/studio-v3/StudioV3.tsx` (wire hook; stop passing `tour.priceFrom` as Studio price; phase chain)
- `src/components/studio-v3/curation.ts` (`routeStatus` from add-on `routeIntegration`)
- `src/components/studio-v3/StudioV3ProgressStepper.tsx` (phase rename)
- `src/data/signatureAddOns.ts` (add fallback fields)
- `src/content/signature-day-copy.ts` (`confirmationCopy(status)`)

**Secrets**
- `STUDIO_QUOTE_SIGNING_SECRET` — generated

**No** SQL migrations. **No** changes to `tour_price_tiers`, `signatureTours`, Bókun mappings. **No** PDF re-enable. **No** mobile redesign.

## 13. Tests

- `supabase/functions/_shared/__tests__/resolveQuote.test.ts` — 3 guests + boat = €525 pending-review; 2/4/5/6 guests = `pricing_unavailable`.
- `supabase/functions/_shared/__tests__/quoteToken.test.ts` — sign/verify, tamper, expiry, revision mismatch.
- `supabase/functions/_shared/__tests__/quoteSnapshotSchema.test.ts` — rejects oversized labels, unknown add-ons, bad dates; ignores client `inclusionIds`.
- `supabase/functions/create-signature-checkout/__tests__/dedupe.test.ts` — sequential + parallel `create-session` with same token → one Stripe session ID (§2).
- `src/components/studio-v3/__tests__/useResolvedSignature.test.ts` — no quote before `finalSignature`; revision changes invalidate; loading gates CTA (§1).
- `src/components/studio-v3/__tests__/convergence-golden.test.tsx` — reveal/refine/final/guestDetails/checkout show same €525, same 4 stops, same title, same pending-review status.
- `src/components/studio-v3/__tests__/no-instant-confirmation.test.tsx` — no instant-confirm copy when pending-review.
- `src/components/studio-v3/__tests__/unavailable-designer-request.test.tsx` — 2 guests renders designer-request CTA, preserves state on back (§4).
- `src/components/studio-v3/__tests__/back-navigation.test.tsx` — state preserved across phase back/forward.

## 14. Rollback

All changes gated inside Studio V3 code paths. Revert = restore `tour.priceFrom` display path, remove new server files, unset `STUDIO_QUOTE_SIGNING_SECRET`. No data to undo.

## 15. Deferred to Pass 2

PDF (kept disabled), mobile 393px regressions, explicit price-card labels.

## 16. Golden fixture acceptance

3 guests · commercial key `studio-v3-private-full-day` · Base €145 × 3 = €435 · Boat €30 × 3 = €90 (pending-review) · Total €525 · Stripe €525 (single session per token) · Destination "Setúbal · Azeitão · Sesimbra" · Stops: Mercado do Livramento, Azulejos de Azeitão, Bacalhôa Vinhos de Portugal, Castelo de Sesimbra · Pending review everywhere · No instant-confirmation copy · No alternative winery in confirmed itinerary · PDF disabled.

## 17. Completion report will include

Origin of €145 (§0), Studio commercial pricing key, Bókun mapping used (none — pending-review), authoritative boat source, quote-token fields, files changed, tests passed, golden fixture result, unsupported-guest-count behaviour, PDF/mobile status (deferred).
