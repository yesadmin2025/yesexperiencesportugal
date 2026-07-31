## Status check (already verified this turn)

- `e2e/hero-copy.spec.ts` + `e2e/hero-copy-byte-exact.spec.ts` — **42/42 passing** on mobile, tablet and desktop. The sr-only probes in `CinematicHero` already render every `HERO_COPY_SPEC` field byte-exactly, so no hero copy work remains.
- Homepage `<html lang>` is already set dynamically in `__root.tsx`; the sitemap route already deliberately excludes the redirect-only slugs the scanner flagged. Those SEO findings come from a **stale** scan (last run 2026-07-28, older commit).
- Homepage H1 stays as approved locked copy (your call) — the H1 SEO finding will be left failing on purpose, with a note.

## 1. Checkout — end-to-end validation

- Run the full checkout suite on all three viewports (mobile/tablet/desktop), not just mobile: `checkout-price-parity`, `instant-booking-checkout`, `instant-booking-checkout-negative`, `studio-v3-e6-submit-checkout-idempotency`, `pricing-ssot`.
- Verify price parity end-to-end: Studio total → `ChargeSummaryLine` → Stripe session amount, including currency toggle (EUR/USD) and traveller-composition tiers (adult/child).
- Confirm booking snapshot writes on payment success and that the confirmation screen reads from the snapshot.
- Re-check the negative paths: expired/cancelled session, double-submit idempotency, invalid guest details.
- Fix anything red; document any residual risk in `docs/launch-readiness-report.md`.

## 2. SEO — refresh and fix what's real

- Trigger a fresh SEO scan (stale findings can't be trusted as a diagnosis).
- Then fix only the confirmed items. Expected work:
  - Sitemap coverage: reconcile the route list in `src/routes/sitemap[.]xml.ts` against `routeTree.gen.ts`, adding any genuinely indexable route that's missing and keeping redirect-only slugs excluded.
  - Alt text and icon labels: sweep `EditorialCard`, `Navbar`, `Footer` for icon-only controls without `aria-label` and images with generic alt text.
  - `/about` H1 → descriptive ("About YES Experiences Portugal — Local Travel Designers"); homepage H1 untouched.
- Re-validate with `e2e/sitemap-robots-canonical.spec.ts` and `e2e/jsonld-rendered.spec.ts`.

Make sure signature cards on signature page on mobile follow the same sequence of price showing , locations,  stars etc in the same row. Now looks not professional 

## 3. Final launch sweep

- Full local gate: `eslint`, `tsc --noEmit`, `vitest run`, `bun run prebuild`, `bun run build`.
- Playwright sweep across the three projects; refresh any visual baselines that changed as a result of the fixes above.
- Investigate the two still-flaky hero media suites (`hero-film-playback`, `hero-phrase-video-sync`) — if the dropped-frame numbers are purely sandbox decode limits, relax the thresholds to a defensible budget rather than leaving them permanently red.
- Rewrite `docs/launch-readiness-report.md` with a final **READY / NOT READY** verdict and an explicit list of anything intentionally left open (e.g. the homepage H1 SEO finding).

## Technical notes

- Playwright in this sandbox needs `PLAYWRIGHT_CHROMIUM_PATH=/opt/ms-playwright/chromium-1194/chrome-linux/chrome`.
- No brand tokens, hero copy, pricing formulas or Signature source-of-truth data will change — this pass is verification plus accessibility/SEO metadata only.