## Goal
Studio V3 should always end in the refined storytelling reveal + instant Stripe checkout — never the "Your Signature needs a human touch / Continue with a curator" hand-off, and never a lead-capture sheet as the primary Reserve path.

## Root causes (verified in code)

1. **Reveal fallback screen** — `src/components/studio-v3/StudioV3.tsx` lines 3616–3661 render a full-screen "Signature needs a human touch" apology with a `Continue with a curator` CTA (`onRefine → openLeadSheet("refine")`) whenever `validateResolvedSignature(...)` reports any hard-miss (no skeleton, no stops, missing title/image, etc.). This is the "speak to someone" screen the user is seeing.
2. **Checkout catch-all** — In `handleStripeCheckout` (lines ~999–1004), any thrown error, or a quote that isn't `"quoted"`, falls back to `openLeadSheet("book")` with a "Checkout unavailable" toast. Same for `requestStripeCheckout` when `tour` is null.
3. **Reserve path when tour is unresolved** — `requestStripeCheckout` opens the lead sheet immediately if `currentState.tourId` doesn't resolve to a real Signature.

The storytelling refine screen + `booking-quote-create-session` path already works (Signature/Tailor use it); Studio just short-circuits to a curator too eagerly.

## Changes

### 1. Remove the "human touch" fallback screen
`src/components/studio-v3/StudioV3.tsx` (lines 3614–3661): delete the `if (!revealValidation.ok) { return <…curator…/> }` block. Always render the cinematic reveal. Where a specific piece of data is missing, degrade gracefully in-place (e.g. skip hero if `tour.img` absent, hide the map layer if no geocoded stops) — never a full-screen apology.

### 2. Ensure a resolved Signature always exists before reveal
`src/components/studio-v3/curation.ts` `resolveStudioV3Route(...)`: when the current input can't resolve a Signature (missing feeling/companions/rhythm, or no journey match), fall back to a deterministic "best match" Signature from `signatureTours` (region → interest → first available) instead of the empty fallback. This guarantees `skeletonTourKey`, `routePoints`, `journeyTitle`, and `suggestedRouteLabel` are always populated with REAL tour data (no invention — pulls from `tour.stops` per the studio-v3-no-invented-stops memory).

### 3. Reserve CTA → always instant checkout
`StudioV3.tsx` `requestStripeCheckout` (line ~878): drop the `openLeadSheet("book")` short-circuit. If no tour resolves at Reserve time, use the same deterministic fallback from (2) so the guest always enters the storytelling → guest-details → embedded Stripe flow.

### 4. Checkout error path stays in Studio
`handleStripeCheckout` (line ~999): when the quote or session fails, surface the actual error via toast and keep the guest on the details step with a retry button. Do NOT open the lead sheet automatically. Same for the `pricing.status !== "quoted"` branch — surface the reason and let them adjust date/guests.

### 5. Copy sweep
Remove the "Continue with a curator" and "needs a human touch" strings entirely. Retain `LeadCaptureSheet` for the private-enquiry entry from the Occasions/Corporate path (unchanged), but Studio's Reserve funnel no longer opens it.

## Files
- `src/components/studio-v3/StudioV3.tsx` (remove fallback block, adjust reserve + error paths)
- `src/components/studio-v3/curation.ts` (deterministic Signature fallback)
- `src/components/studio-v3/validateReveal.ts` (relax to warnings-only; keep for logging)
- `src/components/studio-v3/__tests__/validate-reveal.test.ts` (update assertions)

## Validation
- Playwright at 393×588: run Studio with minimal answers → confirm refine screen renders, Reserve opens embedded Stripe (no lead sheet).
- Playwright: run Studio with full answers → confirm refine + reveal + Stripe as before.
- Unit: reveal validation returns `ok: true` with warnings for missing story/label; curation always returns a non-null `skeletonTourKey`.

## Out of scope
- No pricing/backend/edge-function changes.
- LeadCaptureSheet stays for Occasions/Corporate/Proposals paths per canonical rules.
