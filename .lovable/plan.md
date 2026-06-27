## Scope (two changes, no other rebuild)

### 1) Stripe Embedded Checkout — native, branded, fast

Replace the full-page Stripe redirect with **Stripe Embedded Checkout** rendered inside a brand-styled drawer on our domain. The existing `FinalDetailsDialog` (Final details before payment) stays exactly as it is; only the step *after* it changes.

**Edge function (`supabase/functions/create-signature-checkout/index.ts`)**

- Add `uiMode?: "hosted" | "embedded"` (default `"hosted"` so nothing else breaks).
- When `embedded`:
  - `ui_mode: "embedded"`
  - `return_url: "<origin>/booking-confirmed?session_id={CHECKOUT_SESSION_ID}&tour=<tourId>"` (replaces `success_url`, no `cancel_url`).
  - Keep all existing price-resolution, metadata, terms acceptance, custom_text, and Bókun mapping logic untouched.
  - Response: `{ clientSecret, sessionId, bokunMapped, flow, publishableKey }`.
- Read `STRIPE_SANDBOX_PUBLISHABLE_KEY` / `STRIPE_LIVE_PUBLISHABLE_KEY` from env and include `publishableKey` in the response (so the client doesn't need its own env var per environment).

**New client component `src/components/checkout/BrandedCheckoutDrawer.tsx**`

- Uses `@stripe/react-stripe-js` (`EmbeddedCheckoutProvider`, `EmbeddedCheckout`) and `@stripe/stripe-js` `loadStripe` (already installed).
- Renders inside a right-side `Sheet`/`Drawer` (mobile = bottom sheet, desktop = right drawer), ivory background, gold rule, "YES Experiences · Secure checkout" eyebrow, Stripe + Apple Pay + Google Pay micro-label.
- Eager-prewarms `loadStripe()` on mount of `FinalDetailsDialog` so opening is instant.
- Shows a skeleton (no spinner) for the ~150–300ms initial Stripe iframe mount.

**Wire the three instant-book call sites** (all currently do `window.location.href = data.url`):

- `src/components/SimpleBookingForm.tsx` (Signature page Reserve)
- `src/routes/tours.$tourId.tailor.tsx` (Tailor flow)
- `src/components/studio-v3/StudioV3.tsx` (Studio reveal)

Each one: invoke the function with `uiMode: "embedded"`, receive `clientSecret`, open `<BrandedCheckoutDrawer>` instead of redirecting. On Stripe `complete` event, navigate to `/booking-confirmed?session_id=...` (existing route).

**Secrets required**

- `STRIPE_SANDBOX_PUBLISHABLE_KEY` and `STRIPE_LIVE_PUBLISHABLE_KEY` — I'll request these via `add_secret` after you approve (publishable keys are safe to expose but cleanest to store as secrets so we can swap envs).

### 2) Remove Viator-sourced attribution from public UI (keep the data, keep prices)

The **content** stays accurate — Signature pages remain source-of-truth to the matching Viator tours (per the canonical rule). Only **user-visible attribution and "Viator"-labelled UI** is neutralised.

Changes:

- `src/routes/tours.$tourId.tsx`
  - `ReviewsBlock` figcaption: drop the  `· via {source}` suffix entirely. Reviews show author + date only. Removes "via Viator" specifically (and the now-inconsistent "via Tripadvisor / via Google" labels per your earlier request to add — those were added before this neutrality pass; consolidating to no source label is the cleaner premium move).
  - `FALLBACK_REVIEWS`: remove the `source` field.
  - Gallery footer "Real photos · real stops" → "Real photos · real stops" stays (no Viator reference).
- `src/components/home/GuestQuotes.tsx`: keep "700+ five-star reviews across platforms" line as-is (already neutral) — no change needed.
- `src/routes/index.tsx`:
  - Homepage Signature cards: **keep `€{t.priceFrom}` price chip** (this is the booking-relevant signal you asked to preserve).
  - No other UI text references "Viator" today (the existing mentions are dev/code comments only — left untouched, they don't render).
- `src/components/PlatformBadge.tsx`: no UI changes (component already platform-neutral on render; "Viator" remains an internal data label, never shown unless explicitly used).

Out of scope:

- Internal data files (`signatureToursViator.ts`, `viatorUrlMatch.ts`, code comments) — these are not user-visible.
- `ItineraryTimeline`, `IncludedAndIdeal`, `HighlightsBlock`, `RouteMap` — these already render through `bookableIncluded` / our own neutral copy; data origin is internal and never labelled "Viator" on the rendered page.

## Technical details

- Embedded Checkout requires `clientSecret`, not `sessionId`, on the client. The function continues to return both for backward compatibility (`url` for legacy hosted, `clientSecret` for embedded). Default remains hosted so no other surface breaks until I migrate them.
- Drawer uses our existing `@/components/ui/sheet` (already in the design system); no new primitive.
- A11y: focus-trap inside the drawer, ESC dismiss, body scroll lock.
- Reduced motion safe.
- E2E: extend `e2e/instant-booking-checkout.spec.ts` to assert the drawer opens with `[data-checkout="embedded"]` and that a `clientSecret` is received (without actually paying).

## What I will NOT change

- Stripe products, prices, tax behaviour, metadata, Bókun mapping logic — same function, same DB tables.
- `FinalDetailsDialog` UI/fields.
- Studio V3 logic, signature tour data, route logic, prices.
- Builder checkout (`create-builder-checkout`) — only Signature/Tailor/Studio flow is in scope this round; I can do builder in a follow-up if you want.

## Files touched

- `supabase/functions/create-signature-checkout/index.ts` (extend, backward compatible)
- `src/components/checkout/BrandedCheckoutDrawer.tsx` (new)
- `src/components/SimpleBookingForm.tsx`
- `src/routes/tours.$tourId.tailor.tsx`
- `src/components/studio-v3/StudioV3.tsx`
- `src/routes/tours.$tourId.tsx` (ReviewsBlock figcaption + FALLBACK_REVIEWS only)
- `e2e/instant-booking-checkout.spec.ts` (assertion update)

Approve and I'll request the two publishable-key secrets, then ship.

also when curving out on tip of payment should be a card ou summary of the experience, in premmium design. After payment a confirmation page opens. Inside de website. Cliente receives email confirmation of the booking 