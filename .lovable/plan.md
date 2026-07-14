
## Scope
Four related fixes, in this order so we can verify each on the mobile preview before moving on:

1. Studio Refine (edits, actions, accordion, layout)
2. Studio Storytelling reveal (render, copy, pacing)
3. Checkout — Studio + Signature/Tour + Builder (CTA → drawer → submit → confirmation)
4. CTA motion pass — primary, secondary, ghost — site-wide, conversion-tuned

I'll target the 393px viewport first (per your Core memory), then adapt up.

## 1 · Studio Refine

**Problems observed**
- Edits reset on reopen — `state.editedRoutePoints` is held in memory only; `useStudioDraft` never persists it back through `studioDraftStorage`.
- Swap / remove / add actions error — updater in `setEdited` mutates from `editedRoutePoints ?? baseStops`, but `baseStops` is recomputed each render, so a stale closure can produce a stops list that fails `validateItineraryAfterReplacement` and drops the change silently.
- Accordion won't open/close on mobile — `<button>` inside a card that intercepts pointer events with a parent `onClick`; also expand arrow uses `⌄` glyph that varies per font. Needs a proper chevron + hit area escalation.
- Layout broken — Refine section currently ships as a large inline block inside StudioV3, not through `<RefineAccordion>`. Migrate to `RefineAccordion` + `RefineStopCard` list (the primitives already exist and were built for this).

**Changes**
- `studioDraftStorage.ts`: add `editedRoutePoints` to the persisted schema (nullable array of `{label, story}`), version-bump, migrate legacy drafts to `null`.
- `useStudioDraft.ts`: read/write the new field.
- `StudioV3.tsx`: replace the inline stops editor at ~L4140–4250 with `<RefineAccordion open onOpenChange count>` wrapping a list of `<RefineStopCard>` (swap / remove) plus a compact "+ Add a moment" affordance that reuses `swapPool`. Guard `setEdited` against invalid resulting itineraries by rolling back and toasting.
- `RefineAccordion.tsx`: swap the `⌄` glyph for a real inline SVG chevron; make the whole header row a `role="button"` with 48px min-height; ensure `hidden` toggle uses CSS max-height + opacity so the animation runs on mobile (respect `prefers-reduced-motion`).

## 2 · Studio storytelling reveal (`FinalRevealStory`)

**Problems observed**
- Blank render when `resolved.routePoints` is thin or add-ons haven't loaded — the reveal early-returns silently.
- Copy leans generic ("Make this my story in Portugal") — feels templated; drop italic templated leads (per Homepage italic policy carried over as brand tone).
- Chapter reveals stutter on mobile due to per-chapter `IntersectionObserver` + parallel image decodes.
- Scroll gets trapped when the "See what's included" details block auto-scrolls into view on open.

**Changes**
- Add a fallback shell inside `FinalRevealStory` when `composedStops.length === 0` — render the parchment hero + a short editorial "your day is being composed" state instead of returning null; log to `client_error_logs` for observability.
- Rewrite the two CTA labels + intro line in `signature-day-copy.ts` to editorial voice (upright, no italic templated line). Approved copy suggestions inline; final wording will be reviewed on-screen.
- Replace per-chapter IO with a single container IO + CSS `animation-delay` stagger for cheaper paints; cap total sequence at ~450ms.
- Remove the auto-scroll on inclusion open; the accordion expands in place. Add `content-visibility: auto` on off-screen chapters.
- Reduced-motion path: no parallax, no stagger, opacity only.

## 3 · Checkout flows (Studio · Signature · Builder)

**Problems observed**
- "CTA does nothing" — Studio Reveal / Signature Book buttons occasionally no-op because `checkoutPending` from a previous failed attempt never resets on unmount, and Signature `BandedSignatureBookingForm`'s submit handler swallows Bokun errors.
- Drawer opens but submit fails — `create-signature-checkout` and `create-builder-checkout` return non-2xx on missing `customerEmail`, but the drawer submit handler doesn't surface the error to the user.
- Wrong price / summary — Studio summary reads `pendingGuestDetails.guests` but `selectedAddOnsTotalEur * g` double-multiplies per-pax add-ons already priced per pax (`~L2790`); Signature drawer reads `priceFrom` instead of `resolvePerPaxEur` when tier data is present.
- Confirmation never arrives — `/booking-confirmed` route reads `session_id` but the stripe-webhook doesn't always mark the booking as confirmed before redirect; add polling on the confirmation page via `stripe-session-status` edge fn.

**Changes**
- `StudioV3.tsx`: reset `checkoutPending` on `checkoutOpen → false` and on unmount; wrap `handleStripeCheckout` in `try/finally` that always clears pending. Fix the double-multiply in the reserve summary (add-ons already per-pax) — remove the `* g` on `selectedAddOnsTotalEur`.
- `BrandedCheckoutDrawer.tsx`: surface submit errors via `toast.error` and re-enable the primary CTA on failure.
- `BandedSignatureBookingForm.tsx`: guard-rail Bokun error path; use `resolvePerPaxEur(tour, guests, tourPriceTiers)` for the visible total.
- `create-signature-checkout` + `create-builder-checkout` edge fns: return structured `{error, code}` JSON on validation failures instead of 400 text; add `Access-Control-Allow-*` on error responses.
- `booking-confirmed.tsx`: poll `stripe-session-status` up to 8× at 750ms until `payment_status === "paid"`, then render success; show a graceful "processing" state during polling instead of "Not found".
- Add `client_error_logs` breadcrumbs at every checkout failure edge.

## 4 · CTA animation pass (site-wide, conversion-tuned)

**Approach**
- Centralise in `src/components/ui/CtaButton.tsx` (already the canonical primitive per your memory). Add three motion variants keyed off `variant` prop: `primary`, `secondary`, `ghost`.
- Motion budget: `≤220ms`, `cubic-bezier(0.2, 0.7, 0.2, 1)`; disabled under `prefers-reduced-motion`.
- Primary: gold sheen sweep (already approved for `.home-energy`) — promote to any `variant="primary"` via a scoped `.cta-primary` utility (not `.home-energy`), plus `-3px` lift and shadow ramp on hover, `scale(0.98)` on `:active` for tactile feedback.
- Secondary: gold hairline draws in from left → right on hover, arrow ramps 4px on hover, no lift.
- Ghost: underline draw (existing `.story-link` pattern) + arrow ramp; no fill change.
- Loading state: `BookingCtaSkeleton` already exists — use it in place instead of disabling the button silently, so users see progress on slow networks.
- Focus-visible ring uses `--gold` at 2px offset — matches A11y guardrail.
- Audit call sites: replace hand-rolled `<button>` CTAs on Studio reveal, Signature booking, Builder checkout, Corporate contact, and Journal subscribe with `<CtaButton>`.

## Technical notes
- No new dependencies. All Motion via CSS transitions + existing `framer-motion` where already imported.
- No changes to Supabase schema. Only edge-function response shape hardening.
- No new copy invented for tours/stops (per `no-invention` rule) — copy edits are limited to Studio reveal micro-copy and CTA labels.
- Test coverage: extend `studio-v3/__tests__/visible-price-convergence.test.ts` for the add-on double-multiply fix; add a smoke test for `RefineAccordion` open/close.

## Verification (per section)
- Mobile viewport 393×588 via Playwright: refine → edit stop → reload → edit persists.
- Studio reveal: composed stops render; reduced-motion path opacity-only.
- Studio + Signature + Builder: full click-through to Stripe embedded checkout, then simulated `/booking-confirmed?session_id=` polling.
- CTA pass: visual diff on home, tour page, studio reveal, builder summary at 393px.
