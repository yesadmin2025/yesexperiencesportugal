# Studio Post-Builder Flow — Corrected Order (v2)

Change from previous plan: **all "to be confirmed" / "pending" / "TBC" language removed everywhere.** Date selection already guarantees availability, so every stop and add-on shown is confirmed instantly.

## Canonical phase order

```text
refine (compose signature + add-ons + prices)
  → finalReveal (cinematic story of THEIR day, add-ons woven in)
     → guestDetails (name / email / phone / notes)
        → checkoutSummary (compact recap + download one-pager)
           → payment
```

## 1. Rename phase and reorder

- `types.ts` `StudioV3Phase`: rename `finalSignature` → `finalReveal`, add `checkoutSummary`.
- `curation.ts` `LINEAR_ORDER` / `PHASE_ORDER`:
  `intro → questionnaire → curation → storyboard → refine → finalReveal → guestDetails → checkoutSummary → payment`.
- Migration: `confirmation | finalSignature → finalReveal`.

## 2. Availability + confirmation language

- Remove `isPending`, `PENDING_HEADER`, `STATUS_ROUTE_PREPARED`, and any "To be confirmed with your designer" copy from `signature-day-copy.ts`, `finalItinerary.ts`, `TimelineView.tsx`, `signatureAddOns.ts`, and the reveal/checkout/email templates.
- `finalItinerary.ts` still splits `routeStops` (validated coordinates only) vs `finalTimelineEntries` (all confirmed entries), but there is no pending flag or pending group. If an add-on can't resolve to a stop, it stays inline in the timeline as a confirmed narrative beat with no map pin — never labelled pending.
- Add-ons that require date-specific availability are gated in Refine: if unavailable for the chosen date they are hidden or disabled with plain copy ("Not available on 12 May — try another date"), not carried forward as "pending".
- Inclusions section on Reveal and Checkout has two groups only: **Included** and **Your additions**. No third "to be confirmed" group.
- Reassurance copy replaces the removed status line: *"Instant confirmation. Your date is held the moment you reserve."*

## 3. Final Reveal (`FinalRevealStory.tsx`, new)

Live state only.

- Opening frame: hero + title *"Your story in Portugal"* + one-line proposal sentence + discreet date/party meta.
- Story body: chaptered narrative from `finalTimelineEntries`, add-ons woven in as confirmed beats.
- Route ribbon: small inline map, `routeStops` only, no controls.
- Collapsible *"See what's included"* (`<details>`, closed by default): Included + Your additions + canonical total. Only place on this page with prices.
- No admin chrome, no "YES Approved", no comparison prices, no stepper above the fold, no "pending" or "to be confirmed" anywhere.

CTAs (mobile sticky bottom, desktop right-rail):
- Primary (gold fill): **"Make this my story in Portugal"** → `guestDetails`.
- Secondary (ghost teal): **"Save my signature"** → persists state; toast "Saved to your journey".
- Tertiary text link: **"Back to refine"**.

## 4. Guest Details (`GuestDetailsStep.tsx`, adjusted)

- Header: *"A few details to hold your story"*.
- Collapsed live summary strip (name, date, guests, total).
- Fields: name, email, phone, notes.
- `guestDraft` persists on blur + 400ms debounce; survives back nav.
- **Email-blur auto-send**: valid `.email()` + 800ms debounce → `sendSignatureStoryEmail` fires ONCE per `(email, signatureId)`. Dedupe map in `state.emailedSignatures`. Typo correction resends once to the corrected address. Inline confirmation *"Sent to name@…"*.
- Continue → `checkoutSummary`.

## 5. Checkout Summary (`CheckoutSummary.tsx`, new)

- Header: *"Ready to reserve"*.
- Tour summary card: name, date, party, pickup, language, canonical duration, inclusions + additions, canonical total (same selectors as `SignaturePriceCard`).
- **Download the signature** → client-side one-pager PDF: date, guests, price, inclusions. No narrative (narrative goes by email).
- Guest details recap with Edit link.
- Reassurance: *"Instant confirmation the moment you reserve."*
- CTA: **"Reserve and pay"** → existing Stripe flow, untouched.

## 6. Email pipeline

- **Signature Story email** (new `src/lib/email-templates/signature-story.tsx`) — editorial layout mirroring Reveal: hero, chaptered narrative, small map, inclusions collapsed, price at bottom. Subject: *"Your story in Portugal, {name}"*. No "to be confirmed" language.
- Server fn `sendSignatureStoryEmail({ email, signatureId, snapshot })` — snapshot frozen at send time.
- Dedupe via `email_send_log` idempotency key = `signatureId`.
- Booking confirmation email unchanged.

## 7. Files

**New**
- `src/components/studio-v3/FinalRevealStory.tsx`
- `src/components/studio-v3/CheckoutSummary.tsx`
- `src/components/studio-v3/finalItinerary.ts` (+ `.test.ts`)
- `src/components/studio-v3/signatureOnePagerPdf.tsx`
- `src/lib/email-templates/signature-story.tsx`
- `src/lib/studio/sendSignatureStoryEmail.functions.ts`
- `e2e/studio-v3-flow-mobile.spec.ts` — 393×852 walkthrough refine → reveal → email blur → checkout → download

**Edited**
- `StudioV3.tsx` — phase map, remove `ConfirmationPause`, add `finalReveal` + `checkoutSummary` branches
- `types.ts`, `curation.ts` — rename + reorder + `savedSignatures`, `emailedSignatures`, `guestDraft`; drop `isPending`
- `GuestDetailsStep.tsx` — collapsed summary, email-blur auto-send, dedupe
- `SignatureDayReveal.tsx` — refine-stage primary CTA becomes *"See my final story"* → `finalReveal`
- `StudioV3ProgressStepper.tsx` — new step labels
- `signature-day-copy.ts` — remove pending tokens; add `REVEAL_TITLE`, `CTA_MAKE_STORY`, `CTA_SAVE_SIGNATURE`, `CHECKOUT_HEADER`, `EMAIL_SENT_INLINE`, `INCLUSIONS_TOGGLE`, `INSTANT_CONFIRMATION`
- `TimelineView.tsx`, `signatureAddOns.ts`, `RefineStopCard.tsx` — strip pending states/chips; date-availability gating in Refine
- Any test asserting "To be confirmed" text — updated

**Removed**
- `ConfirmationPause.tsx` from chain

## 8. State-preservation guarantees

- Back nav Refine ↔ Reveal ↔ Guest Details ↔ Checkout keeps all edits.
- `guestDraft` and `emailedSignatures` persist across those transitions.
- Reveal, email, and Checkout derive from the same live `state` selectors.
- `savedSignatures` → Supabase for signed-in users, `localStorage["studio.v3.saved"]` for guests.

## 9. Out of scope

Stripe math, feasibility engine, questionnaire, nav, brand tokens, booking backend, production data.

## Confirm before I implement

1. Save-my-signature for guests: localStorage OK, or sign-in required?
2. One-pager PDF client-side (`@react-pdf/renderer`) OK, or server-generated signed URL (needed only if you also want it attached to the confirmation email)?
