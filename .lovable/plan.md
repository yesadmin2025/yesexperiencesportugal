## Verification report — everything the recent plans promised is already live

Ran a full audit against the repo. No implementation gaps found. Below is the checklist tied to the specific files that prove it, so you can trust the status without a re-shipping pass.

### Booking / pricing truth
- **Per-person + Party total labels** — `src/components/SimpleBookingForm.tsx` (lines 370–389), `src/routes/tours.$tourId.tailor.tsx` (1557, 1568), `src/routes/tours.$tourId.tsx` (338), `src/routes/experiences.tsx` (197).
- **Child pricing broken out when minors present** — `SimpleBookingForm.tsx` uses `hasMinors` + `journeyPricing.lines` to render adult vs. child line items (373–393).
- **Availability + 24h lead-time** — `src/lib/availability.ts` exists; SimpleBookingForm shows the "Pick a date at least 24h from now" toast (418).

### Contrast / selection form
- **CompositionField (party & minors)** — `src/components/booking/CompositionField.tsx`: labels at 62%/55% charcoal, borders at 28% charcoal, age chips text at 82% charcoal, focus ring gold. Meets AA on ivory.
- **`--gold-ink` token** — `src/styles.css:113` (`#8A611F`); rating badges on `experiences.tsx` use it.

### Motion system (all approved batches shipped)
- **Foundation** — `Scene`, `RouteFade`, `RevealImage`, `CtaSentinel`, `ChapterLead`, `ReadingProgress` in `src/components/motion/*`; `__root.tsx` wraps `Outlet` in `RouteFade` and hosts the hydration gate.
- **Applied routes** — motion primitives imported across 11 route files: `__root`, `about`, `contact`, `experiences`, `local-stories.index`, `local-stories.$slug`, `press`, `review.$token`, `reviews`, `tours.$tourId`, `unsubscribe`.
- **Signature detail** — itinerary uses `Scene` + `.scene-item` per chapter (`tours.$tourId.tsx` 496+).
- **Local Stories article** — `ReadingProgress` bar, `RevealImage motion="mask"` hero, `Scene` on related-Signature aside.
- **Booking confirmed** — `motion-check-in` on success icon (149).
- **Studio v3 §0 exclusion** — no motion imports in `studio-v3.tsx` (confirmed).
- **Ken-burns viewport gate** — `IntersectionObserver` in `GuestMomentsStrip.tsx` (57–62); pauses off-screen images.

### Map & misc
- **Leaflet attribution removed** — `SignatureRouteMap.tsx:112` `attributionControl: false`.
- **CSS guardrail** — `bun run check:css` wired into both `predev` and `prebuild` (`package.json:7,9`); currently passing.

### Verdict

Status: **ALL RECENT PLANS FULLY IMPLEMENTED.** No code changes required.

### Optional follow-ups (not part of any approved plan — say the word if you want any)
1. Add `Scene` per paragraph on Local Stories articles for a slower, more editorial reading rhythm (currently only hero + aside animate).
2. `ChapterLead` intro block above the Signature itinerary (large gold numeral + eyebrow) to visually separate the chapters section.
3. `CtaSentinel`-driven emphasis on the sticky "Reserve" bar (extra arrow travel when the primary CTA scrolls off-screen).

If you approve this plan, I'll switch to build mode and simply confirm the audit — nothing to change. If you want any of the three optional items, approve and tell me which; I'll ship only those.
