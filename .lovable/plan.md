## Final Launch Pass — one sweep, no follow-up plans

Goal: run a single end-to-end audit of the live site across the six areas you named, fix every defect found, and prove it with the guard suites already in the repo. Nothing left open.

### Method

For each area: audit against the current build (mobile 393px first, then tablet/desktop), list concrete defects, fix them, re-run the relevant guards. I fix as I go — no intermediate approvals.

### 1. Typography
- Sweep every route for the two-family rule (Fraunces headings + italic emphasis, Inter body/UI). Any Georgia/Cormorant/Montserrat/system fallback left in components, e2e expectations or CSS gets replaced.
- Run the runtime font-fallback detector across all public routes and fix every `[font-fallback]` warning.
- Check heading scale/weight consistency per route (homepage H2 medium exception preserved), line-height and tracking on H1/H2, and long-form measure on /about and Local Stories.
- Guards: `typography-regression`, `hero-typography-fontload`, `studio-v3-p0-typography-two-family-mobile`.

### 2. Consistency & spacing
- Section rhythm audit: every marketing section at `py-16` mobile / `py-24` desktop, consistent container widths, consistent eyebrow → title → body → CTA spacing via the canonical primitives (`Eyebrow`, `SectionTitle`, `CtaButton`, `EditorialCard`). Hand-rolled duplicates get swapped to the primitives.
- Card grids: equal-height rows, no orphaned meta lines at 360px, tap targets ≥44px everywhere.
- Chrome consistency: header, footer, sticky CTAs, switchers (language/currency) identical across routes and locales.
- Guards: `homepage-typography-spacing-regression`, `homepage-structure`, `footer-logo-proportions`, `chrome-runtime-contrast`, `site-brand-audit`.

### 3. Animations
- Verify the motion system is uniform: entry fade + 12–16px rise, hover lift −2px, image zoom 1.02–1.04, ≤220ms outside the homepage; homepage `.home-energy` overrides stay scoped.
- Remove any leftover abrupt image switches (soft crossfade only), any bounce/spring, any motion that fires above the reduced-motion guard.
- Confirm `prefers-reduced-motion` fully neutralises reveals, parallax, Ken Burns and sheen.
- Guards: `check-motion-budget`, `marketing-italic-emphasis-visual`, `hero-v4-reveal`, `hero-crossfade`.

### 4. Checkout
- Walk all three instant-book paths end to end on mobile: Signature "as designed", Tailored Signature, Studio V3 reveal — from selection to a real Stripe session.
- Verify the amount shown in `ChargeSummaryLine` equals the amount Stripe charges, in every case: adults only, mixed adult/youth/child/infant, add-ons on/off, stop removals, lunch removal credit, currency toggle EUR/USD.
- Verify guest-details validation, idempotency on double-submit, cancel/return URLs, booking snapshot written on success, and the confirmation + admin notification emails.
- Guards: `instant-booking-checkout`, `instant-booking-checkout-negative`, `checkout-price-parity`, `studio-v3-e6-submit-checkout-idempotency`, `pricing-ssot`, `tier-pricing`, `age-band-pricing`.

### 5. Prices
- Reconcile every displayed price against `src/config/pricing.ts` as single source of truth — Signature cards, tour pages, Tailor, Studio, /experiences, sitemap-linked landing pages.
- Confirm the 15% direct baseline, per-stop-removal logic and age bands are applied identically everywhere, that no page hardcodes a number, and that USD conversion labels are consistent.
- Cross-check against the Viator source-of-truth table (`test:sot-parity`).

### 6. SEO
- Re-validate sitemap (every `<loc>` 200 + indexable), robots, canonical/og:url self-reference, reciprocal hreflang, and JSON-LD (Organization, WebSite+SearchAction, Product/Offer/AggregateRating, FAQPage, BreadcrumbList, Itinerary) on rendered HTML, not source.
- Confirm one H1 per route, unique title <60 / description <160 on every content route, og:image tied to the route hero.
- Re-run the SEO scanner at the end and close anything that resurfaces.
- Guards: `sitemap-robots-canonical`, `jsonld-rendered`, `hreflang-reciprocity`, `review-certificate-sync`.

### 7. Copy
- Full-site read-through against brand voice: US-EN spelling, sentence case body, no banned words (amazing, best, luxury-as-adjective, unforgettable), no emojis or exclamation marks, CTA vocabulary from the approved library only.
- "Experience Investment" wording in pricing surfaces; `YES — …` voice on confirmations/progress/completion.
- PT locale parity for every paired path.
- Guards: `copy-parity`, `cta-vocabulary-lock`, `sticky-cta-copy`, `brand-audit`, `i18n-check`.

### Final gate before I report done
`bun run lint` · `tsgo` typecheck · `bunx vitest run` (full unit suite) · full Playwright run · `bun run prebuild` guardrails · security scan. Every one green, or I keep fixing until it is.

### Deliverable
A single closing report listing what was broken, what I changed, and the final green status per suite — plus publish when it's all clean.

Technical notes: work stays in frontend/presentation plus the pricing/SEO config already established as SSOT; no schema changes unless a checkout defect requires one, and no brand token repointing.
