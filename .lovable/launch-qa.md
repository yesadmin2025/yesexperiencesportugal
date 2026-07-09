# Launch QA Checklist — Phase 3

Run this manually on the mobile viewport (393×588) before publishing. Automated smokes cover the critical labels; this catches the rest.

## Content & copy
- [ ] Homepage hero copy matches locked script (no drift, no placeholder)
- [ ] No "Lovable" or "Generated Project" strings anywhere
- [ ] Every route <title>/meta description is unique and app-specific
- [ ] No invented stops, prices, or partners on Signature/Tailor pages

## CTA vocabulary (locked)
- [ ] Signature primary: **Check availability & reserve**
- [ ] Signature secondary: **Tailor this day**
- [ ] Studio V3 step 1: **Review route & price**
- [ ] Studio V3 final: **Reserve securely**
- [ ] Bespoke draft: **Resume your draft**

## Trust & checkout
- [ ] `/checkout/$token` shows TrustStrip above submit
- [ ] Tour detail page shows TrustStrip below price
- [ ] Signature FinalBookingPanel shows TrustStrip above CTA
- [ ] "Licensed operator RNAAT 31/2023" visible on all three
- [ ] WhatsApp link opens `wa.me/351...` in a new tab

## Reviews
- [ ] Each review card has a clickable source badge (Tripadvisor/Google)
- [ ] Badge opens original review in a new tab with `rel="noopener"`
- [ ] Tap target ≥ 44×44 on mobile
- [ ] Horizontal swipe on carousel does NOT trigger badge navigation
- [ ] Missing sourceUrl → non-interactive span (no dead link)

## Mobile chrome
- [ ] MobileStickyCTA does not cover the WhatsApp FAB (72px lift)
- [ ] Sticky CTA never covers footer, FAQ, or Signature card CTAs
- [ ] Signature cards scroll horizontally with next-card peek
- [ ] Reviews carousel: one card per snap, no autoplay
- [ ] No back-to-top button on <640px viewports

## Accessibility
- [ ] Every icon-only button has `aria-label`
- [ ] FinalDetailsDialog and SimpleBookingForm submit on Enter
- [ ] StudioV3ProgressStepper: Arrow/Home/End keyboard nav works
- [ ] Focus-visible gold ring on every interactive element
- [ ] `prefers-reduced-motion`: home reveals + hero parallax disabled

## Analytics (GTM · GTM-M82SQS79)
- [ ] `dataLayer` present in DevTools console
- [ ] Click Signature Reserve → `signature_reserve_click` fired
- [ ] Click Tailor → `signature_tailor_click` fired
- [ ] Enter checkout → `checkout_started` fired
- [ ] WhatsApp link → `whatsapp_click` fired
- [ ] Mailto link → `email_click` fired

## SEO / performance
- [ ] Hero poster preloaded (`<link rel="preload" as="image">`)
- [ ] All below-fold images have `loading="lazy" decoding="async"`
- [ ] Every `<img>` has `width` + `height` (no CLS)
- [ ] Sitemap includes every public route, no dev/preview routes
- [ ] `robots.txt` allows crawl of production only

## Payments (TEST MODE)
- [ ] Stripe checkout completes in test mode end-to-end
- [ ] Success redirect fires `payment_success`
- [ ] Cancel redirect returns to draft with data intact
