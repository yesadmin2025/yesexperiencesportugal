## Goal
Prove Studio V3 is launch-ready on mobile-first by running the full existing suite, filling the coverage gaps we know are risky (draft hydration, add-ons, pricing, CTA labels, checkout handoff, a11y), and shipping a single "Studio Launch Gate" workflow that must pass before publish.

## Phase 1 — Baseline (no code) 
Run everything already in the repo and produce a signed-off report:
- `bunx vitest run` (all unit/integration, incl. `useStudioDraft`, `studioDraftStorage`, tier pricing, i18n).
- All `e2e/studio-v3-*.spec.ts` at 393×800 mobile viewport (already default for most). Split into 4 shards to keep wall time down.
- `scripts/chrome-runtime-contrast.mjs` + `scripts/brand-audit.mjs` scoped to `/studio-v3`.
- Lighthouse mobile (`.lighthouserc.mobile.json`) on `/studio-v3` — capture LCP, CLS, TBT, a11y score.
- Output: `/mnt/documents/studio-launch-report.md` with pass/fail per spec, screenshots of any failure, and a red/amber/green verdict.

## Phase 2 — Coverage gaps (new specs)
Add the missing critical-path checks. All at 393×800 unless noted:

1. **Full happy path** (`studio-v3-full-happy-path.spec.ts`) — intro → feeling → destination → who → occasion → date → pickup → guests → interests → rhythm → considerations → language → investment → map → storyboard → confirmation → guestDetails → checkoutSummary → Stripe redirect stub. Asserts price stability at every transition and no console errors.
2. **Refresh at each phase** (`studio-v3-refresh-per-phase.spec.ts`) — for every phase, refresh and assert the same phase restores, add-ons persist, price unchanged, toast fires exactly once.
3. **Add-on tour switch** (`studio-v3-addons-tour-switch.spec.ts`) — pick add-ons on tour A, switch to tour B, assert only eligible add-ons survive and total recalculates.
4. **Price recompute matrix** — guest count changes, add-on toggles, tour reroll, edited route points; assert `€{total}` in SignaturePriceCard, CheckoutSummary, and sticky CTA are byte-identical.
5. **Saved-link precedence** — `?saved=<token>` beats local draft; invalid token shows "not found" state; failed loader shows retry.
6. **A11y sweep** — axe-core on intro/feeling/storyboard/confirmation/checkoutSummary; assert no serious/critical violations, focus never trapped, live region present.
7. **CTA copy lock** — extend `cta-vocabulary-lock` for every Studio phase's primary/secondary CTA against approved copy list.
8. **Network resilience** — kill Supabase edge calls (route intercept 500), assert Studio degrades gracefully with a visible error, never silent white screen.
9. **Cross-browser smoke** — same happy path on Chromium + WebKit (iOS Safari is the primary real device).

## Phase 3 — Manual QA script
Short human checklist (`docs/qa/studio-v3-launch.md`) for what tests can't cover: real Stripe test-card checkout, real Bokun quote round-trip on 2 signature tours, WhatsApp fallback link, PT locale copy read-through, real iPhone 12/14 Safari + Android Chrome.

## Phase 4 — CI gate
New workflow `.github/workflows/studio-v3-launch-gate.yml` that runs Phase 1 + Phase 2 sharded, uploads the report + traces, and is added to required checks. Blocks publish on any failure.

## Deliverables
- `/mnt/documents/studio-launch-report.md` (Phase 1 output)
- New specs under `e2e/` (Phase 2)
- `docs/qa/studio-v3-launch.md` (Phase 3)
- `.github/workflows/studio-v3-launch-gate.yml` (Phase 4)
- Red/amber/green verdict in chat with the top 5 blockers, if any.

## Non-goals
No product/behavior changes. If a spec finds a real bug, we stop and file it — fixes are a separate turn so tests and fixes don't get entangled.
