# Standardize WhatsApp prefills → English, page-specific

## Goal
Every `wa.me/351911889992` link opens with an English, page-aware prefill that identifies the source. Remove all Portuguese "Olá…" prefills. No visual/styling/palette changes — only the message text passed into `whatsappUrl()` / `whatsappHref()`.

## Canonical message catalog (English)
Central strings, one per surface:

- Generic FAB / footer / nav / about: `Hi YES — I'd like a hand planning my Portugal experience.`
- Support FAB (checkout-adjacent help): keep existing `Hi YES Experiences Portugal — I'd like a hand with my booking.` (already English).
- Signature tour page (`/tours/:tourId`): `Hi YES — I'm interested in the {Tour Name} and have a question.`
- Signature price card / tailor CTA: `Hi YES — I'm interested in the {Tour Name} and would like to tailor it.`
- Talk-to-a-local on tailor page: `Hi YES — I'd like to talk to a local about the {Tour Name}.`
- `/studio-v3` (all Studio v3 surfaces incl. LeadCaptureSheet, SignaturePriceCard fallback, StudioV3 host handoff): `Hi YES — I'm designing my day in the Studio and would like a suggestion.`
- `/multi-day` + MultiDayConcierge: `Hi YES — I'd like to plan a multi-day Portugal journey.`
- `/corporate` (if a WhatsApp link exists there; add one only if already present): `Hi YES — I'd like to plan a group/corporate day.`
- Studio v2 surfaces (PersistentChatFab, StudioBuilderChrome host chip, StudioV2 handoffs, HostHandoffPanel, FinalBookingPanel): English equivalents preserving name/region interpolation, e.g. `Hi YES — I just designed a day in {region} in the Studio and would like to refine it with a local designer.` / with-name variant `Hi YES — I'm {name}. I just designed a day in {region} in the Studio and would like to refine it with a local designer.`

All strings live in a new tiny module `src/lib/whatsapp-messages.ts` exporting typed builders (`waGeneric()`, `waSignature(tourName)`, `waSignatureTailor(tourName)`, `waTalkToLocal(tourName)`, `waStudioV3()`, `waMultiDay()`, `waCorporate()`, `waStudioV2Refine({name?, region?})`, `waStudioV2Handoff({name?})`). Keeps copy in one place for future audits.

## Files to edit (message text only)
- `src/components/WhatsAppFab.tsx` — replace `DEFAULT_TEXT` with `waGeneric()`.
- `src/components/studio-v2/PersistentChatFab.tsx` — English builder using `intent`/`total`.
- `src/components/studio-v2/StudioBuilderChrome.tsx` — replace `HOST_WA_MSG`.
- `src/components/studio-v2/StudioV2.tsx` — 4 PT strings → English equivalents (with/without name; region interpolation preserved).
- `src/components/studio-v2/conversion/HostHandoffPanel.tsx` — `greeting` → English.
- `src/components/studio-v2/conversion/FinalBookingPanel.tsx` — `Olá! Sou {who}` line → English.
- `src/components/studio-v3/StudioV3.tsx` (line ~3896) — `waStudioV3()`.
- `src/components/studio-v3/SignaturePriceCard.tsx` (lines ~1288, 1484) — `waSignatureTailor(tourName)` / `waSignature(tourName)`.
- `src/components/studio-v3/LeadCaptureSheet.tsx` — audit and use `waStudioV3()`.
- `src/routes/multi-day.tsx` — `waMultiDay()`.
- `src/routes/tours.$tourId.tsx` — ensure any WhatsApp CTA uses `waSignature(tour.title)`.
- `src/routes/tours.$tourId.tailor.tsx` — `waTalkToLocal(tour.title)`.
- `src/components/SimpleTailorForm.tsx` — English message including tour name if available, otherwise `waGeneric()`.
- `src/routes/index.tsx` (line 965) — already English; align wording to `waGeneric()` for consistency.
- `src/routes/about.tsx`, `src/components/Footer.tsx`, `src/components/Navbar.tsx`, `src/components/MobileStickyCTA.tsx`, `src/components/FloatingActions.tsx`, `src/components/checkout/TrustStrip.tsx` — pass `waGeneric()` (or keep TrustStrip's existing English support copy).
- `src/lib/drift/i18n.ts` — `wa.intro` value → English equivalent.
- `src/components/builder/types.ts` and `src/components/builder/v3/MultiDayConcierge.tsx` / `StudioDrift.tsx` — route to `waMultiDay()` or `waStudioV3()` per surface.
- `/corporate` route — grep for any existing WhatsApp link and swap to `waCorporate()`; do not add new CTAs if none exist.

Email template (`src/lib/email-templates/checkout-receipt.tsx`) and analytics files are left alone — no user-visible prefill there.

## Out of scope (unchanged)
- Button styling, positioning, colors, iconography, palette tokens.
- `whatsappUrl()` in `src/config/business-nap.ts` (helper stays as-is; number unchanged).
- Analytics events (`whatsapp_click` tracking untouched).
- Any non-WhatsApp copy.

## Verification
1. `rg -n "Olá|Ola!" src/` returns zero WhatsApp-related hits (only unrelated content, if any).
2. `rg -n "whatsappUrl\(|whatsappHref\(" src/` — every call site now passes a builder from `whatsapp-messages.ts` (or an inline English string on the two generic sites).
3. Manual spot-check via preview on `/`, `/tours/<one>`, `/tours/<one>/tailor`, `/studio-v3`, `/multi-day`, `/corporate`: click each WhatsApp affordance and confirm `wa.me/351911889992?text=…` decodes to the expected English string.
4. `nap-consistency` test still passes (only message argument changes).
