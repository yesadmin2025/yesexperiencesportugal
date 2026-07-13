# Studio V3 — Manual QA checklist (launch gate)

Run this on real hardware before flipping the publish switch. Two testers, two devices minimum.

## Devices (required)
- iPhone 12 or newer, iOS Safari, PT and EN system locales
- Android (Pixel 6+ or S23+), Chrome, PT and EN system locales
- Desktop Chrome 1440×900 (sanity only)

## 1. Draft hydration
- [ ] Open `/studio-v3`, answer through *destination*, close tab.
- [ ] Reopen `/studio-v3` in the same session → toast **"Draft restored"** appears **once**, correct phase.
- [ ] Refresh → no toast, same phase.
- [ ] Open in a fresh incognito window → toast appears once.
- [ ] Clear localStorage → intro loads, no toast, no console noise.

## 2. Saved-link precedence
- [ ] Copy a saved-link URL, open in a browser that has a local draft → saved-link wins, no "Draft restored" toast.
- [ ] Break the token (add a char) → visible "we couldn't find that" state, no white screen.

## 3. Full happy path (do this twice: guided + tailored)
- [ ] Intro → Feeling → Destination → Who → Occasion → Date → Pickup → Guests → Interests → Rhythm → Considerations → Language → Investment → Map → Storyboard → Confirmation → Guest details → Checkout summary → Stripe test-card.
- [ ] Sticky CTA total, SignaturePriceCard total and CheckoutSummary total are identical at every step.
- [ ] All copy is Fraunces headings + Inter body. No Georgia/Cormorant/Newsreader fallback (check console for `[font-fallback]` warnings).

## 4. Add-ons
- [ ] Toggle each add-on on and off — total recomputes in the same frame.
- [ ] Reroll to a different Signature tour → ineligible add-ons vanish, total recomputes, no ghost line items.
- [ ] Route points only ever come from the resolved Signature tour (spot-check against Viator page for that tour).

## 5. Real integrations
- [ ] Bokun quote round-trip on **two** signature tours (one Douro, one Lisbon).
- [ ] Stripe test-card `4242 4242 4242 4242` completes and returns to confirmation.
- [ ] Stripe decline card `4000 0000 0000 0002` surfaces an inline error, doesn't clear draft.
- [ ] WhatsApp fallback link opens the correct number and pre-filled message.
- [ ] Email confirmation lands within 60 s, Fraunces + Inter render, links open the correct routes.

## 6. Accessibility on real devices
- [ ] iOS VoiceOver announces "Draft restored" once.
- [ ] Focus never gets trapped after a phase transition (Tab reaches the primary CTA).
- [ ] All CTAs are ≥ 44×44 tappable.
- [ ] Contrast passes for gold text on ivory (`--gold` on `--ivory`) — verify with the Chrome contrast script or eyeball on real device.

## 7. Language + locale
- [ ] Full PT read-through by a native Portuguese speaker — no `key.not.found` strings, no English leakage.
- [ ] Currency renders as `€` with the correct thousands separator for the active locale.

## 8. Reduced-motion + slow network
- [ ] macOS/iOS "Reduce Motion" on → homepage-scoped parallax/sheen disabled; Studio transitions still readable.
- [ ] Chrome DevTools "Slow 3G" → skeletons appear, no layout thrash, no white screen.

## Sign-off
- Tester 1: ______________________  Date: __________
- Tester 2: ______________________  Date: __________
- Approver: ______________________  Date: __________
