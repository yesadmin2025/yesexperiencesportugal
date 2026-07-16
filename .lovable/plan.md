## Final Pre-Launch QA & Correction Pass

Scope: exhaustive audit + safe corrections across Signature, Tailor, Studio, checkout, pricing, composition, responsive, motion. No new features, no redesign, no SEO.

### Phase 1 — Read-only audit (no code changes)

Build a written findings register before touching code. Deliverable per finding: severity (CRITICAL/HIGH/MED/LOW), file path, reproduction, proposed fix, risk.

1. **Product-mode integrity** — trace `flow: 'signature' | 'tailor' | 'studio'` from selection → resolved journey → `create-signature-checkout` payload → Stripe metadata → confirmation. Files: `useResolvedJourney.ts`, `SignaturePriceCard.tsx`, `create-signature-checkout/index.ts`, tour detail + tailor + Studio V3 reveal.
2. **Traveller composition** — audit every entry surface (`SimpleBookingForm`, tailor, `GuestDetails`, checkout drawer, resume) uses `TravellerComposition {adults, minorAges[]}` end-to-end. Look for legacy `guests`-only leaks via `hydrateLegacyComposition`.
3. **Child pricing truth** — cross-check `signatureTourPricing.ts` age bands (adult 100 / youth 75 / child 50 / infant 0), `tour_price_tiers`, `tour_available_add_ons` child rules. Flag any tour/add-on where child rule is missing → must surface "manual confirmation" not silent adult price.
4. **Single source of truth** — grep for `* guests`, `* adults`, `priceFrom *`, `Math.round(.../guests)` outside `useResolvedJourney`. Any independent recompute in cards/Refine/Story/summary/checkout is a finding.
5. **Per-person display** — locate every "per person / pp / /guest" label. Rule: mixed adult+child parties must show "Average per guest" OR split OR hide. Flag every unlabeled adult-price-as-per-person.
6. **Live reactivity** — Playwright: change adults, add minor, edit age, toggle add-on, swap winery → assert total/breakdown/checkout drawer update in same frame.
7. **Checkout server authority** — verify `stripe-session-status` / `create-signature-checkout` recomputes server-side and client blocks on mismatch. Currently unknown — audit and add guard if missing.
8. **Checkout responsive fit** — Playwright screenshots at 375/390/430/768/1024/1280/1440 on `/checkout/$token`. Check modal width, sticky CTA reachability, Stripe element cropping, keyboard-obscured fields (mobile emulation).
9. **Route-wide responsive** — same viewport matrix across Signature listing, detail, Tailor, Studio questionnaire/map/Refine/Story, summary, confirmation. Screenshot diff, flag overflow / word-per-line wraps / shrunk-to-hide-problem typography.
10. **Motion QA** — with the recent marketing-motion elevation (18px/4px blur/420ms), sweep every public route for: replay loops, layout shift, hidden-after-failed-observer, mobile transform breaks, `prefers-reduced-motion` respect.
11. **CTAs & navigation** — grep for stale "Make it yours" in Signature contexts, dead buttons, hover-only mobile states, duplicated submit handlers.
12. **State persistence** — back nav, refresh, Tailor edits, Studio refinements, checkout return, payment retry — confirm no dropped minors/stops/add-ons via draft persistence layer (`useBuilderPersistence`, `studio_drafts`).
13. **Edge cases** — 0 adults, missing/invalid child age, unavailable add-on/winery, over-duration route, stale quote, payment fail/cancel, network drop, double-click, back-during-checkout. Confirm each produces a customer-facing message.
14. **Frontend hygiene** — dev-server + Playwright console for React warnings, hydration mismatches, missing keys, failed assets, listener leaks.

Tools used in Phase 1: `rg`, `code--view`, Playwright scripts under `/tmp/browser/`, `bunx vitest run` for the existing add-on/pricing/reveal suites, `supabase--read_query` for tier + add-on rows.

### Phase 2 — Safe corrections

Only after the register is complete. Grouped by risk:

- **A. Non-controversial fixes** (typos, unlabeled per-person → "Average per guest", missing `aria-label`, mobile overflow via `min-w-0`/`shrink-0`, listener cleanup, missing keys, motion replay guards).
- **B. Pricing display fixes** — route every remaining recompute through `useResolvedJourney`. Add "manual confirmation" state where child pricing is missing rather than silent adult fallback.
- **C. Checkout guardrails** — client refuses submit when local `resolvedQuote.total !== serverQuote.total`; show refresh CTA. Only added if audit shows the guard missing.
- **D. Responsive fixes** — grid `[minmax(0,1fr)_auto]`, `min-w-0`, `shrink-0`, sticky-CTA lift already at 72px; extend where audit finds overlap. No typography shrink-to-fit.
- **E. Motion consistency** — align stragglers to the marketing `data-motion="fade-up"` primitive already standardized. No new keyframes.

Every fix runs through the existing gate suites (`studio-checkout-gate`, hero visual, cta parity, add-on totals, reveal walkthrough) before it's considered done. Baselines are only updated when the audit proves the baseline itself is wrong; otherwise the fix conforms to the baseline.

### Phase 3 — Test matrix execution

Playwright-drive the 14 scenarios from §18 against the running dev server, capture screenshots + network payloads (including the Stripe session request body from `instant-booking-checkout` helpers), and record pass/fail per scenario across composition / itinerary / duration / breakdown / total / checkout / confirmation columns.

### Phase 4 — Final report

Return the 17-point report from §20, ending with `READY FOR RELEASE` or `NOT READY FOR RELEASE` + exact blockers.

### Explicit non-goals
Approved copy, business rules, child pricing rules, canonical URLs, sitemap, metadata, schema strategy, search, content clusters, backend refactors unrelated to a found bug. No SEO work.

### Ask before I start
This is a multi-hour pass with real potential to touch 30+ files. Two calibration questions:

1. **Correction depth** — should Phase 2 auto-apply all A/B/D/E fixes and only pause for C (checkout server-authority guard, which changes payment flow)? Or pause after Phase 1 register so you approve each severity tier?
2. **Test matrix coverage** — payment fail/retry (scenario 13) needs Stripe sandbox interaction end-to-end (not just session creation). OK to drive Stripe's test card `4000 0000 0000 0002` through the live sandbox from Playwright, or keep it at "session created + redirect asserted" like the current `instant-booking-checkout.spec.ts`?
